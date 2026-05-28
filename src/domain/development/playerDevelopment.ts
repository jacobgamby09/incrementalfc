import { roundTo } from "../../utils/math";
import type { Club } from "../types/club";
import type { GameState } from "../types/game";
import type { Match, PlayerXpReward } from "../types/match";
import {
  goalkeeperStatKeys,
  isGoalkeeperStats,
  outfieldStatKeys,
  type GoalkeeperStatKey,
  type OutfieldStatKey,
  type Player,
  type PlayerPosition,
  type PlayerStatGrowth
} from "../types/player";

export type DevelopmentSummary = {
  developmentCap: number;
  cappedByFacility: boolean;
  cappedByPotential: boolean;
  untappedPotential: boolean;
  nextProgressPercent: number;
  statRows: DevelopmentStatRow[];
  recentGrowth: PlayerStatGrowth[];
  notes: string[];
};

export type CapStatus = "Developing" | "Facility capped" | "Potential capped" | "Untapped potential";

export type DevelopmentStatRow = {
  statKey: string;
  current: number;
  potential: number;
  facilityCap: number;
  progressPercent: number;
  capStatus: CapStatus;
  recentDelta?: DevelopmentStatDelta;
};

export type DevelopmentStatDelta = {
  amount: number;
  direction: "increase" | "decline";
  label: string;
};

export type TrainingResult = {
  trainingXpByPlayerId: Record<string, number>;
  players: Record<string, Player>;
  statGrowth: PlayerStatGrowth[];
};

const ageCurveModifiers: Record<Player["development"]["ageCurveStage"], number> = {
  youth: 1.35,
  developing: 1.15,
  prime: 0.7,
  declining: 0.25
};

const statPriorityByPosition: Record<PlayerPosition, string[]> = {
  GK: ["REF", "HAN", "DIS", "MEN"],
  CB: ["TAC", "PHY", "HEA", "MEN"],
  LB: ["TAC", "ACC", "PHY", "CRO", "MEN"],
  RB: ["TAC", "ACC", "PHY", "CRO", "MEN"],
  WB: ["TAC", "ACC", "PHY", "CRO", "MEN"],
  DM: ["TAC", "PHY", "PAS", "MEN"],
  CM: ["PAS", "TEC", "MEN", "PHY"],
  AM: ["PAS", "TEC", "SHO", "MEN"],
  LW: ["ACC", "CRO", "TEC", "SHO", "MEN"],
  RW: ["ACC", "CRO", "TEC", "SHO", "MEN"],
  ST: ["SHO", "ACC", "TEC", "HEA", "MEN"]
};

export function getAgeCurveModifier(player: Player): number {
  return ageCurveModifiers[player.development.ageCurveStage];
}

export function getDevelopmentCap(club: Club): number {
  const levelCap = club.facilities.trainingGround.level >= 3 ? 20 : club.facilities.trainingGround.level === 2 ? 15 : 10;
  return club.facilities.trainingGround.effects.developmentCapBonus ?? levelCap;
}

function growthThreshold(current: number): number {
  return 55 + current * 8;
}

export function getRelevantStatKeys(player: Player): string[] {
  const priorities = statPriorityByPosition[player.primaryPosition];
  const validKeys = new Set(isGoalkeeperStats(player.currentStats) ? goalkeeperStatKeys : outfieldStatKeys);
  return priorities.filter((key) => validKeys.has(key as GoalkeeperStatKey | OutfieldStatKey));
}

export function getStatCapStatus(current: number, potential: number, facilityCap: number): CapStatus {
  if (current >= potential) return "Potential capped";
  if (current >= facilityCap && potential > facilityCap) return "Facility capped";
  if (potential > Math.max(current, facilityCap)) return "Untapped potential";
  return "Developing";
}

// Decline is not simulated yet, but future negative growth entries can use the same display path.
export function getRecentStatDelta(growth: PlayerStatGrowth[], statKey: string): DevelopmentStatDelta | undefined {
  const totalDelta = growth
    .filter((entry) => entry.statKey === statKey)
    .reduce((sum, entry) => sum + entry.to - entry.from, 0);

  if (totalDelta === 0) return undefined;

  return {
    amount: totalDelta,
    direction: totalDelta > 0 ? "increase" : "decline",
    label: totalDelta > 0 ? `↑ +${totalDelta}` : `↓ ${totalDelta}`
  };
}

export function calculateMatchXp(options: {
  player: Player;
  rating?: number;
  minutes: number;
  opponentReputation: number;
  ownReputation: number;
  isBench?: boolean;
}): number {
  if (options.minutes <= 0 && !options.isBench) return 0;
  const minutesComponent = 10 * Math.min(options.minutes, 90) / 90;
  const ratingComponent = Math.max(0, ((options.rating ?? 6) - 5.5) * 3.5);
  const opponentDifficulty = 1 + Math.max(-0.1, Math.min(0.25, (options.opponentReputation - options.ownReputation) / 100));
  const benchMultiplier = options.isBench ? 0.08 : 1;
  return Math.max(0, Math.round((minutesComponent + ratingComponent) * opponentDifficulty * getAgeCurveModifier(options.player) * options.player.development.developmentRate * benchMultiplier));
}

export function createMatchXpRewards(match: Match, gameState: GameState, club: Club, opponentClub: Club): Record<string, PlayerXpReward> {
  const lineup = match.homeClubId === club.id ? match.homeLineup : match.awayLineup;
  const rewards: Record<string, PlayerXpReward> = {};
  for (const slot of lineup.starters) {
    const player = gameState.players[slot.playerId];
    if (!player) continue;
    const rating = match.report.playerRatings[player.id]?.rating;
    rewards[player.id] = {
      matchXp: calculateMatchXp({
        player,
        rating,
        minutes: 90,
        opponentReputation: opponentClub.reputation,
        ownReputation: club.reputation
      }),
      rating,
      reason: "Played 90 minutes; XP adjusted by rating, opponent difficulty, and age curve."
    };
  }
  for (const playerId of lineup.bench) {
    const player = gameState.players[playerId];
    if (!player || rewards[playerId]) continue;
    rewards[playerId] = {
      matchXp: calculateMatchXp({
        player,
        rating: 6,
        minutes: 0,
        opponentReputation: opponentClub.reputation,
        ownReputation: club.reputation,
        isBench: true
      }),
      reason: "Unused bench development reserve credit."
    };
  }
  return rewards;
}

function statValue(player: Player, key: string): number {
  return Number(player.currentStats[key as keyof typeof player.currentStats]);
}

function potentialValue(player: Player, key: string): number {
  return Number(player.potentialStats[key as keyof typeof player.potentialStats]);
}

function setStat(player: Player, key: string, value: number): Player {
  return {
    ...player,
    currentStats: {
      ...player.currentStats,
      [key]: value
    }
  };
}

export function applyDevelopmentXp(options: {
  player: Player;
  xpGained: number;
  developmentCap: number;
  source: "match" | "training" | "combined";
  matchId?: string;
}): Player {
  const keys = getRelevantStatKeys(options.player);
  if (keys.length === 0 || options.xpGained <= 0) return options.player;
  const growth: PlayerStatGrowth[] = [];
  let player = options.player;
  const progress = { ...player.development.statProgress };
  let remainingXp = options.xpGained;
  let gains = 0;

  for (const key of keys) {
    if (remainingXp <= 0 || gains >= 1) break;
    const current = statValue(player, key);
    const cap = Math.min(potentialValue(player, key), options.developmentCap);
    if (current >= cap) continue;
    const threshold = growthThreshold(current);
    progress[key] = (progress[key] ?? 0) + remainingXp;
    remainingXp = 0;
    if (progress[key] >= threshold) {
      progress[key] -= threshold;
      player = setStat(player, key, current + 1);
      growth.push({ statKey: key, from: current, to: current + 1, source: options.source, matchId: options.matchId });
      gains += 1;
    }
  }

  const cappedStats = keys.filter((key) => statValue(player, key) >= Math.min(potentialValue(player, key), options.developmentCap));
  return {
    ...player,
    development: {
      ...player.development,
      statProgress: progress,
      cappedStats,
      recentStatGrowth: [...growth, ...player.development.recentStatGrowth].slice(0, 8),
      recentDevelopmentNotes: createDevelopmentNotes(player, options.developmentCap).slice(0, 5)
    }
  };
}

export function applyMatchXpToPlayers(gameState: GameState, club: Club, match: Match): Record<string, Player> {
  const nextPlayers = { ...gameState.players };
  const developmentCap = getDevelopmentCap(club);
  for (const [playerId, xpReward] of Object.entries(match.rewards.playerXp)) {
    const player = nextPlayers[playerId];
    if (!player || player.clubId !== club.id) continue;
    const withXp: Player = {
      ...player,
      development: {
        ...player.development,
        matchXp: player.development.matchXp + xpReward.matchXp,
        lastMatchXpGained: xpReward.matchXp
      }
    };
    nextPlayers[playerId] = applyDevelopmentXp({
      player: withXp,
      xpGained: xpReward.matchXp,
      developmentCap,
      source: "match",
      matchId: match.id
    });
  }
  return nextPlayers;
}

export function runTraining(gameState: GameState, club: Club): TrainingResult {
  const developmentCap = getDevelopmentCap(club);
  const trainingBonus = 1 + (club.facilities.trainingGround.effects.trainingXpBonus ?? 0);
  const trainingXpByPlayerId: Record<string, number> = {};
  const players = { ...gameState.players };
  const statGrowth: PlayerStatGrowth[] = [];

  for (const playerId of club.squadPlayerIds) {
    const player = players[playerId];
    if (!player) continue;
    const trainingXp = Math.round(9 * club.facilities.trainingGround.level * trainingBonus * getAgeCurveModifier(player) * player.development.developmentRate);
    const withXp: Player = {
      ...player,
      development: {
        ...player.development,
        trainingXp: player.development.trainingXp + trainingXp,
        lastTrainingXpGained: trainingXp
      }
    };
    const developed = applyDevelopmentXp({
      player: withXp,
      xpGained: trainingXp,
      developmentCap,
      source: "training"
    });
    trainingXpByPlayerId[playerId] = trainingXp;
    statGrowth.push(...developed.development.recentStatGrowth.filter((growth) => growth.source === "training" && growth.matchId === undefined));
    players[playerId] = developed;
  }

  return { trainingXpByPlayerId, players, statGrowth };
}

export function createDevelopmentNotes(player: Player, developmentCap: number): string[] {
  const keys = getRelevantStatKeys(player);
  const cappedByFacility = keys.some((key) => statValue(player, key) >= developmentCap && potentialValue(player, key) > developmentCap);
  const cappedByPotential = keys.every((key) => statValue(player, key) >= potentialValue(player, key));
  const untappedPotential = keys.some((key) => potentialValue(player, key) > Math.max(statValue(player, key), developmentCap));
  const notes: string[] = [];
  if (cappedByFacility) notes.push("Capped by current training ground.");
  if (cappedByPotential) notes.push("At personal potential for role-relevant stats.");
  if (untappedPotential) notes.push("Untapped potential remains above current club cap.");
  if (notes.length === 0) notes.push("Development progressing normally.");
  return notes;
}

export function getPlayerDevelopmentSummary(player: Player, club: Club): DevelopmentSummary {
  const developmentCap = getDevelopmentCap(club);
  const keys = getRelevantStatKeys(player);
  const cappedByFacility = keys.some((key) => statValue(player, key) >= developmentCap && potentialValue(player, key) > developmentCap);
  const cappedByPotential = keys.every((key) => statValue(player, key) >= potentialValue(player, key));
  const untappedPotential = keys.some((key) => potentialValue(player, key) > Math.max(statValue(player, key), developmentCap));
  const maxProgress = Math.max(...keys.map((key) => player.development.statProgress[key] ?? 0), 0);
  const averageCurrent = keys.length ? keys.reduce((sum, key) => sum + statValue(player, key), 0) / keys.length : 0;
  const threshold = growthThreshold(averageCurrent);
  const statRows = Object.keys(player.currentStats).map((key) => {
    const current = statValue(player, key);
    const potential = potentialValue(player, key);
    const progress = player.development.statProgress[key] ?? 0;

    return {
      statKey: key,
      current,
      potential,
      facilityCap: developmentCap,
      progressPercent: Math.min(99, Math.round((progress / growthThreshold(current)) * 100)),
      capStatus: getStatCapStatus(current, potential, developmentCap),
      recentDelta: getRecentStatDelta(player.development.recentStatGrowth, key)
    };
  });

  return {
    developmentCap,
    cappedByFacility,
    cappedByPotential,
    untappedPotential,
    nextProgressPercent: Math.min(99, Math.round((maxProgress / threshold) * 100)),
    statRows,
    recentGrowth: player.development.recentStatGrowth,
    notes: createDevelopmentNotes(player, developmentCap)
  };
}

export function getPlayerCapStatus(player: Player, club: Club): CapStatus {
  const summary = getPlayerDevelopmentSummary(player, club);
  if (summary.cappedByPotential) return "Potential capped";
  if (summary.cappedByFacility) return "Facility capped";
  if (summary.untappedPotential) return "Untapped potential";
  return "Developing";
}

export function summarizeGrowth(player: Player): string {
  const growth = player.development.recentStatGrowth[0];
  if (!growth) return "-";
  return `+${growth.to - growth.from} ${growth.statKey}`;
}

export function formatXp(player: Player): string {
  return `${roundTo(player.development.matchXp, 0)} M / ${roundTo(player.development.trainingXp, 0)} T`;
}
