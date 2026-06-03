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
import { getOutfieldStatValue } from "../player/statAccess";
import { getFacilityLevelConfig } from "../../data/constants/facilityProfiles";
import { developmentProfile } from "../../data/constants/developmentProfiles";
import { getFocusedTrainingSlotCount } from "./focusedTraining";
import { getEffectivePotentialValue } from "../player/playerPotential";

export type DevelopmentSummary = {
  developmentCap: number;
  cappedByFacility: boolean;
  cappedByPotential: boolean;
  untappedPotential: boolean;
  nextProgressPercent: number;
  unspentDevelopmentPoints: number;
  canEarnDevelopmentPoints: boolean;
  statRows: DevelopmentStatRow[];
  recentGrowth: PlayerStatGrowth[];
  notes: string[];
};

export type DevelopmentStatus = "Developing" | "Facility limited" | "Potential reached" | "Declining";
export type CapStatus = DevelopmentStatus;

export type DevelopmentStatRow = {
  statKey: string;
  current: number;
  potential: number;
  facilityCap: number;
  canAllocate: boolean;
  progressPercent: number;
  potentialPercent: number;
  facilityCapPercent: number;
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
  CB: ["TAC", "POS", "PHY", "HEA", "MEN"],
  LB: ["TAC", "POS", "ACC", "STA", "CRO", "MEN"],
  RB: ["TAC", "POS", "ACC", "STA", "CRO", "MEN"],
  WB: ["STA", "ACC", "CRO", "DRI", "TAC", "POS"],
  DM: ["TAC", "POS", "STA", "PAS", "MEN"],
  CM: ["PAS", "TEC", "POS", "MEN", "STA"],
  AM: ["PAS", "TEC", "DRI", "POS", "SHO", "MEN"],
  LW: ["DRI", "ACC", "CRO", "TEC", "POS", "SHO"],
  RW: ["DRI", "ACC", "CRO", "TEC", "POS", "SHO"],
  ST: ["SHO", "POS", "ACC", "TEC", "DRI", "MEN"]
};

export function getAgeCurveModifier(player: Player): number {
  return ageCurveModifiers[player.development.ageCurveStage];
}

export function calculateSquadTrainingXp(player: Player, club: Club): number {
  const trainingBonus = 1 + (getFacilityLevelConfig("trainingGround", club.facilities.trainingGround.level).effects.trainingXpBonus ?? 0);
  return Math.round(
    developmentProfile.baselineTrainingXpPerWeek *
      trainingBonus *
      getAgeCurveModifier(player) *
      player.development.developmentRate
  );
}

export function calculateFocusedTrainingXp(player: Player, club: Club): number {
  return Math.round(calculateSquadTrainingXp(player, club) * developmentProfile.focusedTrainingXpMultiplier);
}

export function getDevelopmentCap(club: Club): number {
  return getFacilityLevelConfig("trainingGround", club.facilities.trainingGround.level).effects.developmentCapBonus ?? 10;
}

function growthThreshold(current: number): number {
  return 55 + current * 8;
}

function developmentPointThreshold(player: Player): number {
  const keys = getRelevantStatKeys(player);
  const averageCurrent = keys.length ? keys.reduce((sum, key) => sum + statValue(player, key), 0) / keys.length : 0;
  return growthThreshold(averageCurrent);
}

function getUnspentDevelopmentPoints(player: Player): number {
  return player.development.unspentDevelopmentPoints ?? 0;
}

function getDevelopmentPointProgress(player: Player): number {
  return player.development.developmentPointProgress ?? 0;
}

function canEarnDevelopmentPoints(player: Player, developmentCap: number): boolean {
  if (player.age >= 30) return false;
  return Object.keys(player.currentStats).some((key) => statValue(player, key) < Math.min(potentialValue(player, key), developmentCap));
}

export function getRelevantStatKeys(player: Player): string[] {
  const priorities = statPriorityByPosition[player.primaryPosition];
  const validKeys = new Set(isGoalkeeperStats(player.currentStats) ? goalkeeperStatKeys : outfieldStatKeys);
  return priorities.filter((key) => validKeys.has(key as GoalkeeperStatKey | OutfieldStatKey));
}

export function getStatCapStatus(current: number, potential: number, facilityCap: number, canDevelop = true): CapStatus {
  if (!canDevelop) return "Declining";
  if (current >= potential) return "Potential reached";
  if (current >= facilityCap && potential > facilityCap) return "Facility limited";
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
  if (!isGoalkeeperStats(player.currentStats)) {
    return getOutfieldStatValue(player.currentStats, key as OutfieldStatKey);
  }
  return Number(player.currentStats[key as keyof typeof player.currentStats]);
}

function potentialValue(player: Player, key: string): number {
  return getEffectivePotentialValue(player, key);
}

function storedPotentialValue(player: Player, key: string): number {
  return Number((player.potentialStats as unknown as Record<string, number>)[key]);
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
  preferredStatKeys?: string[];
}): Player {
  if (options.xpGained <= 0) return options.player;

  let progress = getDevelopmentPointProgress(options.player);
  let unspentDevelopmentPoints = getUnspentDevelopmentPoints(options.player);
  const canEarnPoints = canEarnDevelopmentPoints(options.player, options.developmentCap);

  if (canEarnPoints) {
    progress += options.xpGained;
    let threshold = developmentPointThreshold(options.player);
    let pointsEarned = 0;
    while (threshold > 0 && progress >= threshold) {
      progress -= threshold;
      unspentDevelopmentPoints += 1;
      pointsEarned += 1;
      threshold = developmentPointThreshold(options.player);
    }
    const nextDevelopment = {
      ...options.player.development,
      unspentDevelopmentPoints,
      developmentPointProgress: progress,
      lastDevelopmentPointsGained: (options.player.development.lastDevelopmentPointsGained ?? 0) + pointsEarned
    };

    const cappedStats = Object.keys(options.player.currentStats).filter((key) => statValue(options.player, key) >= Math.min(potentialValue(options.player, key), options.developmentCap));
    return {
      ...options.player,
      development: {
        ...nextDevelopment,
        statProgress: options.player.development.statProgress ?? {},
        cappedStats,
        recentDevelopmentNotes: createDevelopmentNotes({ ...options.player, development: nextDevelopment }, options.developmentCap).slice(0, 5)
      }
    };
  }

  const cappedStats = Object.keys(options.player.currentStats).filter((key) => statValue(options.player, key) >= Math.min(potentialValue(options.player, key), options.developmentCap));
  return {
    ...options.player,
    development: {
      ...options.player.development,
      unspentDevelopmentPoints,
      developmentPointProgress: progress,
      lastDevelopmentPointsGained: options.player.development.lastDevelopmentPointsGained ?? 0,
      statProgress: options.player.development.statProgress ?? {},
      cappedStats,
      recentDevelopmentNotes: createDevelopmentNotes({ ...options.player, development: { ...options.player.development, unspentDevelopmentPoints, developmentPointProgress: progress } }, options.developmentCap).slice(0, 5)
    }
  };
}

export function canAllocateDevelopmentPoint(player: Player, statKey: string, developmentCap: number): boolean {
  if (getUnspentDevelopmentPoints(player) <= 0) return false;
  if (player.age >= 30) return false;
  if (!(statKey in player.currentStats)) return false;
  return statValue(player, statKey) < Math.min(potentialValue(player, statKey), developmentCap);
}

export function allocateDevelopmentPoint(options: {
  player: Player;
  statKey: string;
  developmentCap: number;
  source?: "match" | "training" | "combined";
  matchId?: string;
}): Player {
  if (!canAllocateDevelopmentPoint(options.player, options.statKey, options.developmentCap)) return options.player;

  const from = statValue(options.player, options.statKey);
  const nextPlayer = setStat(options.player, options.statKey, from + 1);
  const growth: PlayerStatGrowth = {
    statKey: options.statKey,
    from,
    to: from + 1,
    source: options.source ?? "combined",
    matchId: options.matchId
  };

  return {
    ...nextPlayer,
    development: {
      ...nextPlayer.development,
      unspentDevelopmentPoints: Math.max(0, getUnspentDevelopmentPoints(options.player) - 1),
      cappedStats: Object.keys(nextPlayer.currentStats).filter((key) => statValue(nextPlayer, key) >= Math.min(potentialValue(nextPlayer, key), options.developmentCap)),
      recentStatGrowth: [growth, ...options.player.development.recentStatGrowth].slice(0, 8),
      recentDevelopmentNotes: createDevelopmentNotes(nextPlayer, options.developmentCap).slice(0, 5)
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
        lastMatchXpGained: xpReward.matchXp,
        lastDevelopmentPointsGained: 0
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
  const trainingXpByPlayerId: Record<string, number> = {};
  const players = { ...gameState.players };
  const statGrowth: PlayerStatGrowth[] = [];
  const focusedAssignmentByPlayerId = new Map(
    club.training.focusedAssignments
      .filter((assignment) => assignment.slotIndex < getFocusedTrainingSlotCount(club))
      .filter((assignment) => club.squadPlayerIds.includes(assignment.playerId))
      .map((assignment) => [assignment.playerId, assignment])
  );

  for (const playerId of club.squadPlayerIds) {
    const player = players[playerId];
    if (!player) continue;
    const baselineTrainingXp = calculateSquadTrainingXp(player, club);
    const focusedAssignment = focusedAssignmentByPlayerId.get(playerId);
    const focusedTrainingXp = focusedAssignment
      ? calculateFocusedTrainingXp(player, club)
      : 0;
    const trainingXp = baselineTrainingXp + focusedTrainingXp;
    const withXp: Player = {
      ...player,
      development: {
        ...player.development,
        trainingXp: player.development.trainingXp + trainingXp,
        lastTrainingXpGained: trainingXp,
        lastDevelopmentPointsGained: player.development.lastDevelopmentPointsGained ?? 0
      }
    };
    let developed = applyDevelopmentXp({
      player: withXp,
      xpGained: baselineTrainingXp,
      developmentCap,
      source: "training"
    });
    if (focusedAssignment && focusedTrainingXp > 0) {
      developed = applyDevelopmentXp({
        player: developed,
        xpGained: focusedTrainingXp,
        developmentCap,
        source: "training"
      });
    }
    trainingXpByPlayerId[playerId] = trainingXp;
    statGrowth.push(...developed.development.recentStatGrowth.filter((growth) => growth.source === "training" && growth.matchId === undefined));
    players[playerId] = developed;
  }

  return { trainingXpByPlayerId, players, statGrowth };
}

export function createDevelopmentNotes(player: Player, developmentCap: number): string[] {
  const keys = getRelevantStatKeys(player);
  const canDevelop = player.age < 30;
  const cappedByFacility = canDevelop && keys.some((key) => statValue(player, key) >= developmentCap && potentialValue(player, key) > developmentCap);
  const cappedByPotential = canDevelop && keys.every((key) => statValue(player, key) >= potentialValue(player, key));
  const untappedPotential = canDevelop && keys.some((key) => potentialValue(player, key) > Math.max(statValue(player, key), developmentCap));
  const notes: string[] = [];
  if (getUnspentDevelopmentPoints(player) > 0) notes.push(`${getUnspentDevelopmentPoints(player)} development point${getUnspentDevelopmentPoints(player) === 1 ? "" : "s"} ready to assign.`);
  if (player.age >= 30) notes.push("No further stat growth after age 30.");
  if (cappedByFacility) notes.push("Capped by current training ground.");
  if (cappedByPotential) notes.push("At personal potential for role-relevant stats.");
  if (untappedPotential) notes.push("Untapped potential remains above current club cap.");
  if (notes.length === 0) notes.push("Development progressing normally.");
  return notes;
}

export function getPlayerDevelopmentSummary(player: Player, club: Club): DevelopmentSummary {
  const developmentCap = getDevelopmentCap(club);
  const keys = getRelevantStatKeys(player);
  const canDevelop = player.age < 30;
  const canEarnPoints = canEarnDevelopmentPoints(player, developmentCap);
  const cappedByFacility = canDevelop && keys.some((key) => statValue(player, key) >= developmentCap && potentialValue(player, key) > developmentCap);
  const cappedByPotential = canDevelop && keys.every((key) => statValue(player, key) >= potentialValue(player, key));
  const untappedPotential = canDevelop && keys.some((key) => potentialValue(player, key) > Math.max(statValue(player, key), developmentCap));
  const threshold = developmentPointThreshold(player);
  const pointProgress = getDevelopmentPointProgress(player);
  const unspentDevelopmentPoints = getUnspentDevelopmentPoints(player);
  const statRows = Object.keys(player.currentStats).map((key) => {
    const current = statValue(player, key);
    const potential = storedPotentialValue(player, key);
    const effectivePotential = potentialValue(player, key);

    return {
      statKey: key,
      current,
      potential,
      facilityCap: developmentCap,
      canAllocate: canAllocateDevelopmentPoint(player, key, developmentCap),
      progressPercent: canDevelop ? Math.min(99, Math.round((pointProgress / threshold) * 100)) : 0,
      potentialPercent: potential > 0 ? Math.min(100, Math.round((current / potential) * 100)) : 0,
      facilityCapPercent: developmentCap > 0 ? Math.min(100, Math.round((current / developmentCap) * 100)) : 0,
      capStatus: getStatCapStatus(current, effectivePotential, developmentCap, canDevelop),
      recentDelta: getRecentStatDelta(player.development.recentStatGrowth, key)
    };
  });

  return {
    developmentCap,
    cappedByFacility,
    cappedByPotential,
    untappedPotential,
    nextProgressPercent: canEarnPoints ? Math.min(99, Math.round((pointProgress / threshold) * 100)) : 0,
    unspentDevelopmentPoints,
    canEarnDevelopmentPoints: canEarnPoints,
    statRows,
    recentGrowth: player.development.recentStatGrowth,
    notes: createDevelopmentNotes(player, developmentCap)
  };
}

export function getPlayerCapStatus(player: Player, club: Club): CapStatus {
  if (player.age >= 30) return "Declining";
  const summary = getPlayerDevelopmentSummary(player, club);
  if (summary.cappedByPotential) return "Potential reached";
  if (summary.cappedByFacility) return "Facility limited";
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
