import type {
  GoalkeeperStats,
  OutfieldStats,
  Player,
  PlayerAppearanceProfile,
  PlayerPosition,
  PlayerRole
} from "../types/player";
import { isGoalkeeperStats, goalkeeperStatKeys, outfieldStatKeys } from "../types/player";
import type { StatRangeProfile } from "../types/league";
import { createId, pickOne, randomInt, type RandomSource } from "../../utils/random";
import { getAgeCurveStageForAge } from "../player/playerPotential";
import { contractProfile } from "../../data/constants/contractProfiles";
import { playerContextProfile } from "../../data/constants/playerContextProfiles";
import { calculateInitialMarketReputation } from "../player/playerContext";
import { getNationalityProfile, pickNationalityForLeague } from "../../data/constants/worldProfiles";

const roleByPosition: Record<PlayerPosition, PlayerRole> = {
  GK: "goalkeeper",
  CB: "defensive_defender",
  LB: "fullback",
  RB: "fullback",
  WB: "fullback",
  DM: "holding_midfielder",
  CM: "box_to_box_midfielder",
  AM: "playmaker",
  LW: "winger",
  RW: "winger",
  ST: "pressing_forward"
};

export type GeneratePlayerOptions = {
  clubId: string;
  position: PlayerPosition;
  statRange: StatRangeProfile;
  kitNumber?: number;
  age?: number;
  leagueLevel?: number;
  nationality?: string;
  rng?: RandomSource;
};

function clampStat(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function statWithProfile(
  key: keyof OutfieldStats,
  position: PlayerPosition,
  statRange: StatRangeProfile,
  rng: RandomSource
): number {
  const base = randomInt(statRange.typicalCurrentMin, statRange.typicalCurrentMax, rng);
  const boosts: Partial<Record<PlayerPosition, Partial<Record<keyof OutfieldStats, number>>>> = {
    CB: { TAC: 2, HEA: 2, PHY: 1 },
    LB: { TAC: 1, ACC: 1, CRO: 1, POS: 1 },
    RB: { TAC: 1, ACC: 1, CRO: 1, POS: 1 },
    WB: { ACC: 2, CRO: 2, STA: 2, DRI: 1 },
    DM: { TAC: 2, PAS: 1, MEN: 1, POS: 2, STA: 1 },
    CM: { PAS: 2, TEC: 1, MEN: 1, POS: 1, STA: 1 },
    AM: { PAS: 2, TEC: 2, SHO: 1, DRI: 1, POS: 1 },
    LW: { ACC: 2, CRO: 1, TEC: 1, DRI: 2 },
    RW: { ACC: 2, CRO: 1, TEC: 1, DRI: 2 },
    ST: { SHO: 2, ACC: 1, HEA: 1, POS: 2, DRI: 1 }
  };

  return clampStat(
    base + (boosts[position]?.[key] ?? 0),
    statRange.typicalCurrentMin,
    statRange.typicalCurrentMax
  );
}

function potentialFor(current: number, statRange: StatRangeProfile, rng: RandomSource): number {
  const isRareOutlier = rng() < 0.08;
  const rolledPotential = isRareOutlier
    ? randomInt(statRange.typicalPotentialMax + 1, statRange.rarePotentialMax, rng)
    : randomInt(statRange.typicalPotentialMin, statRange.typicalPotentialMax, rng);

  return Math.max(current, rolledPotential);
}

function averageStats(stats: OutfieldStats | GoalkeeperStats): number {
  if (isGoalkeeperStats(stats)) {
    const total = goalkeeperStatKeys.reduce((sum, key) => sum + stats[key], 0);
    return total / goalkeeperStatKeys.length;
  }

  const total = outfieldStatKeys.reduce((sum, key) => sum + stats[key], 0);
  return total / outfieldStatKeys.length;
}

function createOutfieldStats(
  position: PlayerPosition,
  statRange: StatRangeProfile,
  rng: RandomSource
): OutfieldStats {
  return outfieldStatKeys.reduce((stats, key) => {
    stats[key] = statWithProfile(key, position, statRange, rng);
    return stats;
  }, {} as OutfieldStats);
}

function createGoalkeeperStats(statRange: StatRangeProfile, rng: RandomSource): GoalkeeperStats {
  return {
    REF: randomInt(statRange.typicalCurrentMin, statRange.typicalCurrentMax, rng),
    HAN: randomInt(statRange.typicalCurrentMin, statRange.typicalCurrentMax, rng),
    DIS: randomInt(statRange.typicalCurrentMin, statRange.typicalCurrentMax, rng),
    TEC: randomInt(statRange.typicalCurrentMin, statRange.typicalCurrentMax, rng),
    PHY: randomInt(statRange.typicalCurrentMin, statRange.typicalCurrentMax, rng),
    MEN: randomInt(statRange.typicalCurrentMin, statRange.typicalCurrentMax, rng)
  };
}

function createPotentialStats<T extends OutfieldStats | GoalkeeperStats>(
  currentStats: T,
  statRange: StatRangeProfile,
  rng: RandomSource
): T {
  const potential = {} as T;
  for (const key of Object.keys(currentStats) as Array<keyof T>) {
    potential[key] = potentialFor(Number(currentStats[key]), statRange, rng) as T[keyof T];
  }
  return potential;
}

function getAppearanceProfile(age: number, position: PlayerPosition): PlayerAppearanceProfile {
  if (age <= 20) return "youthful";
  if (age >= 31) return "veteran";
  if (position === "GK" || position === "CB") return "commanding";
  if (position === "ST" || position === "DM") return "stocky";
  if (position === "LW" || position === "RW" || position === "WB") return "lean";
  return "athletic";
}

export function generatePlayer({
  clubId,
  position,
  statRange,
  kitNumber,
  age: requestedAge,
  leagueLevel = 1,
  nationality: requestedNationality,
  rng = Math.random
}: GeneratePlayerOptions): Player {
  const age = requestedAge ?? randomInt(17, 34, rng);
  const currentStats =
    position === "GK" ? createGoalkeeperStats(statRange, rng) : createOutfieldStats(position, statRange, rng);
  const potentialStats = createPotentialStats(currentStats, statRange, rng);
  const currentAverage = averageStats(currentStats);
  const potentialAverage = averageStats(potentialStats);
  const id = createId("player", rng);
  const nationality = requestedNationality ?? pickNationalityForLeague(leagueLevel, rng);
  const nationalityProfile = getNationalityProfile(nationality);
  const firstName = pickOne(nationalityProfile.firstNames, rng);
  const lastName = pickOne(nationalityProfile.lastNames, rng);

  return {
    id,
    firstName,
    lastName,
    age,
    nationality: nationalityProfile.nationality,
    clubId,
    primaryPosition: position,
    secondaryPositions: [],
    preferredRole: roleByPosition[position],
    squadRole: age <= 20 ? "prospect" : "rotation",
    marketReputation: calculateInitialMarketReputation(currentAverage, potentialAverage, age),
    currentStats,
    potentialStats,
    development: {
      trainingXp: 0,
      matchXp: 0,
      developmentRate: Number((0.8 + rng() * 0.7).toFixed(2)),
      ageCurveStage: getAgeCurveStageForAge(age),
      unspentDevelopmentPoints: 0,
      developmentPointProgress: 0,
      cappedStats: [],
      statProgress: {},
      lastMatchXpGained: 0,
      lastTrainingXpGained: 0,
      lastDevelopmentPointsGained: 0,
      recentStatGrowth: [],
      recentDevelopmentNotes: []
    },
    contract: {
      wagePerWeek: Math.round(80 + currentAverage * 38 + potentialAverage * 16),
      seasonsRemaining: randomInt(
        contractProfile.initialContractSeasons.min,
        contractProfile.initialContractSeasons.max,
        rng
      ),
      marketValue: Math.round(5_000 + currentAverage * 3_500 + potentialAverage * 2_000)
    },
    status: {
      fitness: 100,
      morale: randomInt(playerContextProfile.morale.initialMin, playerContextProfile.morale.initialMax, rng),
      form: randomInt(45, 65, rng),
      injuryWeeksRemaining: 0,
      suspendedMatchesRemaining: 0
    },
    history: {
      seasonsPlayed: 0,
      totalAppearances: 0,
      totalGoals: 0,
      totalAssists: 0,
      totalCleanSheets: position === "GK" ? 0 : undefined,
      previousClubIds: []
    },
    visualIdentity: {
      portraitSeed: `${clubId}_${id}_${firstName}_${lastName}_${position}`,
      appearanceProfile: getAppearanceProfile(age, position),
      kitNumber: kitNumber ?? randomInt(1, 99, rng)
    },
    transferIntent: {
      isListed: false,
      askingPrice: Math.round(5_000 + currentAverage * 3_500 + potentialAverage * 2_000),
      interestLevel: 0
    }
  };
}
