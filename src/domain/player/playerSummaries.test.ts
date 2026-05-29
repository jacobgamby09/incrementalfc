import { describe, expect, it } from "vitest";
import { lowestLeagueStatRange } from "../../data/constants/leagueProfiles";
import { generateGameState } from "../generation/generateGameState";
import { generatePlayer } from "../generation/generatePlayer";
import { autoSelectLineup } from "../lineup/selectLineup";
import type { GameState } from "../types/game";
import type { Match, MatchTeamStats, PlayerMatchStats } from "../types/match";
import {
  calculatePlayerOvr,
  calculatePlayerPot,
  getMatchRatingRows,
  getPlayerPerformanceSummary,
  getPlayerRatingHistory,
  sortMatchRatingRows
} from "./playerSummaries";

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
      rebound_big_chance: 0
    }
  };
}

function playerStats(playerId: string, clubId: string, position: PlayerMatchStats["position"], rating: number): PlayerMatchStats {
  return {
    playerId,
    clubId,
    position,
    minutes: 90,
    goals: rating > 7 ? 1 : 0,
    assists: 0,
    shots: 1,
    shotsOnTarget: 1,
    xg: 0.3,
    keyPasses: 1,
    chanceInvolvements: 1,
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

function addRatedMatches(gameState: GameState, playerId: string, ratings: number[]): GameState {
  const season = gameState.seasons[gameState.currentSeasonId];
  const playerClub = gameState.clubs[gameState.playerClubId];
  const opponentClubId = season.clubIds.find((clubId) => clubId !== playerClub.id)!;
  const opponentClub = gameState.clubs[opponentClubId];
  const playerLineup = autoSelectLineup(playerClub, gameState, playerClub.tactics.activeTactic);
  const opponentLineup = autoSelectLineup(opponentClub, gameState, opponentClub.tactics.activeTactic);
  const fixtures = season.fixtures.slice();
  const ratedFixtures = fixtures
    .filter((fixture) => fixture.homeClubId === playerClub.id || fixture.awayClubId === playerClub.id)
    .slice(0, ratings.length);
  const matches: Record<string, Match> = {};

  for (const [index, rating] of ratings.entries()) {
    const fixture = ratedFixtures[index];
    const matchId = `match_rating_${index}`;
    fixture.status = "played";
    fixture.matchId = matchId;
    matches[matchId] = {
      id: matchId,
      fixtureId: fixture.id,
      homeClubId: fixture.homeClubId,
      awayClubId: fixture.awayClubId,
      homeLineup: fixture.homeClubId === playerClub.id ? playerLineup : opponentLineup,
      awayLineup: fixture.awayClubId === playerClub.id ? playerLineup : opponentLineup,
      result: { homeGoals: 1, awayGoals: 0, winnerClubId: fixture.homeClubId },
      events: [],
      report: {
        summary: "",
        homeStats: teamStats(),
        awayStats: teamStats(),
        playerStats: {
          [playerId]: playerStats(playerId, playerClub.id, "ST", rating)
        },
        playerRatings: {
          [playerId]: {
            playerId,
            rating,
            summary: "Rated match.",
            positives: [],
            negatives: []
          }
        },
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
  }

  return {
    ...gameState,
    seasons: {
      ...gameState.seasons,
      [season.id]: {
        ...season,
        fixtures
      }
    },
    matches: {
      ...gameState.matches,
      ...matches
    }
  };
}

describe("player summaries", () => {
  it("calculates OVR from position-relevant current stats", () => {
    const striker = generatePlayer({ clubId: "c", position: "ST", statRange: lowestLeagueStatRange, kitNumber: 9 });
    striker.currentStats = { PAS: 1, SHO: 10, TAC: 1, CRO: 1, HEA: 9, ACC: 10, STA: 6, DRI: 9, POS: 10, TEC: 10, PHY: 1, MEN: 8 };
    const centreBack = generatePlayer({ clubId: "c", position: "CB", statRange: lowestLeagueStatRange, kitNumber: 5 });
    centreBack.currentStats = { PAS: 1, SHO: 1, TAC: 10, CRO: 1, HEA: 10, ACC: 2, STA: 7, DRI: 1, POS: 10, TEC: 1, PHY: 10, MEN: 8 };
    const goalkeeper = generatePlayer({ clubId: "c", position: "GK", statRange: lowestLeagueStatRange, kitNumber: 1 });
    goalkeeper.currentStats = { REF: 10, HAN: 9, DIS: 8, TEC: 1, PHY: 1, MEN: 8 };

    expect(calculatePlayerOvr(striker)).toBeGreaterThan(8);
    expect(calculatePlayerOvr(centreBack)).toBeGreaterThan(8);
    expect(calculatePlayerOvr(goalkeeper)).toBeGreaterThan(8);
  });

  it("calculates POT from potential stats rather than current stats", () => {
    const player = generatePlayer({ clubId: "c", position: "ST", statRange: lowestLeagueStatRange, kitNumber: 9 });
    player.currentStats = { PAS: 1, SHO: 1, TAC: 1, CRO: 1, HEA: 1, ACC: 1, STA: 1, DRI: 1, POS: 1, TEC: 1, PHY: 1, MEN: 1 };
    player.potentialStats = { PAS: 10, SHO: 10, TAC: 10, CRO: 10, HEA: 10, ACC: 10, STA: 10, DRI: 10, POS: 10, TEC: 10, PHY: 10, MEN: 10 };

    expect(calculatePlayerOvr(player)).toBe(1);
    expect(calculatePlayerPot(player)).toBe(10);
  });

  it("changes OVR when new role-relevant stats change", () => {
    const winger = generatePlayer({ clubId: "c", position: "LW", statRange: lowestLeagueStatRange, kitNumber: 11 });
    winger.currentStats = { PAS: 5, SHO: 5, TAC: 5, CRO: 7, HEA: 5, ACC: 8, STA: 5, DRI: 3, POS: 5, TEC: 7, PHY: 5, MEN: 5 };
    const lowDribblingOvr = calculatePlayerOvr(winger);
    winger.currentStats = { ...winger.currentStats, DRI: 10 };

    const centreBack = generatePlayer({ clubId: "c", position: "CB", statRange: lowestLeagueStatRange, kitNumber: 5 });
    centreBack.currentStats = { PAS: 5, SHO: 5, TAC: 8, CRO: 5, HEA: 8, ACC: 5, STA: 5, DRI: 5, POS: 3, TEC: 5, PHY: 8, MEN: 7 };
    const lowPositioningOvr = calculatePlayerOvr(centreBack);
    centreBack.currentStats = { ...centreBack.currentStats, POS: 10 };

    expect(calculatePlayerOvr(winger)).toBeGreaterThan(lowDribblingOvr);
    expect(calculatePlayerOvr(centreBack)).toBeGreaterThan(lowPositioningOvr);
  });

  it("returns last five form ratings newest first and season averages safely", () => {
    const baseState = generateGameState();
    const playerClub = baseState.clubs[baseState.playerClubId];
    const playerId = playerClub.squadPlayerIds[0];
    const gameState = addRatedMatches(baseState, playerId, [6.1, 6.2, 6.3, 6.4, 6.5, 7.0]);
    const history = getPlayerRatingHistory(gameState, playerId);
    const summary = getPlayerPerformanceSummary(gameState, playerId);

    expect(history.map((entry) => entry.rating.rating).slice(0, 5)).toEqual([7.0, 6.5, 6.4, 6.3, 6.2]);
    expect(summary.formLastFive).toEqual([7.0, 6.5, 6.4, 6.3, 6.2]);
    expect(summary.avgRating).toBe(6.4);
    expect(summary.lastRating).toBe(7.0);
  });

  it("handles players with no rating history", () => {
    const gameState = generateGameState();
    const playerId = gameState.clubs[gameState.playerClubId].squadPlayerIds[0];
    const summary = getPlayerPerformanceSummary(gameState, playerId);

    expect(summary.apps).toBe(0);
    expect(summary.formLastFive).toEqual([]);
    expect(summary.display.avgRating).toBe("-");
  });

  it("builds club-aware match rating rows", () => {
    const baseState = generateGameState();
    const playerClub = baseState.clubs[baseState.playerClubId];
    const playerId = playerClub.squadPlayerIds[0];
    const gameState = addRatedMatches(baseState, playerId, [7.2]);
    const match = Object.values(gameState.matches)[0];
    const row = getMatchRatingRows(gameState, match, playerClub.id)[0];

    expect(row.clubName).toBe(playerClub.name);
    expect(row.clubShortName).toBe(playerClub.shortName);
    expect(row.isOwnClub).toBe(true);
    expect(row.matchContext.rating?.rating).toBe(7.2);
  });

  it("sorts match rating rows by rating", () => {
    const baseState = generateGameState();
    const playerClub = baseState.clubs[baseState.playerClubId];
    const firstPlayerId = playerClub.squadPlayerIds[0];
    const secondPlayerId = playerClub.squadPlayerIds[1];
    let gameState = addRatedMatches(baseState, firstPlayerId, [6.2]);
    const match = Object.values(gameState.matches)[0];
    match.report.playerStats[secondPlayerId] = playerStats(secondPlayerId, playerClub.id, "CM", 7.8);
    match.report.playerRatings[secondPlayerId] = {
      playerId: secondPlayerId,
      rating: 7.8,
      summary: "Strong.",
      positives: [],
      negatives: []
    };
    gameState = {
      ...gameState,
      matches: {
        ...gameState.matches,
        [match.id]: match
      }
    };

    const rows = sortMatchRatingRows(getMatchRatingRows(gameState, match, playerClub.id), { column: "rating", direction: "desc" });

    expect(rows[0].playerId).toBe(secondPlayerId);
    expect(rows[1].playerId).toBe(firstPlayerId);
  });
});
