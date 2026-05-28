import { describe, expect, it } from "vitest";
import { generateGameState } from "../generation/generateGameState";
import type { LeagueTableEntry } from "../types/league";
import { sortLeagueTable } from "./leagueTableView";

function entry(clubId: string, points: number, goalDifference: number): LeagueTableEntry {
  return {
    clubId,
    played: 1,
    wins: points === 3 ? 1 : 0,
    draws: points === 1 ? 1 : 0,
    losses: points === 0 ? 1 : 0,
    goalsFor: goalDifference + 2,
    goalsAgainst: 2,
    goalDifference,
    points
  };
}

describe("league table view", () => {
  it("sorts by points and goal difference", () => {
    const gameState = generateGameState();
    const [first, second, third] = gameState.seasons[gameState.currentSeasonId].clubIds;
    const table = [entry(first, 1, 3), entry(second, 3, 0), entry(third, 3, 4)];

    expect(sortLeagueTable(table, gameState, { column: "Pts", direction: "desc" }).map((row) => row.clubId)).toEqual([third, second, first]);
    expect(sortLeagueTable(table, gameState, { column: "GD", direction: "desc" })[0].clubId).toBe(third);
  });
});
