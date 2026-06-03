import { clamp } from "../../utils/math";
import type { GameState } from "../types/game";
import type { Match } from "../types/match";
import type { Player } from "../types/player";
import { isGoalkeeperStats } from "../types/player";
import type { RiskLevel, TacticalFocus, Tactic } from "../types/tactics";
import { getPlayerOutfieldStatValue } from "../player/statAccess";

/**
 * Stamina scaling helper.
 * Diminishing returns using Math.sqrt to separate early/low stats meaningfully.
 */
export function staminaEffect(stamina: number): number {
  const clamped = clamp(stamina, 1, 99);
  return Math.sqrt(clamped / 99);
}

/**
 * Safely retrieves player fitness status, defaulting to 100 if undefined or invalid.
 */
export function getPlayerFitness(player: Player): number {
  if (!player.status || typeof player.status.fitness !== "number") {
    return 100;
  }
  return clamp(player.status.fitness, 0, 100);
}

/**
 * Returns player-facing readiness label.
 */
export function getReadinessLabel(fitness: number): "Fresh" | "Ready" | "Tired" | "Fatigued" {
  const value = clamp(fitness, 0, 100);
  if (value >= 90) return "Fresh";
  if (value >= 75) return "Ready";
  if (value >= 60) return "Tired";
  return "Fatigued";
}

/**
 * Returns styling metrics for the UI based on readiness band.
 */
export function getReadinessColor(fitness: number): {
  text: string;
  bg: string;
  border: string;
  hex: string;
} {
  const label = getReadinessLabel(fitness);
  switch (label) {
    case "Fresh":
      return {
        text: "text-emerald-700",
        bg: "bg-emerald-100/70",
        border: "border-emerald-300",
        hex: "#10b981", // emerald-500
      };
    case "Ready":
      return {
        text: "text-blue-700",
        bg: "bg-blue-100/70",
        border: "border-blue-300",
        hex: "#3b82f6", // blue-500
      };
    case "Tired":
      return {
        text: "text-amber-700",
        bg: "bg-amber-100/70",
        border: "border-amber-300",
        hex: "#f59e0b", // amber-500
      };
    case "Fatigued":
      return {
        text: "text-rose-700",
        bg: "bg-rose-100/70",
        border: "border-rose-300",
        hex: "#f43f5e", // rose-500
      };
  }
}

export type FitnessLossOptions = {
  player: Player;
  tacticRisk?: RiskLevel;
  tacticFocus?: TacticalFocus;
};

/**
 * Calculates pre-matchday post-match fitness loss for a player.
 */
export function calculatePostMatchFitnessLoss({
  player,
  tacticRisk = "balanced",
  tacticFocus = "balanced",
}: FitnessLossOptions): number {
  if (isGoalkeeperStats(player.currentStats)) {
    return 4;
  }

  const stamina = getPlayerOutfieldStatValue(player, "STA");
  const staminaRelief = staminaEffect(stamina);

  const baseLoss = 18;
  const staminaReduction = staminaRelief * 7;

  const riskExtra =
    tacticRisk === "aggressive" ? 3 :
    tacticRisk === "conservative" ? -2 :
    0;

  const focusExtra =
    ["wide_play", "fast_breaks", "sustained_pressure", "tiki_taka"].includes(tacticFocus) ? 2 :
    tacticFocus === "defensive_shape" ? -1 :
    0;

  return clamp(Math.round(baseLoss - staminaReduction + riskExtra + focusExtra), 8, 24);
}

export type RecoveryGainOptions = {
  player: Player;
  isStarter: boolean;
  medicalRecoveryBonus?: number;
  medicalCenterLevel?: number;
};

/**
 * Calculates recovery gain for a player at the end of a matchday.
 */
export function calculateRecoveryGain({
  player,
  isStarter,
  medicalRecoveryBonus,
  medicalCenterLevel = 1,
}: RecoveryGainOptions): number {
  const isGk = isGoalkeeperStats(player.currentStats);
  const stamina = isGk ? 50 : getPlayerOutfieldStatValue(player, "STA");
  const staminaBonus = staminaEffect(stamina) * 4;

  const baseRecovery = isStarter ? 11 : 24;

  const agePenalty = player.age >= 30 ? (player.age - 29) * 0.5 : 0;

  const medicalBonus = medicalRecoveryBonus ?? medicalCenterLevel * 0.75;

  return clamp(Math.round(baseRecovery + staminaBonus + medicalBonus - agePenalty), 5, 32);
}

/**
 * Lineup selection penalty helper.
 */
export function getLineupSelectionPenalty(fitness: number): number {
  const val = clamp(fitness, 0, 100);
  if (val >= 85) return 0;
  if (val >= 75) return -2;
  if (val >= 60) return -15;
  return -40;
}

/**
 * Match engine phase strength modifier based on pre-match fitness.
 */
export function effectiveFitnessModifier(fitness: number): number {
  const value = clamp(fitness, 0, 100);
  if (value >= 85) return 1.0;
  if (value >= 70) return 0.98;
  if (value >= 55) return 0.94;
  return 0.88;
}

/**
 * Pure function that calculates post-match fitness updates (loss + recovery together)
 * for all players across both player and AI clubs.
 */
export function applyMatchdayFitnessUpdates(
  gameState: GameState,
  matchesPlayed: Match[],
  playerTactic: Tactic
): GameState {
  const startersInfo = new Map<string, { tacticRisk: RiskLevel; tacticFocus: TacticalFocus }>();
  const playerClubId = gameState.playerClubId;

  for (const m of matchesPlayed) {
    const homeClub = gameState.clubs[m.homeClubId];
    const awayClub = gameState.clubs[m.awayClubId];

    const homeTactic = m.homeClubId === playerClubId ? playerTactic : homeClub.tactics.activeTactic;
    const awayTactic = m.awayClubId === playerClubId ? playerTactic : awayClub.tactics.activeTactic;

    for (const slot of m.homeLineup.starters) {
      if (slot.playerId) {
        startersInfo.set(slot.playerId, {
          tacticRisk: homeTactic.riskLevel,
          tacticFocus: homeTactic.focus,
        });
      }
    }
    for (const slot of m.awayLineup.starters) {
      if (slot.playerId) {
        startersInfo.set(slot.playerId, {
          tacticRisk: awayTactic.riskLevel,
          tacticFocus: awayTactic.focus,
        });
      }
    }
  }

  const nextPlayers = { ...gameState.players };

  for (const playerId of Object.keys(nextPlayers)) {
    const player = nextPlayers[playerId];
    const starterDetail = startersInfo.get(playerId);
    const currentFitness = getPlayerFitness(player);

    let matchLoss = 0;
    if (starterDetail) {
      matchLoss = calculatePostMatchFitnessLoss({
        player,
        tacticRisk: starterDetail.tacticRisk,
        tacticFocus: starterDetail.tacticFocus,
      });
    }

    let medicalCenterLevel = 1;
    let medicalRecoveryBonus: number | undefined;
    if (player.clubId && gameState.clubs[player.clubId]) {
      const club = gameState.clubs[player.clubId];
      medicalCenterLevel = club.facilities?.medicalCenter?.level ?? 1;
      medicalRecoveryBonus = club.facilities?.medicalCenter?.effects.readinessRecoveryBonus;
    }

    const recovery = calculateRecoveryGain({
      player,
      isStarter: !!starterDetail,
      medicalCenterLevel,
      medicalRecoveryBonus,
    });

    const nextFitness = clamp(currentFitness - matchLoss + recovery, 0, 100);

    nextPlayers[playerId] = {
      ...player,
      status: {
        ...player.status,
        fitness: nextFitness,
      },
    };
  }

  return {
    ...gameState,
    players: nextPlayers,
  };
}
