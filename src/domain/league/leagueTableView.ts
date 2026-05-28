import type { LeagueTableEntry } from "../types/league";
import type { GameState } from "../types/game";
import type { SortDirection } from "../player/squadTableView";

export type LeagueSortColumn = "Club" | "P" | "W" | "D" | "L" | "GF" | "GA" | "GD" | "Pts";

export type LeagueSort = {
  column: LeagueSortColumn;
  direction: SortDirection;
};

export const defaultLeagueSort: LeagueSort = {
  column: "Pts",
  direction: "desc"
};

function leagueSortValue(entry: LeagueTableEntry, gameState: GameState, column: LeagueSortColumn): string | number {
  if (column === "Club") return gameState.clubs[entry.clubId].name;
  if (column === "P") return entry.played;
  if (column === "W") return entry.wins;
  if (column === "D") return entry.draws;
  if (column === "L") return entry.losses;
  if (column === "GF") return entry.goalsFor;
  if (column === "GA") return entry.goalsAgainst;
  if (column === "GD") return entry.goalDifference;
  return entry.points;
}

export function sortLeagueTable(entries: LeagueTableEntry[], gameState: GameState, sort: LeagueSort = defaultLeagueSort): LeagueTableEntry[] {
  const direction = sort.direction === "asc" ? 1 : -1;
  return entries.slice().sort((left, right) => {
    const leftValue = leagueSortValue(left, gameState, sort.column);
    const rightValue = leagueSortValue(right, gameState, sort.column);
    const result = typeof leftValue === "number" && typeof rightValue === "number"
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue));
    if (result !== 0) return result * direction;
    if (right.points !== left.points) return right.points - left.points;
    if (right.goalDifference !== left.goalDifference) return right.goalDifference - left.goalDifference;
    if (right.goalsFor !== left.goalsFor) return right.goalsFor - left.goalsFor;
    return gameState.clubs[left.clubId].name.localeCompare(gameState.clubs[right.clubId].name);
  });
}
