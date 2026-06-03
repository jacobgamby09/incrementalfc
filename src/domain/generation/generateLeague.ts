import type { League, LeagueTableEntry } from "../types/league";
import {
  leagueProfiles,
  getLeagueIdForLevel,
  getPromotionSpotsForLevel,
  getRelegationSpotsForLevel,
  normalizeLeagueLevel
} from "../../data/constants/leagueProfiles";

export function createEmptyTable(clubIds: string[]): LeagueTableEntry[] {
  return clubIds.map((clubId) => ({
    clubId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0
  }));
}

export function generateLeague(clubIds: string[], level = 1): League {
  const norm = normalizeLeagueLevel(level);
  const profile = leagueProfiles[norm] ?? leagueProfiles[1];
  return {
    id: getLeagueIdForLevel(norm),
    name: profile.name,
    level: profile.level,
    clubIds,
    teamsCount: 10,
    matchesPerSeason: 18,
    promotionSpots: getPromotionSpotsForLevel(norm),
    relegationSpots: getRelegationSpotsForLevel(norm),
    playerStatRange: profile.playerStatRange,
    rewardProfile: profile.rewardProfile,
    facilityCapLimit: profile.facilityCapLimit,
    targetOvrRange: profile.targetOvrRange,
    targetPotentialRange: profile.targetPotentialRange,
    rarePotentialMax: profile.rarePotentialMax,
    facilityCap: profile.facilityCap,
    typicalWageRange: profile.typicalWageRange,
    typicalValueRange: profile.typicalValueRange
  };
}
