import { describe, expect, it } from "vitest";
import { generateGameState } from "../generation/generateGameState";
import { autoSelectLineup } from "../lineup/selectLineup";
import type { Match, MatchTeamStats, PlayerMatchStats } from "../types/match";
import { calculatePlayerMatchRatings, getTopPlayerRatings } from "./playerMatchRatings";

function emptyTeamStats(): MatchTeamStats {
  return {
    eventsWon: 0,
    chancesCreated: 0,
    shots: 0,
    goals: 0,
    xg: 0,
    savesForced: 0,
    reboundsWon: 0,
    redCards: 0,
    chanceTypeBreakdown: {
      fast_breakaway: 0,
      wide_cross: 0,
      sustained_pressure: 0,
      rebound_big_chance: 0
    }
  };
}

function emptyPlayerStats(playerId: string, clubId: string, position: PlayerMatchStats["position"]): PlayerMatchStats {
  return {
    playerId,
    clubId,
    position,
    minutes: 90,
    goals: 0,
    assists: 0,
    shots: 0,
    shotsOnTarget: 0,
    xg: 0,
    keyPasses: 0,
    chanceInvolvements: 0,
    eventsWon: 0,
    duelsWon: 0,
    duelsLost: 0,
    defensiveActions: 0,
    defensiveStops: 0,
    errors: 0,
    errorsLeadingToGoal: 0,
    saves: 0,
    xgFaced: 0,
    goalsConceded: 0,
    reboundsAllowed: 0
  };
}

function createContext() {
  const gameState = generateGameState();
  const season = gameState.seasons[gameState.currentSeasonId];
  const fixture = season.fixtures[0];
  const homeClub = gameState.clubs[fixture.homeClubId];
  const awayClub = gameState.clubs[fixture.awayClubId];
  const homeLineup = autoSelectLineup(homeClub, gameState, homeClub.tactics.activeTactic);
  const awayLineup = autoSelectLineup(awayClub, gameState, awayClub.tactics.activeTactic);
  const strikerId = homeLineup.starters.find((slot) => slot.position === "ST")!.playerId;
  const goalkeeperId = homeLineup.starters.find((slot) => slot.position === "GK")!.playerId;
  const match: Match = {
    id: "match_ratings",
    fixtureId: fixture.id,
    homeClubId: homeClub.id,
    awayClubId: awayClub.id,
    homeLineup,
    awayLineup,
    result: { homeGoals: 1, awayGoals: 0, winnerClubId: homeClub.id },
    events: [],
    report: {
      summary: "",
      homeStats: emptyTeamStats(),
      awayStats: emptyTeamStats(),
      playerStats: {},
      playerRatings: {},
      keyProblems: [],
      recommendations: []
    },
    rewards: {
      money: 0,
      fans: 0,
      reputation: 0,
      playerXp: {},
      tacticalFamiliarity: {}
    }
  };

  return { gameState, homeClub, strikerId, goalkeeperId, match };
}

describe("player match ratings", () => {
  it("clamps ratings between 3.0 and 10.0", () => {
    const { gameState, homeClub, strikerId, match } = createContext();
    const stats = emptyPlayerStats(strikerId, homeClub.id, "ST");
    stats.goals = 8;
    stats.assists = 5;
    stats.chanceInvolvements = 10;

    const rating = calculatePlayerMatchRatings({ [strikerId]: stats }, match, gameState)[strikerId];

    expect(rating.rating).toBeLessThanOrEqual(10);
    expect(rating.rating).toBeGreaterThanOrEqual(3);
  });

  it("boosts a goal scorer and a goalkeeper with saves", () => {
    const { gameState, homeClub, strikerId, goalkeeperId, match } = createContext();
    const strikerStats = emptyPlayerStats(strikerId, homeClub.id, "ST");
    strikerStats.goals = 1;
    strikerStats.shots = 1;
    strikerStats.xg = 0.2;
    const goalkeeperStats = emptyPlayerStats(goalkeeperId, homeClub.id, "GK");
    goalkeeperStats.saves = 4;
    goalkeeperStats.xgFaced = 1.1;

    const ratings = calculatePlayerMatchRatings(
      { [strikerId]: strikerStats, [goalkeeperId]: goalkeeperStats },
      match,
      gameState
    );

    expect(ratings[strikerId].rating).toBeGreaterThan(6);
    expect(ratings[goalkeeperId].rating).toBeGreaterThan(6);
  });

  it("penalizes a striker missing high xG chances", () => {
    const { gameState, homeClub, strikerId, match } = createContext();
    const stats = emptyPlayerStats(strikerId, homeClub.id, "ST");
    stats.shots = 4;
    stats.shotsOnTarget = 2;
    stats.xg = 1.4;

    const rating = calculatePlayerMatchRatings({ [strikerId]: stats }, match, gameState)[strikerId];

    expect(rating.rating).toBeLessThan(6);
    expect(rating.negatives).toContain("Struggled to convert good chances.");
  });

  it("identifies top performers from ratings", () => {
    const { gameState, homeClub, strikerId, goalkeeperId, match } = createContext();
    const strikerStats = emptyPlayerStats(strikerId, homeClub.id, "ST");
    strikerStats.goals = 2;
    const goalkeeperStats = emptyPlayerStats(goalkeeperId, homeClub.id, "GK");
    goalkeeperStats.saves = 1;

    const ratings = calculatePlayerMatchRatings(
      { [strikerId]: strikerStats, [goalkeeperId]: goalkeeperStats },
      match,
      gameState
    );

    expect(getTopPlayerRatings(ratings, 1)[0].playerId).toBe(strikerId);
  });
});
