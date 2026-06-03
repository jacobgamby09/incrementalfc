import { describe, expect, it } from "vitest";
import { generateGameState } from "../generation/generateGameState";
import { autoSelectLineup } from "../lineup/selectLineup";
import type { Match, MatchTeamStats } from "../types/match";
import { aggregatePlayerMatchStats } from "./playerMatchStats";

function teamStats(): MatchTeamStats {
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
      rebound_big_chance: 0,
      corner: 0,
      indirect_free_kick: 0,
      direct_free_kick: 0,
      penalty: 0
    }
  };
}

function createManualMatch(): { gameState: ReturnType<typeof generateGameState>; match: Match; scorerId: string; creatorId: string; awayGoalkeeperId: string } {
  const gameState = generateGameState();
  const season = gameState.seasons[gameState.currentSeasonId];
  const fixture = season.fixtures[0];
  const homeClub = gameState.clubs[fixture.homeClubId];
  const awayClub = gameState.clubs[fixture.awayClubId];
  const homeLineup = autoSelectLineup(homeClub, gameState, homeClub.tactics.activeTactic);
  const awayLineup = autoSelectLineup(awayClub, gameState, awayClub.tactics.activeTactic);
  const scorerId = homeLineup.starters.find((slot) => slot.position === "ST")!.playerId;
  const creatorId = homeLineup.starters.find((slot) => ["CM", "AM", "LW", "RW"].includes(slot.position))!.playerId;
  const awayGoalkeeperId = awayLineup.starters.find((slot) => slot.position === "GK")!.playerId;
  const homeStats = teamStats();
  const awayStats = teamStats();
  homeStats.goals = 1;
  homeStats.shots = 2;
  homeStats.xg = 0.8;

  return {
    gameState,
    scorerId,
    creatorId,
    awayGoalkeeperId,
    match: {
      id: "match_stats",
      fixtureId: fixture.id,
      homeClubId: homeClub.id,
      awayClubId: awayClub.id,
      homeLineup,
      awayLineup,
      result: { homeGoals: 1, awayGoals: 0, winnerClubId: homeClub.id },
      events: [
        {
          minute: 12,
          type: "chance",
          clubId: homeClub.id,
          playerId: creatorId,
          secondaryPlayerId: scorerId,
          description: "Chance created.",
          chanceType: "sustained_pressure",
          outcome: "created"
        },
        {
          minute: 12,
          type: "shot",
          clubId: homeClub.id,
          playerId: scorerId,
          description: "Shot scored.",
          xg: 0.35,
          chanceType: "sustained_pressure",
          outcome: "scored"
        },
        {
          minute: 12,
          type: "goal",
          clubId: homeClub.id,
          playerId: scorerId,
          secondaryPlayerId: creatorId,
          description: "Goal.",
          xg: 0.35,
          chanceType: "sustained_pressure",
          outcome: "scored"
        },
        {
          minute: 55,
          type: "shot",
          clubId: homeClub.id,
          playerId: scorerId,
          description: "Shot saved.",
          xg: 0.45,
          chanceType: "fast_breakaway",
          outcome: "saved"
        },
        {
          minute: 55,
          type: "save",
          clubId: awayClub.id,
          playerId: awayGoalkeeperId,
          secondaryPlayerId: scorerId,
          description: "Save.",
          xg: 0.45,
          chanceType: "fast_breakaway",
          outcome: "saved"
        }
      ],
      report: {
        summary: "",
        homeStats,
        awayStats,
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
    }
  };
}

describe("player match stats", () => {
  it("aggregates goals, assists, shots, saves, xG, and xG faced", () => {
    const { gameState, match, scorerId, creatorId, awayGoalkeeperId } = createManualMatch();
    const stats = aggregatePlayerMatchStats(match, gameState);

    expect(stats[scorerId]).toMatchObject({
      goals: 1,
      shots: 2,
      shotsOnTarget: 2,
      xg: 0.8
    });
    expect(stats[creatorId]).toMatchObject({
      assists: 1,
      keyPasses: 1,
      chanceInvolvements: 1
    });
    expect(stats[awayGoalkeeperId]).toMatchObject({
      saves: 1,
      xgFaced: 0.8,
      goalsConceded: 1
    });
  });
});
