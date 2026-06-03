import { describe, expect, it } from "vitest";
import { generateGameState } from "../generation/generateGameState";
import { autoSelectLineup, validateLineup } from "../lineup/selectLineup";
import type { LeagueTableEntry } from "../types/league";
import type { Match } from "../types/match";
import type { Lineup } from "../types/tactics";
import { adjustAITactic, playMatchday } from "./playMatchday";
import { updateLeagueTable } from "./updateLeagueTable";

function emptyEntry(clubId: string): LeagueTableEntry {
  return {
    clubId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0
  };
}

function makeMatch(homeGoals: number, awayGoals: number): Match {
  return {
    id: "match_test",
    fixtureId: "fixture_test",
    homeClubId: "home",
    awayClubId: "away",
    homeLineup: {} as Lineup,
    awayLineup: {} as Lineup,
    result: {
      homeGoals,
      awayGoals,
      winnerClubId: homeGoals > awayGoals ? "home" : awayGoals > homeGoals ? "away" : null
    },
    events: [],
    report: {
      summary: "",
      homeStats: {
        eventsWon: 0,
        chancesCreated: 0,
        shots: 0,
        goals: homeGoals,
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
      },
      awayStats: {
        eventsWon: 0,
        chancesCreated: 0,
        shots: 0,
        goals: awayGoals,
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
      },
      keyProblems: [],
      playerStats: {},
      playerRatings: {},
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
}

describe("season table updates", () => {
  it("updates league table after a home win", () => {
    const [home, away] = updateLeagueTable([emptyEntry("home"), emptyEntry("away")], makeMatch(2, 1));

    expect(home).toMatchObject({ played: 1, wins: 1, goalsFor: 2, goalsAgainst: 1, points: 3 });
    expect(away).toMatchObject({ played: 1, losses: 1, goalsFor: 1, goalsAgainst: 2, points: 0 });
  });

  it("updates league table after a draw", () => {
    const [home, away] = updateLeagueTable([emptyEntry("home"), emptyEntry("away")], makeMatch(1, 1));

    expect(home).toMatchObject({ played: 1, draws: 1, points: 1 });
    expect(away).toMatchObject({ played: 1, draws: 1, points: 1 });
  });

  it("updates league table after an away win", () => {
    const [home, away] = updateLeagueTable([emptyEntry("home"), emptyEntry("away")], makeMatch(0, 2));

    expect(home).toMatchObject({ played: 1, losses: 1, points: 0 });
    expect(away).toMatchObject({ played: 1, wins: 1, points: 3 });
  });
});

describe("playing a matchday", () => {
  it("marks the player fixture as played and stores its match id", () => {
    const gameState = generateGameState();
    const playerClub = gameState.clubs[gameState.playerClubId];
    const fixture = gameState.seasons[gameState.currentSeasonId].fixtures.find(
      (candidate) => candidate.homeClubId === playerClub.id || candidate.awayClubId === playerClub.id
    )!;
    const lineup = autoSelectLineup(playerClub, gameState, playerClub.tactics.activeTactic);
    const result = playMatchday({
      gameState,
      fixtureId: fixture.id,
      playerLineup: lineup,
      playerTactic: playerClub.tactics.activeTactic,
      rng: () => 0.37
    });
    const playedFixture = result.gameState.seasons[result.gameState.currentSeasonId].fixtures.find(
      (candidate) => candidate.id === fixture.id
    )!;

    expect(playedFixture.status).toBe("played");
    expect(playedFixture.matchId).toBe(result.playerMatchId);
    expect(result.gameState.matches[result.playerMatchId]).toBeTruthy();
  });

  it("advances matchday after all current matchday fixtures are played", () => {
    const gameState = generateGameState();
    const playerClub = gameState.clubs[gameState.playerClubId];
    const fixture = gameState.seasons[gameState.currentSeasonId].fixtures.find(
      (candidate) => candidate.homeClubId === playerClub.id || candidate.awayClubId === playerClub.id
    )!;
    const lineup = autoSelectLineup(playerClub, gameState, playerClub.tactics.activeTactic);
    const result = playMatchday({
      gameState,
      fixtureId: fixture.id,
      playerLineup: lineup,
      playerTactic: playerClub.tactics.activeTactic,
      rng: () => 0.31
    });

    expect(result.gameState.seasons[result.gameState.currentSeasonId].currentMatchday).toBe(2);
    expect(result.gameState.currentDate.week).toBe(2);
  });

  it("rejects duplicate manual starters and accepts an auto-selected lineup", () => {
    const gameState = generateGameState();
    const playerClub = gameState.clubs[gameState.playerClubId];
    const lineup = autoSelectLineup(playerClub, gameState, playerClub.tactics.activeTactic);
    const duplicateLineup = {
      ...lineup,
      starters: lineup.starters.map((slot, index) =>
        index === 1 ? { ...slot, playerId: lineup.starters[0].playerId } : slot
      )
    };

    expect(validateLineup(lineup, gameState, playerClub.id).valid).toBe(true);
    expect(validateLineup(duplicateLineup, gameState, playerClub.id).valid).toBe(false);
  });
});

describe("AI tactical reactions", () => {
  it("uses a temporary defensive reaction during a losing run", () => {
    const gameState = generateGameState();
    const club = Object.values(gameState.clubs).find((candidate) => candidate.id !== gameState.playerClubId)!;
    club.seasonStats.formLastFive = ["L", "L", "L"];

    const tactic = adjustAITactic(club, () => 0);

    expect(tactic.focus).toBe("defensive_shape");
    expect(tactic.riskLevel).toBe("conservative");
  });

  it("returns to the saved club identity after the crisis passes", () => {
    const gameState = generateGameState();
    const club = Object.values(gameState.clubs).find((candidate) => candidate.id !== gameState.playerClubId)!;
    const baseTactic = club.tactics.savedTactics[0];
    club.tactics.activeTactic = {
      ...baseTactic,
      formation: "5-4-1",
      focus: "defensive_shape",
      riskLevel: "conservative"
    };
    club.seasonStats.formLastFive = ["W", "D", "L"];

    expect(adjustAITactic(club, () => 0.99)).toEqual(baseTactic);
  });
});
