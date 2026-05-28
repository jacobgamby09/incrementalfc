import { describe, expect, it } from "vitest";
import { lowestLeagueStatRange } from "../../data/constants/leagueProfiles";
import { generateGameState } from "../generation/generateGameState";
import { generatePlayer } from "../generation/generatePlayer";
import { autoSelectLineup } from "../lineup/selectLineup";
import { playMatchday } from "../season/playMatchday";
import type { Player } from "../types/player";
import { isGoalkeeperStats } from "../types/player";
import {
  applyDevelopmentXp,
  calculateMatchXp,
  getDevelopmentCap,
  getRecentStatDelta,
  getPlayerDevelopmentSummary,
  runTraining
} from "./playerDevelopment";

function playerWithAgeStage(stage: Player["development"]["ageCurveStage"]): Player {
  const player = generatePlayer({ clubId: "club", position: "ST", statRange: lowestLeagueStatRange, kitNumber: 9 });
  return {
    ...player,
    development: {
      ...player.development,
      ageCurveStage: stage,
      developmentRate: 1
    }
  };
}

describe("player development", () => {
  it("awards more match XP for higher ratings and faster age curves", () => {
    const youth = playerWithAgeStage("youth");
    const prime = playerWithAgeStage("prime");

    const highRatingXp = calculateMatchXp({ player: youth, rating: 8, minutes: 90, opponentReputation: 14, ownReputation: 12 });
    const lowRatingXp = calculateMatchXp({ player: youth, rating: 5.8, minutes: 90, opponentReputation: 14, ownReputation: 12 });
    const primeXp = calculateMatchXp({ player: prime, rating: 8, minutes: 90, opponentReputation: 14, ownReputation: 12 });

    expect(highRatingXp).toBeGreaterThan(lowRatingXp);
    expect(highRatingXp).toBeGreaterThan(primeXp);
  });

  it("prevents stat growth above personal potential and facility cap", () => {
    const player = generatePlayer({ clubId: "club", position: "ST", statRange: lowestLeagueStatRange, kitNumber: 9 });
    player.currentStats = { PAS: 5, SHO: 9, TAC: 5, CRO: 5, HEA: 5, ACC: 5, TEC: 5, PHY: 5, MEN: 5 };
    player.potentialStats = { PAS: 5, SHO: 12, TAC: 5, CRO: 5, HEA: 5, ACC: 5, TEC: 5, PHY: 5, MEN: 5 };

    const developed = applyDevelopmentXp({ player, xpGained: 1000, developmentCap: 10, source: "training" });

    expect(isGoalkeeperStats(developed.currentStats)).toBe(false);
    if (isGoalkeeperStats(developed.currentStats)) throw new Error("Expected outfield stats");
    expect(developed.currentStats.SHO).toBeLessThanOrEqual(10);
  });

  it("marks facility and potential caps in development summary", () => {
    const gameState = generateGameState();
    const club = gameState.clubs[gameState.playerClubId];
    const player = gameState.players[club.squadPlayerIds.find((playerId) => gameState.players[playerId].primaryPosition === "ST")!];
    player.currentStats = { PAS: 5, SHO: 10, TAC: 5, CRO: 5, HEA: 5, ACC: 5, TEC: 5, PHY: 5, MEN: 5 };
    player.potentialStats = { PAS: 5, SHO: 14, TAC: 5, CRO: 5, HEA: 5, ACC: 5, TEC: 5, PHY: 5, MEN: 5 };

    const summary = getPlayerDevelopmentSummary(player, club);

    expect(summary.developmentCap).toBe(10);
    expect(summary.cappedByFacility).toBe(true);
    expect(summary.untappedPotential).toBe(true);

    player.potentialStats = { ...player.currentStats };
    expect(getPlayerDevelopmentSummary(player, club).cappedByPotential).toBe(true);
  });

  it("awards training XP after matchday and no match XP to non-squad players", () => {
    const gameState = generateGameState();
    const playerClub = gameState.clubs[gameState.playerClubId];
    const freePlayer = generatePlayer({ clubId: "free_agents", position: "ST", statRange: lowestLeagueStatRange, kitNumber: 99 });
    const stateWithFreePlayer = {
      ...gameState,
      players: {
        ...gameState.players,
        [freePlayer.id]: {
          ...freePlayer,
          clubId: null
        }
      }
    };
    const fixture = gameState.seasons[gameState.currentSeasonId].fixtures.find(
      (candidate) => candidate.homeClubId === playerClub.id || candidate.awayClubId === playerClub.id
    )!;
    const lineup = autoSelectLineup(playerClub, gameState, playerClub.tactics.activeTactic);

    const result = playMatchday({
      gameState: stateWithFreePlayer,
      fixtureId: fixture.id,
      playerLineup: lineup,
      playerTactic: playerClub.tactics.activeTactic,
      rng: () => 0.42
    });
    const starter = result.gameState.players[lineup.starters[0].playerId];
    const nonSquadPlayer = result.gameState.players[freePlayer.id];
    const match = result.gameState.matches[result.playerMatchId];

    expect(starter.development.matchXp).toBeGreaterThan(0);
    expect(nonSquadPlayer.development.lastMatchXpGained).toBe(0);
    expect(starter.development.lastTrainingXpGained).toBeGreaterThan(0);
    expect(Object.keys(match.rewards.trainingXp ?? {})).toHaveLength(playerClub.squadPlayerIds.length);
  });

  it("runTraining awards stable squad XP from training ground level", () => {
    const gameState = generateGameState();
    const club = gameState.clubs[gameState.playerClubId];
    const result = runTraining(gameState, club);

    expect(Object.keys(result.trainingXpByPlayerId)).toHaveLength(club.squadPlayerIds.length);
    expect(getDevelopmentCap(club)).toBe(10);
  });

  it("formats recent stat deltas for increases, declines, and unchanged stats", () => {
    const growth = [
      { statKey: "ACC", from: 8, to: 9, source: "training" as const },
      { statKey: "PHY", from: 7, to: 6, source: "training" as const }
    ];

    expect(getRecentStatDelta(growth, "ACC")).toEqual({
      amount: 1,
      direction: "increase",
      label: "↑ +1"
    });
    expect(getRecentStatDelta(growth, "PHY")).toEqual({
      amount: -1,
      direction: "decline",
      label: "↓ -1"
    });
    expect(getRecentStatDelta(growth, "SHO")).toBeUndefined();
  });
});
