import type { League, LeagueTableEntry } from "../types/league";
import { lowestLeagueStatRange } from "../../data/constants/leagueProfiles";

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

export function generateLeague(clubIds: string[]): League {
  return {
    id: "league_lowland_1",
    name: "Lowland League Division",
    level: 1,
    clubIds,
    teamsCount: 10,
    matchesPerSeason: 18,
    promotionSpots: 2,
    relegationSpots: 0,
    playerStatRange: lowestLeagueStatRange,
    rewardProfile: {
      participationPrize: 15_000,
      championPrize: 80_000,
      promotionBonus: 50_000
    },
    facilityCapLimit: 2
  };
}
