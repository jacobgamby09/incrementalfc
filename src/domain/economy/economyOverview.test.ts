import { describe, expect, it } from "vitest";
import { generateGameState } from "../generation/generateGameState";
import { getEconomyOverview } from "./economyOverview";
import { processWeeklyFinances } from "./clubFinance";
import { startFacilityUpgrade } from "../facilities/facilityUpgrades";
import { submitNegotiationOffer } from "../transfers/transferWindow";
import { openTransferWindow } from "../season/seasonRollover";
import type { GameState } from "../types/game";
import type { Club } from "../types/club";

describe("Economy Overview & Integration", () => {
  it("computes dynamic wages and handles safe division-by-zero operating reserve", () => {
    const gameState = generateGameState();
    const clubId = gameState.playerClubId;
    const club = gameState.clubs[clubId];

    // Force zero wages & upkeep
    club.squadPlayerIds.forEach((pid) => {
      gameState.players[pid].contract.wagePerWeek = 0;
    });
    club.economy.staffWageTotal = 0;
    club.economy.facilityUpkeepTotal = 0;

    // Reset facility upkeep costs for this test
    Object.keys(club.facilities).forEach((key) => {
      const k = key as keyof typeof club.facilities;
      club.facilities[k].upkeepPerWeek = 0;
    });

    const overview = getEconomyOverview(gameState, clubId);
    expect(overview.weeklyExpenses).toBe(0);
    expect(overview.operatingReserveWeeks).toBe(99); // Safe division-by-zero
  });

  it("ensures forecast scenarios are ordered: conservative <= expected <= optimistic", () => {
    const gameState = generateGameState();
    const overview = getEconomyOverview(gameState);

    const [con, exp, opt] = overview.forecasts;
    expect(con.projectedBalance).toBeLessThanOrEqual(exp.projectedBalance);
    expect(exp.projectedBalance).toBeLessThanOrEqual(opt.projectedBalance);

    expect(con.projectedNet).toBeLessThanOrEqual(exp.projectedNet);
    expect(exp.projectedNet).toBeLessThanOrEqual(opt.projectedNet);
  });

  it("checks weekly operation transactions sum exactly to summary.netChange and gate receipt rules", () => {
    let gameState = generateGameState();
    const clubId = gameState.playerClubId;

    // Run offseason weekly finances (fixture is undefined, so gateReceipts will be 0)
    gameState = processWeeklyFinances(gameState);
    const club = gameState.clubs[clubId];
    const summary = club.economy.lastWeeklySummary;

    expect(summary).toBeDefined();
    const weekTransactions = club.economy.transactions.filter(
      (tx) => tx.seasonNumber === gameState.currentDate.seasonNumber && tx.week === gameState.currentDate.week
    );

    const transactionsSum = weekTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    expect(transactionsSum).toBe(summary!.netChange);

    // Verify away match does not record gate receipts in ledger
    const fixture = gameState.seasons[gameState.currentSeasonId].fixtures[0];
    // Force player club to be away
    fixture.homeClubId = "opponent_club";
    fixture.awayClubId = clubId;

    gameState = processWeeklyFinances(gameState, fixture);
    const awayClub = gameState.clubs[clubId];
    const hasGateReceipts = awayClub.economy.transactions.some(
      (tx) => tx.category === "gate_receipts" && tx.seasonNumber === gameState.currentDate.seasonNumber && tx.week === gameState.currentDate.week
    );
    expect(hasGateReceipts).toBe(false);

    // Verify home match records gate receipts in ledger
    // Force player club to be home
    fixture.homeClubId = clubId;
    fixture.awayClubId = "opponent_club";
    gameState = processWeeklyFinances(gameState, fixture);
    const homeClub = gameState.clubs[clubId];
    const homeGateReceiptsTx = homeClub.economy.transactions.find(
      (tx) => tx.category === "gate_receipts" && tx.seasonNumber === gameState.currentDate.seasonNumber && tx.week === gameState.currentDate.week
    );
    expect(homeGateReceiptsTx).toBeDefined();
    expect(homeGateReceiptsTx!.amount).toBeGreaterThan(0);
  });

  it("logs a negative construction transaction when starting a facility upgrade", () => {
    let gameState = generateGameState();
    const clubId = gameState.playerClubId;
    const club = gameState.clubs[clubId];

    // Give club plenty of cash to afford upgrade
    club.economy.cashBalance = 500000;

    gameState = startFacilityUpgrade(gameState, clubId, "trainingGround");
    const updatedClub = gameState.clubs[clubId];
    const upgradeTx = updatedClub.economy.transactions.find(
      (tx) => tx.category === "facility_construction"
    );

    expect(upgradeTx).toBeDefined();
    expect(upgradeTx!.amount).toBeLessThan(0);
    expect(upgradeTx!.description).toContain("Training Ground upgrade to level");
  });

  it("logs transfer purchases and sales for buyer and seller clubs correctly and skips free agents/renewals", () => {
    let gameState = generateGameState();
    const clubId = gameState.playerClubId;
    const playerClub = gameState.clubs[clubId];

    // Ensure player has cash
    playerClub.economy.cashBalance = 1000000;

    // Pick a player belonging to another AI club and force list them for the test
    const listedPlayer = Object.values(gameState.players).find(
      (p) => p.clubId && p.clubId !== clubId
    );

    expect(listedPlayer).toBeDefined();
    listedPlayer!.transferIntent = {
      isListed: true,
      listingReason: "excess_squad",
      askingPrice: 50000,
      interestLevel: 60
    };
    gameState.transferMarket.listedPlayerIds = [listedPlayer!.id];

    const sellerClubId = listedPlayer!.clubId!;
    const sellerClub = gameState.clubs[sellerClubId];
    sellerClub.economy.cashBalance = 100000;

    // Force phase to transfer window and status to open
    gameState.currentDate.phase = "transferWindow";
    gameState.transferMarket.status = "open";
    gameState.transferMarket.actionsRemaining = 5;

    // Submit an offer for the listed player (forcing it to be accepted with premium package)
    gameState = submitNegotiationOffer(gameState, {
      playerId: listedPlayer!.id,
      kind: "signing",
      packageId: "statement",
      offeredSquadRole: "key_player",
      contractSeasons: 3
    });

    const updatedPlayerClub = gameState.clubs[clubId];
    const updatedSellerClub = gameState.clubs[sellerClubId];

    // Purchase check
    const purchaseTx = updatedPlayerClub.economy.transactions.find(
      (tx) => tx.category === "transfer_purchase"
    );
    expect(purchaseTx).toBeDefined();
    expect(purchaseTx!.amount).toBeLessThan(0);
    expect(purchaseTx!.description).toContain(listedPlayer!.firstName);

    // Sale check on AI club
    const saleTx = updatedSellerClub.economy.transactions.find(
      (tx) => tx.category === "transfer_sale"
    );
    expect(saleTx).toBeDefined();
    expect(saleTx!.amount).toBeGreaterThan(0);
    expect(saleTx!.description).toContain(listedPlayer!.firstName);

    // Verify contract renewal does not log transaction
    const transactionsCountBeforeRenewal = updatedPlayerClub.economy.transactions.length;
    const squadPlayerId = updatedPlayerClub.squadPlayerIds[0];
    gameState.transferMarket.actionsRemaining = 5;
    gameState = submitNegotiationOffer(gameState, {
      playerId: squadPlayerId,
      kind: "renewal",
      packageId: "fair",
      offeredSquadRole: "key_player",
      contractSeasons: 3
    });

    const afterRenewalClub = gameState.clubs[clubId];
    const renewalNewTxs = afterRenewalClub.economy.transactions.slice(transactionsCountBeforeRenewal);
    // Since renewal is a contract extension, no purchase/sale fee transaction should exist
    expect(renewalNewTxs.length).toBe(0);

    // Verify free agent signing does not log transfer transaction
    const transactionsCountBeforeFreeAgent = afterRenewalClub.economy.transactions.length;
    
    // Create a mock free agent from an existing AI player
    const playerToMakeFree = Object.values(gameState.players).find(
      (p) => p.clubId && p.clubId !== clubId && p.id !== listedPlayer!.id
    );
    expect(playerToMakeFree).toBeDefined();
    
    const freeAgent = {
      ...playerToMakeFree!,
      clubId: null,
      transferIntent: {
        isListed: false,
        askingPrice: 0,
        interestLevel: 70
      }
    };
    gameState.players[freeAgent.id] = freeAgent;
    
    const originalClubId = playerToMakeFree!.clubId!;
    gameState.clubs[originalClubId].squadPlayerIds = gameState.clubs[originalClubId].squadPlayerIds.filter(
      (pid) => pid !== freeAgent.id
    );
    
    gameState.transferMarket.freeAgentPlayerIds = [freeAgent.id];
    gameState.transferMarket.actionsRemaining = 5;
    gameState = submitNegotiationOffer(gameState, {
      playerId: freeAgent.id,
      kind: "signing",
      packageId: "fair",
      offeredSquadRole: "key_player",
      contractSeasons: 3
    });

    const afterFreeAgentClub = gameState.clubs[clubId];
    const freeAgentNewTxs = afterFreeAgentClub.economy.transactions.slice(transactionsCountBeforeFreeAgent);
    expect(freeAgentNewTxs.length).toBe(0);
  });

  it("creates separate ledger entries for rollover rewards (participation, champion, promotion) and does not mutate original transactions array", () => {
    let gameState = generateGameState();
    const clubId = gameState.playerClubId;
    const club = gameState.clubs[clubId];

    // Setup dummy transaction to test immutability
    club.economy.transactions = [
      { id: "dummy", seasonNumber: 1, week: 1, category: "baseline_income", amount: 6500, description: "Dummy" }
    ];
    const originalTransactionsReference = club.economy.transactions;

    // Force post-season phase and complete the season
    gameState.currentDate.phase = "postseason";
    const currentSeason = gameState.seasons[gameState.currentSeasonId];
    currentSeason.status = "completed";

    // Force standings to place player club first (rank 0), triggering champion and promotion payouts
    currentSeason.table.forEach((entry) => {
      if (entry.clubId === clubId) {
        entry.points = 100;
      } else {
        entry.points = 10;
      }
    });

    // Play/Rollover season (openTransferWindow handles season rollover changes)
    gameState = openTransferWindow(gameState);

    const updatedClub = gameState.clubs[clubId];
    // Immutability Check
    expect(originalTransactionsReference.length).toBe(1); // Didn't mutate original array!
    expect(updatedClub.economy.transactions.length).toBeGreaterThan(1);

    // Check separate prize records
    const participationTx = updatedClub.economy.transactions.find(
      (tx) => tx.category === "participation_prize"
    );
    expect(participationTx).toBeDefined();
    expect(participationTx!.amount).toBeGreaterThan(0);
    expect(participationTx!.description).toBe("League participation prize");

    const championTx = updatedClub.economy.transactions.find(
      (tx) => tx.category === "champion_prize"
    );
    expect(championTx).toBeDefined();
    expect(championTx!.amount).toBeGreaterThan(0);
    expect(championTx!.description).toBe("League champion title prize");

    const promotionTx = updatedClub.economy.transactions.find(
      (tx) => tx.category === "promotion_bonus"
    );
    expect(promotionTx).toBeDefined();
    expect(promotionTx!.amount).toBeGreaterThan(0);
    expect(promotionTx!.description).toBe("League promotion bonus");
  });
});
