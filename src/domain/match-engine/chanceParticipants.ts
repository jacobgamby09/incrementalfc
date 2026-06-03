import type { RandomSource } from "../../utils/random";
import { isGoalkeeperStats, type Player, type PlayerPosition } from "../types/player";
import type { ChanceType } from "../types/match";
import type { GameState } from "../types/game";
import type { Lineup, Tactic } from "../types/tactics";
import { duelRecipes, scorePlayerDuel, type DuelRecipe } from "./contextualDuels";

type StarterCandidate = {
  player: Player;
  slotPosition: PlayerPosition;
};

const creatorRecipes: Record<ChanceType, DuelRecipe> = {
  fast_breakaway: { ACC: 1.3, DRI: 1.2, PAS: 0.85, TEC: 0.9, POS: 0.65 },
  wide_cross: duelRecipes.wideCreation,
  sustained_pressure: { PAS: 1.35, TEC: 1.15, POS: 1, DRI: 0.7, MEN: 0.75 },
  rebound_big_chance: { POS: 1.2, SHO: 0.9, ACC: 0.65, MEN: 0.65 },
  corner: { CRO: 1.5, TEC: 1.1, MEN: 0.8 },
  indirect_free_kick: { CRO: 1.25, PAS: 1.05, TEC: 1.1, MEN: 0.7 },
  direct_free_kick: duelRecipes.directFreeKickAttack,
  penalty: duelRecipes.penaltyAttack
};

const finisherRecipes: Record<ChanceType, DuelRecipe> = {
  fast_breakaway: { SHO: 1.35, POS: 1.1, ACC: 0.9, DRI: 0.65, MEN: 0.85 },
  wide_cross: { HEA: 1.35, POS: 1.05, PHY: 0.9, SHO: 0.7, MEN: 0.65 },
  sustained_pressure: { SHO: 1.35, POS: 1.1, TEC: 0.85, DRI: 0.65, MEN: 0.75 },
  rebound_big_chance: duelRecipes.reboundAttack,
  corner: duelRecipes.cornerAttack,
  indirect_free_kick: duelRecipes.indirectFreeKickAttack,
  direct_free_kick: duelRecipes.directFreeKickAttack,
  penalty: duelRecipes.penaltyAttack
};

const openPlayFinisherWeights: Record<PlayerPosition, number> = {
  GK: 0,
  CB: 0.04,
  LB: 0.1,
  RB: 0.1,
  WB: 0.24,
  DM: 0.18,
  CM: 0.42,
  AM: 0.95,
  LW: 0.9,
  RW: 0.9,
  ST: 1.35
};

const creatorWeights: Record<PlayerPosition, number> = {
  GK: 0,
  CB: 0.08,
  LB: 0.48,
  RB: 0.48,
  WB: 0.95,
  DM: 0.55,
  CM: 0.85,
  AM: 1.15,
  LW: 1.15,
  RW: 1.15,
  ST: 0.65
};

export function finisherPositionWeight(chanceType: ChanceType, position: PlayerPosition): number {
  if (chanceType === "corner") {
    return { ...openPlayFinisherWeights, CB: 1.35, ST: 1.2, DM: 0.7, CM: 0.45 }[position];
  }
  if (chanceType === "indirect_free_kick") {
    return { ...openPlayFinisherWeights, CB: 1.15, ST: 1.15, DM: 0.65, CM: 0.5 }[position];
  }
  if (chanceType === "direct_free_kick") {
    return { ...openPlayFinisherWeights, CB: 0.25, LB: 0.45, RB: 0.45, WB: 0.65, CM: 0.9, AM: 1.15, LW: 1, RW: 1, ST: 1.1 }[position];
  }
  if (chanceType === "penalty") {
    return { ...openPlayFinisherWeights, CB: 0.18, LB: 0.25, RB: 0.25, WB: 0.4, CM: 0.75, AM: 1, LW: 0.9, RW: 0.9, ST: 1.35 }[position];
  }
  if (chanceType === "wide_cross") {
    return { ...openPlayFinisherWeights, CB: 0.08, ST: 1.45, AM: 0.65, LW: 0.55, RW: 0.55 }[position];
  }
  if (chanceType === "rebound_big_chance") {
    return { ...openPlayFinisherWeights, CB: 0.06, ST: 1.55, AM: 0.95, LW: 0.8, RW: 0.8 }[position];
  }
  return openPlayFinisherWeights[position];
}

export function creatorPositionWeight(chanceType: ChanceType, position: PlayerPosition): number {
  if (chanceType === "corner" || chanceType === "indirect_free_kick") {
    return { ...creatorWeights, CB: 0.03, LB: 0.8, RB: 0.8, WB: 1.1, CM: 0.9, AM: 1.1, LW: 1.25, RW: 1.25, ST: 0.25 }[position];
  }
  if (chanceType === "wide_cross") {
    return { ...creatorWeights, CB: 0.03, LB: 0.9, RB: 0.9, WB: 1.3, CM: 0.55, AM: 0.65, LW: 1.4, RW: 1.4, ST: 0.2 }[position];
  }
  if (chanceType === "fast_breakaway") {
    return { ...creatorWeights, CB: 0.03, LB: 0.2, RB: 0.2, WB: 0.65, DM: 0.3, CM: 0.65, AM: 1.1, LW: 1.2, RW: 1.2, ST: 0.85 }[position];
  }
  return creatorWeights[position];
}

function starterCandidates(lineup: Lineup, gameState: GameState): StarterCandidate[] {
  return lineup.starters
    .map((slot) => ({ player: gameState.players[slot.playerId], slotPosition: slot.position }))
    .filter(({ player }) => player && !isGoalkeeperStats(player.currentStats));
}

function weightedPick(
  candidates: StarterCandidate[],
  score: (candidate: StarterCandidate) => number,
  rng: RandomSource
): StarterCandidate {
  const weighted = candidates.map((candidate) => ({ candidate, weight: Math.max(score(candidate), 0.01) }));
  let roll = rng() * weighted.reduce((sum, entry) => sum + entry.weight, 0);
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.candidate;
  }
  return weighted[weighted.length - 1].candidate;
}

function participantSkill(
  candidate: StarterCandidate,
  recipe: DuelRecipe,
  tactic: Tactic,
  minute: number
): number {
  return scorePlayerDuel({
    player: candidate.player,
    recipe,
    tactic,
    minute,
    slotPosition: candidate.slotPosition
  });
}

export function finisherSkill(player: Player, slotPosition: PlayerPosition, chanceType: ChanceType, tactic: Tactic, minute: number): number {
  return participantSkill({ player, slotPosition }, finisherRecipes[chanceType], tactic, minute);
}

export function creatorSkill(player: Player, slotPosition: PlayerPosition, chanceType: ChanceType, tactic: Tactic, minute: number): number {
  return participantSkill({ player, slotPosition }, creatorRecipes[chanceType], tactic, minute);
}

export function pickFinisher(lineup: Lineup, gameState: GameState, chanceType: ChanceType, tactic: Tactic, minute: number, rng: RandomSource): Player {
  const candidates = starterCandidates(lineup, gameState);
  return weightedPick(
    candidates,
    (candidate) => participantSkill(candidate, finisherRecipes[chanceType], tactic, minute) * finisherPositionWeight(chanceType, candidate.slotPosition),
    rng
  ).player;
}

export function pickCreator(
  lineup: Lineup,
  finisher: Player | undefined,
  gameState: GameState,
  chanceType: ChanceType,
  tactic: Tactic,
  minute: number,
  rng: RandomSource
): Player | undefined {
  if (chanceType === "direct_free_kick" || chanceType === "penalty") return finisher;
  const candidates = starterCandidates(lineup, gameState).filter(({ player }) => player.id !== finisher?.id);
  if (candidates.length === 0) return finisher;
  return weightedPick(
    candidates,
    (candidate) => participantSkill(candidate, creatorRecipes[chanceType], tactic, minute) * creatorPositionWeight(chanceType, candidate.slotPosition),
    rng
  ).player;
}

