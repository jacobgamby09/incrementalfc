import { describe, expect, it } from "vitest";
import { autoSelectLineup } from "../lineup/selectLineup";
import { generateGameState } from "../generation/generateGameState";
import { sortTableCanonically } from "../league/leagueTableView";
import {
  advanceTransferWeek,
  listPlayerForSale,
  respondToIncomingTransferOffer,
  submitNegotiationOffer
} from "../transfers/transferWindow";
import type { GameState } from "../types/game";
import type { RandomSource } from "../../utils/random";
import { finalizeTransferWindow, openTransferWindow } from "./seasonRollover";
import { playMatchday } from "./playMatchday";

function seededRandom(seed: number): RandomSource {
  let value = seed >>> 0;
  return () => {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0;
    return value / 4_294_967_296;
  };
}

function playCurrentSeason(gameState: GameState, rng: RandomSource): GameState {
  let nextState = gameState;
  while (nextState.seasons[nextState.currentSeasonId].status === "active") {
    const season = nextState.seasons[nextState.currentSeasonId];
    const fixture = season.fixtures.find(
      (candidate) =>
        candidate.matchday === season.currentMatchday &&
        candidate.status === "scheduled" &&
        (candidate.homeClubId === nextState.playerClubId || candidate.awayClubId === nextState.playerClubId)
    );
    if (!fixture) {
      throw new Error(
        `Player fixture was not found for season ${season.seasonNumber}, matchday ${season.currentMatchday}. ` +
        `Active clubs: ${season.clubIds.length}. Player club included: ${season.clubIds.includes(nextState.playerClubId)}.`
      );
    }
    const club = nextState.clubs[nextState.playerClubId];
    const tactic = club.tactics.activeTactic;
    const lineup = autoSelectLineup(club, nextState, tactic);
    nextState = playMatchday({
      gameState: nextState,
      fixtureId: fixture.id,
      playerLineup: lineup,
      playerTactic: tactic,
      rng
    }).gameState;
  }
  return nextState;
}

function renewExpiredContracts(gameState: GameState): GameState {
  let nextState = gameState;
  const club = nextState.clubs[nextState.playerClubId];
  for (const playerId of club.squadPlayerIds) {
    if (nextState.players[playerId].contract.seasonsRemaining > 0) continue;
    nextState = submitNegotiationOffer(nextState, {
      playerId,
      kind: "renewal",
      packageId: "statement",
      offeredSquadRole: nextState.players[playerId].squadRole,
      contractSeasons: 3
    });
  }
  return nextState;
}

function tryCompleteOneSale(gameState: GameState, rng: RandomSource): {
  gameState: GameState;
  saleCompleted: boolean;
} {
  const club = gameState.clubs[gameState.playerClubId];
  const candidateId = club.squadPlayerIds.find(
    (playerId) => gameState.players[playerId].contract.seasonsRemaining > 0
  );
  if (!candidateId || club.squadPlayerIds.length <= 12) {
    return { gameState, saleCompleted: false };
  }
  let nextState = listPlayerForSale(gameState, candidateId, "quick_sale", rng);
  let offer = nextState.transferMarket.incomingOffers.find(
    (candidate) => candidate.playerId === candidateId && candidate.status === "pending"
  );
  while (!offer && nextState.transferMarket.currentWeek < nextState.transferMarket.totalWeeks) {
    nextState = advanceTransferWeek(nextState, rng);
    offer = nextState.transferMarket.incomingOffers.find(
      (candidate) => candidate.playerId === candidateId && candidate.status === "pending"
    );
  }
  if (!offer) return { gameState: nextState, saleCompleted: false };
  return {
    gameState: respondToIncomingTransferOffer(nextState, offer.id, "accept"),
    saleCompleted: true
  };
}

function simulateFiveSeasonSave(seed: number, sellPlayers: boolean) {
  const rng = seededRandom(seed);
  let gameState = generateGameState(rng);
  const seasons: Array<Record<string, number | string>> = [];
  let salesCompleted = 0;

  for (let seasonIndex = 0; seasonIndex < 5; seasonIndex += 1) {
    gameState = playCurrentSeason(gameState, rng);
    const season = gameState.seasons[gameState.currentSeasonId];
    const table = sortTableCanonically(season.table);
    const club = gameState.clubs[gameState.playerClubId];
    const playerRank = table.findIndex((entry) => entry.clubId === club.id) + 1;
    const playerEntry = table.find((entry) => entry.clubId === club.id)!;
    const allMatches = season.fixtures
      .map((fixture) => fixture.matchId ? gameState.matches[fixture.matchId] : undefined)
      .filter(Boolean);
    const totalGoals = allMatches.reduce(
      (sum, match) => sum + match!.result.homeGoals + match!.result.awayGoals,
      0
    );
    const playerSquad = club.squadPlayerIds.map((playerId) => gameState.players[playerId]);
    seasons.push({
      seed,
      scenario: sellPlayers ? "sell one player yearly" : "renew only",
      season: season.seasonNumber,
      league: gameState.leagues[season.leagueId].name,
      rank: playerRank,
      points: playerEntry.points,
      goalsPerMatch: Number((totalGoals / allMatches.length).toFixed(2)),
      cash: club.economy.cashBalance,
      squad: playerSquad.length,
      averageReadiness: Math.round(
        playerSquad.reduce((sum, player) => sum + player.status.fitness, 0) / playerSquad.length
      )
    });

    if (seasonIndex === 4) break;
    gameState = openTransferWindow(gameState, rng);
    gameState = renewExpiredContracts(gameState);
    if (sellPlayers) {
      const sale = tryCompleteOneSale(gameState, rng);
      gameState = sale.gameState;
      salesCompleted += sale.saleCompleted ? 1 : 0;
    }
    gameState = finalizeTransferWindow(gameState);
  }

  return { gameState, seasons, salesCompleted };
}

describe("Phase 4 multi-season diagnostics", () => {
  it("keeps complete saves playable through five seasons with offseason renewals and sales", () => {
    const simulations = [501, 502, 503].flatMap((seed) => [
      simulateFiveSeasonSave(seed, false),
      simulateFiveSeasonSave(seed, true)
    ]);
    const rows = simulations.flatMap((simulation) => simulation.seasons);
    console.table(rows);
    console.table(simulations.map((simulation, index) => ({
      seed: simulation.seasons[0].seed,
      scenario: simulation.seasons[0].scenario,
      completedSeasons: simulation.seasons.length,
      completedSales: simulation.salesCompleted,
      finalCash: simulation.gameState.clubs[simulation.gameState.playerClubId].economy.cashBalance,
      finalSquad: simulation.gameState.clubs[simulation.gameState.playerClubId].squadPlayerIds.length
    })));

    expect(rows).toHaveLength(30);
    expect(rows.every((row) => Number(row.goalsPerMatch) > 0.7 && Number(row.goalsPerMatch) < 4.2)).toBe(true);
    expect(rows.every((row) => Number(row.cash) >= 0)).toBe(true);
    expect(rows.every((row) => Number(row.squad) >= 11)).toBe(true);
    expect(simulations.filter((simulation) => simulation.seasons[0].scenario === "sell one player yearly")
      .every((simulation) => simulation.salesCompleted > 0)).toBe(true);
  });
});
