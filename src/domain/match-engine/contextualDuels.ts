import { clamp } from "../../utils/math";
import { getOutfieldStatValue } from "../player/statAccess";
import { getPlayerFitness } from "../fitness/playerFitness";
import { isGoalkeeperStats, type OutfieldStatKey, type OutfieldStats, type Player, type PlayerPosition } from "../types/player";
import type { Lineup, Tactic } from "../types/tactics";
import type { GameState } from "../types/game";
import type { ChanceType } from "../types/match";

export type DuelRecipe = Partial<Record<OutfieldStatKey, number>>;

export const duelRecipes = {
  fastBreakAttack: { ACC: 1.4, DRI: 1.2, TEC: 0.9, SHO: 0.9, POS: 0.8 },
  fastBreakDefence: { POS: 1.35, ACC: 0.9, TAC: 1.05, MEN: 0.8 },
  wideCreation: { DRI: 1.4, ACC: 1.1, CRO: 1.2, TEC: 0.9, POS: 0.6 },
  wideDefence: { POS: 1.25, ACC: 0.9, TAC: 1.1, PHY: 0.8, STA: 0.5 },
  sustainedPressureAttack: { PAS: 1.25, TEC: 1.15, POS: 1.1, MEN: 0.9, STA: 0.5 },
  sustainedPressureDefence: { TAC: 1.15, POS: 1.25, STA: 0.9, MEN: 0.9 },
  reboundAttack: { POS: 1.4, SHO: 1.15, ACC: 0.75, MEN: 0.8 },
  reboundDefence: { POS: 1.25, TAC: 1.1, PHY: 0.95, HEA: 0.9 },
  cornerAttack: { HEA: 1.45, PHY: 1.05, POS: 1.1, MEN: 0.7 },
  cornerDefence: { HEA: 1.4, PHY: 1.05, POS: 1.05, MEN: 0.7 },
  indirectFreeKickAttack: { HEA: 1.25, POS: 1.2, PHY: 0.95, MEN: 0.75 },
  indirectFreeKickDefence: { HEA: 1.25, POS: 1.2, PHY: 0.95, MEN: 0.75 },
  directFreeKickAttack: { SHO: 1.45, TEC: 1.2, MEN: 0.85 },
  directFreeKickDefence: { POS: 1.1, MEN: 1, PHY: 0.6 },
  penaltyAttack: { SHO: 1.45, MEN: 1.25, TEC: 0.65 },
  penaltyDefence: { MEN: 1.2, POS: 0.5 },
  pressResistance: { PAS: 1.2, TEC: 1.1, POS: 1, MEN: 0.9 },
  pressing: { STA: 1.25, ACC: 1, TAC: 1, MEN: 0.8 }
} satisfies Record<string, DuelRecipe>;

export function effectiveStat(raw: number): number {
  if (raw <= 80) return raw;
  return 80 + (raw - 80) * 0.5;
}

export function getFatigueModifier(options: {
  player: Player;
  slotPosition?: PlayerPosition;
  tactic: Tactic;
  minute: number;
  repeatedActions?: number;
}): number {
  if (isGoalkeeperStats(options.player.currentStats)) return 1;
  const stats = options.player.currentStats;
  const stamina = getOutfieldStatValue(stats, "STA");
  const lateFactor = clamp((options.minute - 55) / 35, 0, 1);
  const highTempoFocus = ["wide_play", "fast_breaks", "sustained_pressure", "tiki_taka"].includes(options.tactic.focus);
  const tacticalCost =
    (options.tactic.riskLevel === "aggressive" ? 0.22 : options.tactic.riskLevel === "conservative" ? -0.04 : 0) +
    (highTempoFocus ? 0.14 : 0) +
    (options.tactic.focus === "defensive_shape" ? 0.04 : 0) +
    (options.slotPosition === "WB" ? 0.14 : 0) +
    (["LW", "RW", "ST", "AM"].includes(options.slotPosition ?? "GK") ? 0.05 : 0) +
    (options.repeatedActions ?? 0) * 0.015;
  const staminaShortfall = clamp((10 - stamina) / 10, 0, 1);
  const staminaShield = clamp((stamina - 7) / 12, 0, 0.08);
  const fitness = getPlayerFitness(options.player);
  const startingFitnessPenalty = clamp((100 - fitness) / 100 * 0.10, 0, 0.10);
  const fatigueLoss = lateFactor * clamp(0.025 + staminaShortfall * 0.12 + tacticalCost * 0.12 - staminaShield + startingFitnessPenalty, 0, 0.22);

  return clamp(1 - fatigueLoss, 0.78, 1);
}

export function scoreDuelRecipe(options: {
  stats: OutfieldStats;
  recipe: DuelRecipe;
  fatigueModifier?: number;
}): number {
  const totalWeight = Object.values(options.recipe).reduce((sum, weight) => sum + (weight ?? 0), 0);
  if (totalWeight <= 0) return 1;

  return Object.entries(options.recipe).reduce((sum, [statKey, weight]) => {
    const rawValue = getOutfieldStatValue(options.stats, statKey as OutfieldStatKey);
    const fatigueSensitive = ["ACC", "TAC", "DRI", "POS", "TEC"].includes(statKey);
    const adjustedValue = rawValue * (fatigueSensitive ? options.fatigueModifier ?? 1 : 1);
    return sum + effectiveStat(adjustedValue) * (weight ?? 0);
  }, 0) / totalWeight;
}

export function scorePlayerDuel(options: {
  player: Player;
  recipe: DuelRecipe;
  tactic: Tactic;
  minute: number;
  slotPosition?: PlayerPosition;
  repeatedActions?: number;
}): number {
  if (isGoalkeeperStats(options.player.currentStats)) return 1;
  const fatigueModifier = getFatigueModifier({
    player: options.player,
    slotPosition: options.slotPosition,
    tactic: options.tactic,
    minute: options.minute,
    repeatedActions: options.repeatedActions
  });

  return scoreDuelRecipe({
    stats: options.player.currentStats,
    recipe: options.recipe,
    fatigueModifier
  });
}

export function recipesForChanceType(chanceType: ChanceType): { attack: DuelRecipe; defence: DuelRecipe } {
  if (chanceType === "fast_breakaway") {
    return { attack: duelRecipes.fastBreakAttack, defence: duelRecipes.fastBreakDefence };
  }
  if (chanceType === "wide_cross") {
    return { attack: duelRecipes.wideCreation, defence: duelRecipes.wideDefence };
  }
  if (chanceType === "rebound_big_chance") {
    return { attack: duelRecipes.reboundAttack, defence: duelRecipes.reboundDefence };
  }
  if (chanceType === "corner") {
    return { attack: duelRecipes.cornerAttack, defence: duelRecipes.cornerDefence };
  }
  if (chanceType === "indirect_free_kick") {
    return { attack: duelRecipes.indirectFreeKickAttack, defence: duelRecipes.indirectFreeKickDefence };
  }
  if (chanceType === "direct_free_kick") {
    return { attack: duelRecipes.directFreeKickAttack, defence: duelRecipes.directFreeKickDefence };
  }
  if (chanceType === "penalty") {
    return { attack: duelRecipes.penaltyAttack, defence: duelRecipes.penaltyDefence };
  }
  return { attack: duelRecipes.sustainedPressureAttack, defence: duelRecipes.sustainedPressureDefence };
}

export function duelModifier(attackScore: number, defenceScore: number): number {
  return clamp((attackScore - defenceScore) * 0.018, -0.1, 0.1);
}

export function scoreTeamDuel(options: {
  lineup: Lineup;
  gameState: GameState;
  recipe: DuelRecipe;
  tactic: Tactic;
  minute: number;
  preferredSlots?: PlayerPosition[];
}): number {
  const scoredPlayers = options.lineup.starters
    .map((slot) => ({ slot, player: options.gameState.players[slot.playerId] }))
    .filter(({ player }) => player && !isGoalkeeperStats(player.currentStats))
    .map(({ slot, player }) => {
      const slotBonus = options.preferredSlots?.includes(slot.position) ? 0.5 : 0;
      return scorePlayerDuel({
        player,
        recipe: options.recipe,
        tactic: options.tactic,
        minute: options.minute,
        slotPosition: slot.position
      }) + slotBonus;
    })
    .sort((left, right) => right - left);

  const topScores = scoredPlayers.slice(0, Math.min(6, scoredPlayers.length));
  if (topScores.length === 0) return 1;
  return topScores.reduce((sum, score) => sum + score, 0) / topScores.length;
}
