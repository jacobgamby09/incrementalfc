import type { RandomSource } from "../../utils/random";
import { calculatePlayerOvr } from "../player/playerSummaries";
import type { Club } from "../types/club";
import type { League, LeagueTableEntry } from "../types/league";
import type { Player } from "../types/player";
import { generateLeague } from "../generation/generateLeague";
import { sortTableCanonically } from "../league/leagueTableView";
import { MAX_LEAGUE_LEVEL, MIN_LEAGUE_LEVEL, getLeagueIdForLevel } from "../../data/constants/leagueProfiles";

function averageSquadOvr(club: Club, players: Record<string, Player>): number {
  const squad = club.squadPlayerIds.map((id) => players[id]).filter(Boolean);
  if (squad.length === 0) return 0;
  return squad.reduce((sum, player) => sum + calculatePlayerOvr(player), 0) / squad.length;
}

export function simulateOffscreenTable(
  clubIds: string[],
  clubs: Record<string, Club>,
  players: Record<string, Player>,
  rng: RandomSource
): LeagueTableEntry[] {
  return clubIds
    .map((clubId) => {
      const club = clubs[clubId];
      const strength = averageSquadOvr(club, players) + club.reputation * 0.08;
      const formRoll = rng() * 13 - 6.5;
      const points = Math.max(8, Math.min(48, Math.round(20 + strength * 0.55 + formRoll)));
      const goalDifference = Math.round((points - 25) * 0.8 + (rng() * 10 - 5));
      const goalsFor = Math.max(8, Math.round(23 + goalDifference * 0.45 + rng() * 8));
      const goalsAgainst = Math.max(8, goalsFor - goalDifference);
      const wins = Math.min(18, Math.max(0, Math.floor(points / 3)));
      const draws = Math.min(18 - wins, Math.max(0, points - wins * 3));
      return {
        clubId,
        played: 18,
        wins,
        draws,
        losses: Math.max(0, 18 - wins - draws),
        goalsFor,
        goalsAgainst,
        goalDifference: goalsFor - goalsAgainst,
        points
      };
    });
}

type PyramidUpdate = {
  leagues: Record<string, League>;
  promotedClubIds: string[];
  relegatedClubIds: string[];
};

export function updatePersistentPyramid(
  leagues: Record<string, League>,
  clubs: Record<string, Club>,
  players: Record<string, Player>,
  activeLeagueId: string,
  activeTable: LeagueTableEntry[],
  rng: RandomSource
): PyramidUpdate {
  const rankingsByLevel = new Map<number, LeagueTableEntry[]>();
  for (let level = MIN_LEAGUE_LEVEL; level <= MAX_LEAGUE_LEVEL; level += 1) {
    const league = leagues[getLeagueIdForLevel(level)];
    if (!league) throw new Error(`Persistent league level ${level} was not found.`);
    rankingsByLevel.set(
      level,
      league.id === activeLeagueId
        ? sortTableCanonically(activeTable)
        : sortTableCanonically(simulateOffscreenTable(league.clubIds, clubs, players, rng))
    );
  }

  const clubIdsByLevel = new Map<number, string[]>();
  for (let level = MIN_LEAGUE_LEVEL; level <= MAX_LEAGUE_LEVEL; level += 1) {
    clubIdsByLevel.set(level, [...leagues[getLeagueIdForLevel(level)].clubIds]);
  }

  const promotedClubIds: string[] = [];
  const relegatedClubIds: string[] = [];
  for (let lowerLevel = MIN_LEAGUE_LEVEL; lowerLevel < MAX_LEAGUE_LEVEL; lowerLevel += 1) {
    const upperLevel = lowerLevel + 1;
    const promoted = rankingsByLevel.get(lowerLevel)!.slice(0, 2).map((entry) => entry.clubId);
    const relegated = rankingsByLevel.get(upperLevel)!.slice(-2).map((entry) => entry.clubId);
    promotedClubIds.push(...promoted);
    relegatedClubIds.push(...relegated);
    clubIdsByLevel.set(
      lowerLevel,
      clubIdsByLevel.get(lowerLevel)!.filter((id) => !promoted.includes(id)).concat(relegated)
    );
    clubIdsByLevel.set(
      upperLevel,
      clubIdsByLevel.get(upperLevel)!.filter((id) => !relegated.includes(id)).concat(promoted)
    );
  }

  const nextLeagues: Record<string, League> = {};
  for (let level = MIN_LEAGUE_LEVEL; level <= MAX_LEAGUE_LEVEL; level += 1) {
    const leagueId = getLeagueIdForLevel(level);
    const clubIds = clubIdsByLevel.get(level)!;
    nextLeagues[leagueId] = generateLeague(clubIds, level);
    for (const clubId of clubIds) {
      const club = clubs[clubId];
      club.leagueId = leagueId;
    }
  }

  for (const clubId of promotedClubIds) {
    const club = clubs[clubId];
    club.reputation += 2;
    club.history.promotions += 1;
    club.history.highestLeagueLevel = Math.max(
      club.history.highestLeagueLevel,
      nextLeagues[club.leagueId].level
    );
  }
  for (const clubId of relegatedClubIds) {
    const club = clubs[clubId];
    club.reputation = Math.max(2, club.reputation - 2);
    club.ecosystem.financialPressure = Math.min(100, club.ecosystem.financialPressure + 40);
    club.history.relegations += 1;
  }

  return { leagues: nextLeagues, promotedClubIds, relegatedClubIds };
}
