import { economyProfile } from "../../data/constants/economyProfiles";
import { getTotalFacilityUpkeep } from "../../data/constants/facilityProfiles";
import type { Club } from "../types/club";
import type { WeeklyFinanceSummary } from "../types/economy";
import type { GameState } from "../types/game";
import type { Fixture } from "../types/league";
import { calculateStadiumAttendance } from "./stadiumAttendance";
import { appendFinanceTransactions } from "./financeLedger";

function playerWagesForClub(gameState: GameState, club: Club): number {
  return club.squadPlayerIds.reduce((sum, playerId) => sum + (gameState.players[playerId]?.contract.wagePerWeek ?? 0), 0);
}

export function calculateWeeklyFinanceSummary(
  gameState: GameState,
  clubId: string,
  fixture?: Fixture,
  resultBonus = 0
): WeeklyFinanceSummary {
  const club = gameState.clubs[clubId];
  const isHome = fixture?.homeClubId === clubId;
  const isAway = fixture?.awayClubId === clubId;
  const opponentId = isHome ? fixture?.awayClubId : fixture?.homeClubId;
  const attendance = isHome ? calculateStadiumAttendance(club, opponentId ? gameState.clubs[opponentId] : undefined) : undefined;
  const playerWages = playerWagesForClub(gameState, club);
  const facilityUpkeep = getTotalFacilityUpkeep(club.facilities);
  const baselineIncome = economyProfile.weeklyBaselineIncome;
  const gateReceipts = attendance?.gateReceipts ?? 0;
  const staffWages = club.economy.staffWageTotal !== undefined ? club.economy.staffWageTotal : economyProfile.staffWagePlaceholder;
  const netChange = baselineIncome + gateReceipts + resultBonus - playerWages - staffWages - facilityUpkeep;
  const rawCash = club.economy.cashBalance + netChange;
  const warnings = rawCash < 0 ? ["Cash reserves were exhausted. Spending is blocked until the club returns to a positive balance."] : [];

  return {
    baselineIncome,
    gateReceipts,
    resultBonus,
    playerWages,
    staffWages,
    facilityUpkeep,
    netChange,
    cashBalanceAfter: Math.max(0, rawCash),
    fixtureVenue: isHome ? "home" : isAway ? "away" : "offseason",
    warnings
  };
}

export function processWeeklyFinances(gameState: GameState, fixture?: Fixture, resultBonus = 0): GameState {
  const clubId = gameState.playerClubId;
  const club = gameState.clubs[clubId];
  const summary = calculateWeeklyFinanceSummary(gameState, clubId, fixture, resultBonus);

  const seasonNumber = gameState.currentDate.seasonNumber;
  const week = gameState.currentDate.week;

  const rawTransactions = [
    { seasonNumber, week, category: "baseline_income" as const, amount: summary.baselineIncome, description: "Weekly club income" },
    { seasonNumber, week, category: "gate_receipts" as const, amount: summary.gateReceipts, description: "Home match gate receipts" },
    { seasonNumber, week, category: "result_bonus" as const, amount: summary.resultBonus, description: "Match result reward" },
    { seasonNumber, week, category: "player_wages" as const, amount: -summary.playerWages, description: "Player wages" },
    { seasonNumber, week, category: "staff_wages" as const, amount: -summary.staffWages, description: "Staff wages" },
    { seasonNumber, week, category: "facility_upkeep" as const, amount: -summary.facilityUpkeep, description: "Facility upkeep" }
  ];

  const updatedEconomy = appendFinanceTransactions(club.economy, rawTransactions);

  return {
    ...gameState,
    clubs: {
      ...gameState.clubs,
      [clubId]: {
        ...club,
        economy: {
          ...updatedEconomy,
          cashBalance: summary.cashBalanceAfter,
          weeklyIncome: summary.baselineIncome,
          weeklyExpenses: summary.playerWages + summary.staffWages + summary.facilityUpkeep,
          playerWageTotal: summary.playerWages,
          facilityUpkeepTotal: summary.facilityUpkeep,
          matchdayIncomeEstimate: summary.gateReceipts,
          lastWeeklySummary: summary,
          financeWarnings: summary.warnings
        }
      }
    }
  };
}

export function processOffseasonFinances(gameState: GameState, weeks: number): GameState {
  let nextState = gameState;
  for (let week = 0; week < weeks; week += 1) {
    nextState = processWeeklyFinances(nextState);
  }
  return nextState;
}

export function estimateProjectedSeasonBalance(gameState: GameState, clubId = gameState.playerClubId): number {
  const club = gameState.clubs[clubId];
  const season = gameState.seasons[gameState.currentSeasonId];
  const fixtures = season.fixtures.filter(
    (fixture) => fixture.status === "scheduled" && (fixture.homeClubId === clubId || fixture.awayClubId === clubId)
  );
  return fixtures.reduce((cash, fixture) => {
    const summary = calculateWeeklyFinanceSummary(
      { ...gameState, clubs: { ...gameState.clubs, [clubId]: { ...club, economy: { ...club.economy, cashBalance: cash } } } },
      clubId,
      fixture
    );
    return summary.cashBalanceAfter;
  }, club.economy.cashBalance);
}
