import type { LeagueTableEntry } from "../types/league";
import type { Match } from "../types/match";

function applyResultToEntry(
  entry: LeagueTableEntry,
  goalsFor: number,
  goalsAgainst: number
): LeagueTableEntry {
  const win = goalsFor > goalsAgainst ? 1 : 0;
  const draw = goalsFor === goalsAgainst ? 1 : 0;
  const loss = goalsFor < goalsAgainst ? 1 : 0;

  return {
    ...entry,
    played: entry.played + 1,
    wins: entry.wins + win,
    draws: entry.draws + draw,
    losses: entry.losses + loss,
    goalsFor: entry.goalsFor + goalsFor,
    goalsAgainst: entry.goalsAgainst + goalsAgainst,
    goalDifference: entry.goalDifference + goalsFor - goalsAgainst,
    points: entry.points + win * 3 + draw
  };
}

export function updateLeagueTable(table: LeagueTableEntry[], match: Match): LeagueTableEntry[] {
  return table.map((entry) => {
    if (entry.clubId === match.homeClubId) {
      return applyResultToEntry(entry, match.result.homeGoals, match.result.awayGoals);
    }
    if (entry.clubId === match.awayClubId) {
      return applyResultToEntry(entry, match.result.awayGoals, match.result.homeGoals);
    }
    return entry;
  });
}
