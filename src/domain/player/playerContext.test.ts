import { describe, expect, it } from "vitest";
import { generateGameState } from "../generation/generateGameState";
import { autoSelectLineup } from "../lineup/selectLineup";
import type { Match, PlayerMatchStats } from "../types/match";
import { applyMatchdayPlayerContextUpdates, assignSquadRoles, calculateInitialMarketReputation, getMoraleBand } from "./playerContext";

function emptyPlayerStats(playerId: string, clubId: string): PlayerMatchStats {
  return {
    playerId,
    clubId,
    position: "ST",
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

describe("player context", () => {
  it("maps readable morale bands", () => {
    expect(getMoraleBand(90)).toBe("thriving");
    expect(getMoraleBand(70)).toBe("happy");
    expect(getMoraleBand(50)).toBe("content");
    expect(getMoraleBand(30)).toBe("frustrated");
    expect(getMoraleBand(10)).toBe("disengaged");
  });

  it("assigns a limited hierarchy of squad roles", () => {
    const gameState = generateGameState();
    const squad = gameState.clubs[gameState.playerClubId].squadPlayerIds.map((id) => gameState.players[id]);
    const assigned = assignSquadRoles(squad);

    expect(assigned.filter((player) => player.squadRole === "key_player")).toHaveLength(2);
    expect(assigned.some((player) => player.squadRole === "regular_starter")).toBe(true);
    expect(assigned.every((player) => Boolean(player.squadRole))).toBe(true);
  });

  it("keeps initial market reputation bounded", () => {
    expect(calculateInitialMarketReputation(1, 1, 18)).toBeGreaterThanOrEqual(1);
    expect(calculateInitialMarketReputation(99, 99, 27)).toBe(100);
  });

  it("rewards a starting key player after a win and raises reputation for a strong performance", () => {
    const gameState = generateGameState();
    const playerClub = gameState.clubs[gameState.playerClubId];
    const opponent = Object.values(gameState.clubs).find((club) => club.id !== playerClub.id)!;
    const homeLineup = autoSelectLineup(playerClub, gameState, playerClub.tactics.activeTactic);
    const awayLineup = autoSelectLineup(opponent, gameState, opponent.tactics.activeTactic);
    const playerId = homeLineup.starters[0].playerId!;
    const player = gameState.players[playerId];
    player.squadRole = "key_player";
    player.contract.seasonsRemaining = 2;
    const stats = emptyPlayerStats(playerId, playerClub.id);
    stats.goals = 1;
    const match: Match = {
      id: "match_context",
      fixtureId: "fixture_context",
      homeClubId: playerClub.id,
      awayClubId: opponent.id,
      homeLineup,
      awayLineup,
      result: { homeGoals: 1, awayGoals: 0, winnerClubId: playerClub.id },
      events: [],
      report: {
        summary: "",
        homeStats: {} as Match["report"]["homeStats"],
        awayStats: {} as Match["report"]["awayStats"],
        playerStats: { [playerId]: stats },
        playerRatings: {
          [playerId]: { playerId, rating: 8, summary: "", positives: [], negatives: [] }
        },
        keyProblems: [],
        recommendations: []
      },
      rewards: { money: 0, fans: 0, reputation: 0, playerXp: {}, tacticalFamiliarity: {} }
    };

    const nextState = applyMatchdayPlayerContextUpdates(gameState, [match]);

    expect(nextState.players[playerId].status.morale).toBe(player.status.morale + 4);
    expect(nextState.players[playerId].marketReputation).toBe(player.marketReputation + 2);
  });
});
