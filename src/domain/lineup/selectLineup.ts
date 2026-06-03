import { formationSlots } from "../../data/constants/formations";
import type { Club } from "../types/club";
import type { GameState } from "../types/game";
import { isGoalkeeperStats, type OutfieldStats, type Player, type PlayerPosition } from "../types/player";
import type { Lineup, LineupSlot, Tactic } from "../types/tactics";
import { calculatePositionFit, getPositionFitModifier, type PositionFitLevel } from "./positionFit";
import { getOutfieldStatValue } from "../player/statAccess";
import { getPlayerFitness, getLineupSelectionPenalty } from "../fitness/playerFitness";

export type LineupValidationResult = {
  valid: boolean;
  errors: string[];
};

export const fitSortOrder: Record<PositionFitLevel, number> = {
  natural: 0,
  secondary: 1,
  related: 2,
  poor: 3,
  invalid: 4
};

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function outfieldScore(stats: OutfieldStats, slotPosition: PlayerPosition): number {
  const value = (key: keyof OutfieldStats) => getOutfieldStatValue(stats, key);
  if (["CB", "LB", "RB", "WB"].includes(slotPosition)) {
    return average([value("TAC"), value("POS"), value("PHY"), value("HEA"), value("STA")]);
  }
  if (["DM", "CM", "AM"].includes(slotPosition)) {
    return average([value("PAS"), value("TEC"), value("POS"), value("MEN"), value("STA")]);
  }
  return average([value("SHO"), value("ACC"), value("DRI"), value("POS"), value("TEC"), value("CRO")]);
}

export function scorePlayerForPosition(player: Player, slotPosition: PlayerPosition): number {
  const stats = player.currentStats;
  const fit = calculatePositionFit(player, slotPosition);
  const fitness = getPlayerFitness(player);
  const penalty = getLineupSelectionPenalty(fitness);

  if (isGoalkeeperStats(stats)) {
    return slotPosition === "GK" ? average([stats.REF, stats.HAN, stats.MEN]) + penalty : -100;
  }

  if (slotPosition === "GK") {
    return -100;
  }

  return outfieldScore(stats, slotPosition) * getPositionFitModifier(player, slotPosition) + (fit.level === "natural" ? 2 : 0) + penalty;
}

export function autoSelectLineup(club: Club, gameState: GameState, tactic: Tactic): Lineup {
  const squad = club.squadPlayerIds.map((playerId) => gameState.players[playerId]);
  const usedPlayerIds = new Set<string>();
  const starters: LineupSlot[] = formationSlots[tactic.formation].map((position) => {
    const player = squad
      .filter((candidate) => !usedPlayerIds.has(candidate.id))
      .sort((a, b) => scorePlayerForPosition(b, position) - scorePlayerForPosition(a, position))[0];

    usedPlayerIds.add(player.id);
    return {
      position,
      playerId: player.id,
      role: player.preferredRole
    };
  });

  return {
    tacticId: tactic.id,
    starters,
    bench: squad
      .filter((player) => !usedPlayerIds.has(player.id))
      .sort((a, b) => b.contract.marketValue - a.contract.marketValue)
      .slice(0, 7)
      .map((player) => player.id),
    captainPlayerId: starters[0]?.playerId
  };
}

export function createEmptyLineup(tactic: Tactic): Lineup {
  return {
    tacticId: tactic.id,
    starters: formationSlots[tactic.formation].map((position) => ({
      position,
      playerId: ""
    })),
    bench: []
  };
}

export function syncLineupToFormation(lineup: Lineup, tactic: Tactic): Lineup {
  const nextSlots = formationSlots[tactic.formation].map((position, index) => {
    const existingSlot = lineup.starters[index];
    return {
      position,
      playerId: existingSlot?.playerId ?? "",
      role: existingSlot?.role
    };
  });

  return {
    ...lineup,
    tacticId: tactic.id,
    starters: nextSlots
  };
}

export function validateLineup(lineup: Lineup, gameState: GameState, clubId: string): LineupValidationResult {
  const errors: string[] = [];
  const club = gameState.clubs[clubId];
  const squadIds = new Set(club.squadPlayerIds);
  const starterIds = lineup.starters.map((slot) => slot.playerId).filter(Boolean);
  const uniqueStarterIds = new Set(starterIds);

  if (lineup.starters.length !== 11) {
    errors.push("Lineup must contain 11 starters.");
  }
  if (starterIds.length !== 11) {
    errors.push("Every starter slot must contain a player.");
  }
  if (uniqueStarterIds.size !== starterIds.length) {
    errors.push("A player can only start once.");
  }
  if (starterIds.some((playerId) => !squadIds.has(playerId))) {
    errors.push("Every starter must belong to this club.");
  }

  const goalkeeperCount = starterIds.filter(
    (playerId) => gameState.players[playerId]?.primaryPosition === "GK"
  ).length;
  if (goalkeeperCount !== 1) {
    errors.push("Lineup must include exactly one goalkeeper.");
  }
  if (
    lineup.starters.some((slot) => {
      const player = gameState.players[slot.playerId];
      return player && calculatePositionFit(player, slot.position).level === "invalid";
    })
  ) {
    errors.push("Lineup contains a player in an invalid position.");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function getAvailablePlayersForSlot(
  gameState: GameState,
  clubId: string,
  lineup: Lineup,
  slotIndex: number
): Player[] {
  const club = gameState.clubs[clubId];
  const currentPlayerId = lineup.starters[slotIndex]?.playerId;
  const selectedIds = new Set(
    lineup.starters
      .map((slot, index) => (index === slotIndex ? "" : slot.playerId))
      .filter(Boolean)
  );

  return club.squadPlayerIds
    .filter((playerId) => !selectedIds.has(playerId) || playerId === currentPlayerId)
    .map((playerId) => gameState.players[playerId])
    .sort((a, b) => a.primaryPosition.localeCompare(b.primaryPosition) || a.lastName.localeCompare(b.lastName));
}

export function getSortedPlayersForSlot(
  gameState: GameState,
  clubId: string,
  lineup: Lineup,
  slotIndex: number
): Player[] {
  const slot = lineup.starters[slotIndex];
  const currentPlayerId = slot?.playerId;
  const slotPosition = slot?.position;

  if (!slotPosition) {
    return [];
  }

  return getAvailablePlayersForSlot(gameState, clubId, lineup, slotIndex)
    .filter((player) => slotPosition !== "GK" || player.primaryPosition === "GK" || player.id === currentPlayerId)
    .sort((a, b) => {
      const fitA = calculatePositionFit(a, slotPosition);
      const fitB = calculatePositionFit(b, slotPosition);
      const fitComparison = fitSortOrder[fitA.level] - fitSortOrder[fitB.level];

      if (fitComparison !== 0) return fitComparison;

      const scoreComparison = scorePlayerForPosition(b, slotPosition) - scorePlayerForPosition(a, slotPosition);
      if (scoreComparison !== 0) return scoreComparison;

      return b.contract.marketValue - a.contract.marketValue || a.lastName.localeCompare(b.lastName);
    });
}
