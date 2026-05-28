import { describe, expect, it } from "vitest";
import { generateGameState } from "../generation/generateGameState";
import { autoSelectLineup } from "../lineup/selectLineup";
import { simulateMatch } from "./simulateMatch";

describe("simulateMatch", () => {
  function sequenceRng(values: number[]): () => number {
    let index = 0;
    return () => {
      const value = values[index % values.length];
      index += 1;
      return value;
    };
  }

  function createMatch(rng: () => number = () => 0.42) {
    const gameState = generateGameState();
    const season = gameState.seasons[gameState.currentSeasonId];
    const fixture = season.fixtures[0];
    const homeClub = gameState.clubs[fixture.homeClubId];
    const awayClub = gameState.clubs[fixture.awayClubId];
    const homeLineup = autoSelectLineup(homeClub, gameState, homeClub.tactics.activeTactic);
    const awayLineup = autoSelectLineup(awayClub, gameState, awayClub.tactics.activeTactic);

    return simulateMatch({
      fixture,
      homeClub,
      awayClub,
      homeLineup,
      awayLineup,
      homeTactic: homeClub.tactics.activeTactic,
      awayTactic: awayClub.tactics.activeTactic,
      gameState,
      reportingClubId: fixture.homeClubId,
      rng
    });
  }

  it("returns a valid match result", () => {
    const match = createMatch();

    expect(match.id).toBeTruthy();
    expect(match.fixtureId).toBeTruthy();
    expect(match.homeLineup.starters).toHaveLength(11);
    expect(match.awayLineup.starters).toHaveLength(11);
    expect(match.events.length).toBeGreaterThan(0);
    expect(match.report.summary).toBeTruthy();
  });

  it("returns non-negative integer goals", () => {
    const match = createMatch();

    expect(Number.isInteger(match.result.homeGoals)).toBe(true);
    expect(Number.isInteger(match.result.awayGoals)).toBe(true);
    expect(match.result.homeGoals).toBeGreaterThanOrEqual(0);
    expect(match.result.awayGoals).toBeGreaterThanOrEqual(0);
  });

  it("includes team stats and recommendations in the match report", () => {
    const match = createMatch();

    expect(match.report.homeStats.eventsWon + match.report.awayStats.eventsWon).toBeGreaterThan(0);
    expect(match.report.homeStats.chanceTypeBreakdown.fast_breakaway).toBeGreaterThanOrEqual(0);
    expect(match.report.keyProblems.length).toBeGreaterThan(0);
    expect(match.report.recommendations.length).toBeGreaterThan(0);
  });

  it("adds player involvement and outcomes to key match events", () => {
    const goalMatch = createMatch(() => 0);
    const saveMatch = createMatch(sequenceRng([0.4, 0.4, 0.4, 0, 0, 0, 0, 0.99]));
    const combinedEvents = [...goalMatch.events, ...saveMatch.events];
    const goals = combinedEvents.filter((event) => event.type === "goal");
    const shots = combinedEvents.filter((event) => event.type === "shot");
    const saves = combinedEvents.filter((event) => event.type === "save");
    const chances = combinedEvents.filter((event) => event.type === "chance");

    expect(goals.length).toBeGreaterThan(0);
    expect(shots.length).toBeGreaterThan(0);
    expect(saves.length).toBeGreaterThan(0);
    expect(chances.length).toBeGreaterThan(0);
    expect(goals.every((event) => event.playerId && event.outcome === "scored")).toBe(true);
    expect(shots.every((event) => event.playerId && event.outcome)).toBe(true);
    expect(saves.every((event) => event.playerId && event.secondaryPlayerId && event.outcome === "saved")).toBe(true);
    expect(chances.every((event) => event.playerId && event.secondaryPlayerId && event.outcome === "created")).toBe(true);
  });

  it("includes player stats and ratings in the match report", () => {
    const match = createMatch();

    expect(Object.keys(match.report.playerStats)).toHaveLength(22);
    expect(Object.keys(match.report.playerRatings)).toHaveLength(22);
    expect(Object.values(match.report.playerRatings).every((rating) => rating.rating >= 3 && rating.rating <= 10)).toBe(true);
  });
});
