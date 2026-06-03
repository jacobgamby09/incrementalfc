import { describe, expect, it } from "vitest";
import { generateGameState } from "../generation/generateGameState";
import { autoSelectLineup } from "../lineup/selectLineup";
import { playMatchday } from "../season/playMatchday";
import { getMatchDevelopmentSummary } from "./developmentPresentation";
import { getPlayerCapStatus, getPlayerDevelopmentSummary } from "./playerDevelopment";

describe("development presentation", () => {
  it("summarizes matchday XP, banked progress, growth, and caps", () => {
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
      rng: () => 0.42
    });
    const match = result.gameState.matches[result.playerMatchId];
    const summary = getMatchDevelopmentSummary(result.gameState, match);

    expect(summary.totalMatchXp).toBeGreaterThan(0);
    expect(summary.totalTrainingXp).toBeGreaterThan(0);
    expect(summary.tacticalFamiliarityGained).toBeGreaterThan(0);
    expect(summary.topXpGainers.length).toBeGreaterThan(0);
    expect(summary.topXpGainers[0].reasonText.length).toBeGreaterThan(0);
    expect(summary.bankedProgressPlayers.length).toBeGreaterThan(0);
    expect(summary.bankedProgressLabel).toBe("Progress Banked Toward Next Development Point");
    if (summary.improvedPlayers.length === 0) {
      expect(summary.noGrowthMessage).toBe("Progress was banked. Assign earned development points from Training, Squad, or the player sheet.");
    }
  });

  it("exposes per-stat progress rows and exact development status labels", () => {
    const gameState = generateGameState();
    const club = gameState.clubs[gameState.playerClubId];
    const player = gameState.players[club.squadPlayerIds[0]];
    const summary = getPlayerDevelopmentSummary(player, club);

    expect(summary.statRows.length).toBeGreaterThan(0);
    expect(summary.statRows[0]).toEqual(expect.objectContaining({
      statKey: expect.any(String),
      current: expect.any(Number),
      potential: expect.any(Number),
      facilityCap: expect.any(Number),
      progressPercent: expect.any(Number),
      capStatus: expect.any(String)
    }));
    expect(["Developing", "Facility limited", "Potential reached", "Declining"]).toContain(getPlayerCapStatus(player, club));
  });

  it("summarizes noisy cap notices and keeps a short example list", () => {
    const gameState = generateGameState();
    const club = gameState.clubs[gameState.playerClubId];
    const players = { ...gameState.players };
    for (const playerId of club.squadPlayerIds.slice(0, 6)) {
      const player = players[playerId];
      players[playerId] = {
        ...player,
        currentStats: Object.fromEntries(Object.keys(player.currentStats).map((key) => [key, 10])) as typeof player.currentStats,
        potentialStats: Object.fromEntries(Object.keys(player.potentialStats).map((key) => [key, 14])) as typeof player.potentialStats
      };
    }
    const stateWithCaps = { ...gameState, players };
    const fixture = stateWithCaps.seasons[stateWithCaps.currentSeasonId].fixtures.find(
      (candidate) => candidate.homeClubId === club.id || candidate.awayClubId === club.id
    )!;
    const lineup = autoSelectLineup(club, stateWithCaps, club.tactics.activeTactic);
    const result = playMatchday({
      gameState: stateWithCaps,
      fixtureId: fixture.id,
      playerLineup: lineup,
      playerTactic: club.tactics.activeTactic,
      rng: () => 0.42
    });

    const summary = getMatchDevelopmentSummary(result.gameState, result.gameState.matches[result.playerMatchId]);

    expect(summary.capSummaries.some((text) => text.includes("players are limited by the current Training Ground"))).toBe(true);
    expect(summary.capWarningExamples.length).toBeLessThanOrEqual(4);
    expect(summary.capWarnings.length).toBeGreaterThanOrEqual(summary.capWarningExamples.length);
  });

  it("adds development point badges to top XP gainers", () => {
    const gameState = generateGameState();
    const club = gameState.clubs[gameState.playerClubId];
    const playerId = club.squadPlayerIds[0];
    const fixture = gameState.seasons[gameState.currentSeasonId].fixtures.find(
      (candidate) => candidate.homeClubId === club.id || candidate.awayClubId === club.id
    )!;
    const lineup = autoSelectLineup(club, gameState, club.tactics.activeTactic);
    const result = playMatchday({
      gameState,
      fixtureId: fixture.id,
      playerLineup: lineup,
      playerTactic: club.tactics.activeTactic,
      rng: () => 0.42
    });
    const playerWithPoint = {
      ...result.gameState.players[playerId],
      development: {
        ...result.gameState.players[playerId].development,
        lastDevelopmentPointsGained: 1
      }
    };
    const stateWithPoint = {
      ...result.gameState,
      players: {
        ...result.gameState.players,
        [playerId]: playerWithPoint
      }
    };
    const match = {
      ...result.gameState.matches[result.playerMatchId],
      rewards: {
        ...result.gameState.matches[result.playerMatchId].rewards,
        playerXp: {
          ...result.gameState.matches[result.playerMatchId].rewards.playerXp,
          [playerId]: {
            ...result.gameState.matches[result.playerMatchId].rewards.playerXp[playerId],
            matchXp: 999
          }
        },
        statGrowth: [{
          playerId,
          playerName: "Test Player",
          matchXp: 999,
          trainingXp: 0,
          statGrowth: [{ statKey: "CRO", from: 3, to: 4, source: "match" as const, matchId: result.playerMatchId }],
          notes: []
        }]
      }
    };

    const summary = getMatchDevelopmentSummary(stateWithPoint, match);

    expect(summary.topXpGainers[0].playerId).toBe(playerId);
    expect(summary.topXpGainers[0].statIncreaseBadges).toEqual(["+1 Development Point", "+1 CRO"]);
  });
});
