import { describe, expect, it } from "vitest";
import { generateGameState } from "../generation/generateGameState";
import { finalizeTransferWindow, openTransferWindow, rollOverSeason } from "../season/seasonRollover";
import type { GameState } from "../types/game";
import {
  advanceTransferWeek,
  listPlayerForSale,
  removePlayerListing,
  respondToIncomingTransferOffer,
  submitNegotiationOffer
} from "./transferWindow";

function seededRng(seed = 42): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function completedSeasonState(): GameState {
  const gameState = generateGameState(seededRng());
  const season = gameState.seasons[gameState.currentSeasonId];
  return {
    ...gameState,
    seasons: {
      ...gameState.seasons,
      [season.id]: {
        ...season,
        status: "completed"
      }
    }
  };
}

describe("offseason transfer window", () => {
  it("opens as a staged offseason before the next season becomes playable", () => {
    const nextState = openTransferWindow(completedSeasonState(), seededRng(1));
    const nextSeason = nextState.seasons[nextState.currentSeasonId];

    expect(nextState.currentDate.phase).toBe("transferWindow");
    expect(nextState.transferMarket.status).toBe("open");
    expect(nextState.transferMarket.currentWeek).toBe(1);
    expect(nextState.transferMarket.totalWeeks).toBe(3);
    expect(nextState.transferMarket.actionsRemaining).toBe(5);
    expect(nextSeason.status).toBe("pending");
  });

  it("advances transfer weeks immutably without moving beyond the configured window", () => {
    const openedState = openTransferWindow(completedSeasonState(), seededRng(2));
    const weekTwoState = advanceTransferWeek(openedState);
    const weekThreeState = advanceTransferWeek(weekTwoState);
    const cappedState = advanceTransferWeek(weekThreeState);

    expect(openedState.transferMarket.currentWeek).toBe(1);
    expect(weekTwoState.transferMarket.currentWeek).toBe(2);
    expect(weekThreeState.transferMarket.currentWeek).toBe(3);
    expect(cappedState).toBe(weekThreeState);
  });

  it("finalizes the window and unlocks the prepared season", () => {
    const openedState = openTransferWindow(completedSeasonState(), seededRng(3));
    const nextState = finalizeTransferWindow(openedState);
    const nextSeason = nextState.seasons[nextState.currentSeasonId];

    expect(nextState.currentDate.phase).toBe("regularSeason");
    expect(nextState.transferMarket.status).toBe("closed");
    expect(nextState.transferMarket.currentWeek).toBe(0);
    expect(nextState.transferMarket.actionsRemaining).toBe(0);
    expect(nextSeason.status).toBe("active");
  });

  it("keeps the one-call rollover helper for diagnostics", () => {
    const nextState = rollOverSeason(completedSeasonState(), seededRng(4));

    expect(nextState.currentDate.phase).toBe("regularSeason");
    expect(nextState.seasons[nextState.currentSeasonId].status).toBe("active");
  });

  it("keeps player-club expired contracts available for a final renewal decision", () => {
    const gameState = completedSeasonState();
    const playerClub = gameState.clubs[gameState.playerClubId];
    const expiringPlayerId = playerClub.squadPlayerIds[0];
    gameState.players[expiringPlayerId].contract.seasonsRemaining = 1;

    const nextState = openTransferWindow(gameState, seededRng(5));

    expect(nextState.players[expiringPlayerId].contract.seasonsRemaining).toBe(0);
    expect(nextState.players[expiringPlayerId].clubId).toBe(playerClub.id);
    expect(nextState.clubs[playerClub.id].squadPlayerIds).toContain(expiringPlayerId);
    expect(nextState.transferMarket.freeAgentPlayerIds).not.toContain(expiringPlayerId);
    expect(() => finalizeTransferWindow(nextState)).toThrow(/must be renewed/);
  });

  it("spends one action and signs an interested free agent with an accepted statement package", () => {
    const openedState = openTransferWindow(completedSeasonState(), seededRng(6));
    const freeAgentId = openedState.transferMarket.freeAgentPlayerIds[0];
    const freeAgent = openedState.players[freeAgentId];
    freeAgent.transferIntent.interestLevel = 100;

    const nextState = submitNegotiationOffer(openedState, {
      playerId: freeAgentId,
      kind: "signing",
      packageId: "statement",
      offeredSquadRole: "regular_starter",
      contractSeasons: 3
    });

    expect(nextState.transferMarket.actionsRemaining).toBe(openedState.transferMarket.actionsRemaining - 1);
    expect(nextState.players[freeAgentId].clubId).toBe(nextState.playerClubId);
    expect(nextState.clubs[nextState.playerClubId].squadPlayerIds).toContain(freeAgentId);
    expect(nextState.transferMarket.freeAgentPlayerIds).not.toContain(freeAgentId);
    expect(nextState.transferMarket.negotiations[`signing_${freeAgentId}`].status).toBe("accepted");
  });

  it("lets repeated lowball offers collapse negotiations", () => {
    const openedState = openTransferWindow(completedSeasonState(), seededRng(7));
    const freeAgentId = openedState.transferMarket.freeAgentPlayerIds[0];
    openedState.players[freeAgentId].transferIntent.interestLevel = 0;
    const input = {
      playerId: freeAgentId,
      kind: "signing" as const,
      packageId: "lowball" as const,
      offeredSquadRole: "backup" as const,
      contractSeasons: 1
    };

    const firstOffer = submitNegotiationOffer(openedState, input);
    const collapsedState = submitNegotiationOffer(firstOffer, input);

    expect(firstOffer.transferMarket.negotiations[`signing_${freeAgentId}`].status).toBe("active");
    expect(collapsedState.transferMarket.negotiations[`signing_${freeAgentId}`].status).toBe("collapsed");
    expect(collapsedState.players[freeAgentId].clubId).toBeNull();
  });

  it("renews an existing player contract without a transfer fee", () => {
    const openedState = openTransferWindow(completedSeasonState(), seededRng(8));
    const playerId = openedState.clubs[openedState.playerClubId].squadPlayerIds[0];
    openedState.players[playerId].status.morale = 100;
    const cashBefore = openedState.clubs[openedState.playerClubId].economy.cashBalance;
    const actionsBefore = openedState.transferMarket.actionsRemaining;

    const nextState = submitNegotiationOffer(openedState, {
      playerId,
      kind: "renewal",
      packageId: "statement",
      offeredSquadRole: "key_player",
      contractSeasons: 3
    });

    expect(nextState.players[playerId].contract.seasonsRemaining).toBe(3);
    expect(nextState.players[playerId].squadRole).toBe("key_player");
    expect(nextState.clubs[nextState.playerClubId].economy.cashBalance).toBe(cashBefore);
    expect(nextState.transferMarket.actionsRemaining).toBe(actionsBefore);
    expect(nextState.transferMarket.negotiations[`renewal_${playerId}`].status).toBe("accepted");
  });

  it("allows contract renewals after all transfer actions have been spent", () => {
    const openedState = openTransferWindow(completedSeasonState(), seededRng(9));
    const playerId = openedState.clubs[openedState.playerClubId].squadPlayerIds[0];
    openedState.transferMarket.actionsRemaining = 0;
    openedState.players[playerId].status.morale = 100;

    const nextState = submitNegotiationOffer(openedState, {
      playerId,
      kind: "renewal",
      packageId: "statement",
      offeredSquadRole: "key_player",
      contractSeasons: 2
    });

    expect(nextState.players[playerId].contract.seasonsRemaining).toBe(2);
    expect(nextState.transferMarket.actionsRemaining).toBe(0);
  });

  it("lists a player with a config-driven asking price and can attract an immediate AI offer", () => {
    const openedState = openTransferWindow(completedSeasonState(), seededRng(10));
    const playerId = openedState.clubs[openedState.playerClubId].squadPlayerIds[0];
    const player = openedState.players[playerId];

    const nextState = listPlayerForSale(openedState, playerId, "quick_sale", () => 0);

    expect(nextState.players[playerId].transferIntent).toMatchObject({
      isListed: true,
      listingReason: "player_listed",
      saleStrategy: "quick_sale",
      askingPrice: Math.round(player.contract.marketValue * 0.85)
    });
    expect(nextState.transferMarket.incomingOffers).toHaveLength(1);
    expect(nextState.transferMarket.incomingOffers[0]).toMatchObject({
      playerId,
      sellingClubId: openedState.playerClubId,
      strategy: "quick_sale",
      status: "pending"
    });
  });

  it("accepts an incoming AI offer without spending an action and records both sides of the transfer", () => {
    const openedState = openTransferWindow(completedSeasonState(), seededRng(11));
    const sellerId = openedState.playerClubId;
    const playerId = openedState.clubs[sellerId].squadPlayerIds[0];
    const listedState = listPlayerForSale(openedState, playerId, "market_price", () => 0);
    const offer = listedState.transferMarket.incomingOffers[0];
    const sellerCashBefore = listedState.clubs[sellerId].economy.cashBalance;
    const buyerCashBefore = listedState.clubs[offer.buyingClubId].economy.cashBalance;
    const actionsBefore = listedState.transferMarket.actionsRemaining;

    const nextState = respondToIncomingTransferOffer(listedState, offer.id, "accept");

    expect(nextState.players[playerId].clubId).toBe(offer.buyingClubId);
    expect(nextState.players[playerId].transferIntent.isListed).toBe(false);
    expect(nextState.clubs[sellerId].squadPlayerIds).not.toContain(playerId);
    expect(nextState.clubs[offer.buyingClubId].squadPlayerIds).toContain(playerId);
    expect(nextState.clubs[sellerId].economy.cashBalance).toBe(sellerCashBefore + offer.amount);
    expect(nextState.clubs[offer.buyingClubId].economy.cashBalance).toBe(buyerCashBefore - offer.amount);
    const sellerTransactions = nextState.clubs[sellerId].economy.transactions;
    const buyerTransactions = nextState.clubs[offer.buyingClubId].economy.transactions;
    expect(sellerTransactions[sellerTransactions.length - 1]?.category).toBe("transfer_sale");
    expect(buyerTransactions[buyerTransactions.length - 1]?.category).toBe("transfer_purchase");
    expect(nextState.transferMarket.actionsRemaining).toBe(actionsBefore);
  });

  it("expires pending offers when a listing is removed", () => {
    const openedState = openTransferWindow(completedSeasonState(), seededRng(12));
    const playerId = openedState.clubs[openedState.playerClubId].squadPlayerIds[0];
    const listedState = listPlayerForSale(openedState, playerId, "market_price", () => 0);

    const nextState = removePlayerListing(listedState, playerId);

    expect(nextState.players[playerId].transferIntent.isListed).toBe(false);
    expect(nextState.transferMarket.incomingOffers[0].status).toBe("expired");
  });

  it("prevents sales that would leave fewer than eleven contracted players", () => {
    const openedState = openTransferWindow(completedSeasonState(), seededRng(13));
    const club = openedState.clubs[openedState.playerClubId];
    club.squadPlayerIds = club.squadPlayerIds.slice(0, 11);

    expect(() => listPlayerForSale(openedState, club.squadPlayerIds[0], "quick_sale", () => 0))
      .toThrow(/at least 11 contracted players/i);
  });
});
