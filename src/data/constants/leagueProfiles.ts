import type { StatRangeProfile, LeagueRewardProfile } from "../../domain/types/league";

export const lowestLeagueStatRange: StatRangeProfile = {
  typicalCurrentMin: 1,
  typicalCurrentMax: 10,
  typicalPotentialMin: 6,
  typicalPotentialMax: 10,
  rarePotentialMax: 18
};

export type LeagueProfile = {
  name: string;
  level: number;
  playerStatRange: StatRangeProfile;
  targetOvrRange: [number, number];
  targetPotentialRange: [number, number];
  rarePotentialMax: number;
  facilityCap: number;
  typicalWageRange: [number, number];
  typicalValueRange: [number, number];
  rewardProfile: LeagueRewardProfile;
  facilityCapLimit: number;
};

export const leagueProfiles: Record<number, LeagueProfile> = {
  1: {
    name: "Local League",
    level: 1,
    playerStatRange: lowestLeagueStatRange,
    targetOvrRange: [1, 10],
    targetPotentialRange: [6, 10],
    rarePotentialMax: 18,
    facilityCap: 10,
    typicalWageRange: [80, 600],
    typicalValueRange: [5000, 50000],
    rewardProfile: {
      participationPrize: 15000,
      championPrize: 80000,
      promotionBonus: 50000
    },
    facilityCapLimit: 1
  },
  2: {
    name: "Regional League",
    level: 2,
    playerStatRange: {
      typicalCurrentMin: 8,
      typicalCurrentMax: 18,
      typicalPotentialMin: 12,
      typicalPotentialMax: 18,
      rarePotentialMax: 28
    },
    targetOvrRange: [8, 18],
    targetPotentialRange: [12, 18],
    rarePotentialMax: 28,
    facilityCap: 15,
    typicalWageRange: [500, 1500],
    typicalValueRange: [30000, 150000],
    rewardProfile: {
      participationPrize: 35000,
      championPrize: 180000,
      promotionBonus: 120000
    },
    facilityCapLimit: 2
  },
  3: {
    name: "National League",
    level: 3,
    playerStatRange: {
      typicalCurrentMin: 16,
      typicalCurrentMax: 28,
      typicalPotentialMin: 22,
      typicalPotentialMax: 30,
      rarePotentialMax: 45
    },
    targetOvrRange: [16, 28],
    targetPotentialRange: [22, 30],
    rarePotentialMax: 45,
    facilityCap: 20,
    typicalWageRange: [1200, 3000],
    typicalValueRange: [100000, 500000],
    rewardProfile: {
      participationPrize: 80000,
      championPrize: 400000,
      promotionBonus: 250000
    },
    facilityCapLimit: 3
  },
  4: {
    name: "Championship",
    level: 4,
    playerStatRange: {
      typicalCurrentMin: 26,
      typicalCurrentMax: 42,
      typicalPotentialMin: 35,
      typicalPotentialMax: 45,
      rarePotentialMax: 65
    },
    targetOvrRange: [26, 42],
    targetPotentialRange: [35, 45],
    rarePotentialMax: 65,
    facilityCap: 25,
    typicalWageRange: [2500, 6000],
    typicalValueRange: [400000, 2000000],
    rewardProfile: {
      participationPrize: 200000,
      championPrize: 1000000,
      promotionBonus: 600000
    },
    facilityCapLimit: 4
  },
  5: {
    name: "Premier League",
    level: 5,
    playerStatRange: {
      typicalCurrentMin: 40,
      typicalCurrentMax: 70,
      typicalPotentialMin: 60,
      typicalPotentialMax: 80,
      rarePotentialMax: 99
    },
    targetOvrRange: [40, 70],
    targetPotentialRange: [60, 80],
    rarePotentialMax: 99,
    facilityCap: 30,
    typicalWageRange: [5000, 25000],
    typicalValueRange: [1500000, 10000000],
    rewardProfile: {
      participationPrize: 600000,
      championPrize: 3000000,
      promotionBonus: 0
    },
    facilityCapLimit: 5
  }
};

export const MIN_LEAGUE_LEVEL = 1;
export const MAX_LEAGUE_LEVEL = Math.max(...Object.keys(leagueProfiles).map(Number));

export function normalizeLeagueLevel(level: number): number {
  if (typeof level !== "number" || !Number.isFinite(level) || Number.isNaN(level)) {
    return MIN_LEAGUE_LEVEL;
  }
  return Math.min(MAX_LEAGUE_LEVEL, Math.max(MIN_LEAGUE_LEVEL, Math.floor(level)));
}

export function getLeagueProfile(level: number): LeagueProfile {
  const norm = normalizeLeagueLevel(level);
  return leagueProfiles[norm] ?? leagueProfiles[MIN_LEAGUE_LEVEL];
}

export function getLeagueIdForLevel(level: number): string {
  const norm = normalizeLeagueLevel(level);
  if (norm === 1) return "league_local_1";
  return `league_level_${norm}`;
}

export function canPromoteFromLevel(level: number): boolean {
  const norm = normalizeLeagueLevel(level);
  return norm < MAX_LEAGUE_LEVEL;
}

export function canRelegateFromLevel(level: number): boolean {
  const norm = normalizeLeagueLevel(level);
  return norm > MIN_LEAGUE_LEVEL;
}

export function getPromotionSpotsForLevel(level: number): number {
  const norm = normalizeLeagueLevel(level);
  return canPromoteFromLevel(norm) ? 2 : 0;
}

export function getRelegationSpotsForLevel(level: number): number {
  const norm = normalizeLeagueLevel(level);
  return canRelegateFromLevel(norm) ? 2 : 0;
}
