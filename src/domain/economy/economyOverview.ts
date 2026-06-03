import { economyProfile } from "../../data/constants/economyProfiles";
import { getTotalFacilityUpkeep } from "../../data/constants/facilityProfiles";
import type { GameState } from "../types/game";
import type { FinanceTransactionCategory } from "../types/economy";
import { calculateStadiumAttendance } from "./stadiumAttendance";
import { calculateWeeklyFinanceSummary, estimateProjectedSeasonBalance } from "./clubFinance";
import { groupTransactionsByCategory, groupTransactionsByWeek } from "./financeLedger";

export const financeCategoryLabels: Record<FinanceTransactionCategory, string> = {
  baseline_income: "Baseline Income",
  gate_receipts: "Gate Receipts",
  result_bonus: "Result Bonus",
  participation_prize: "Participation Prize",
  champion_prize: "Champion Title Prize",
  promotion_bonus: "Promotion Bonus",
  player_wages: "Player Wages",
  staff_wages: "Staff Wages",
  facility_upkeep: "Facility Upkeep",
  facility_construction: "Facility Construction",
  transfer_purchase: "Transfer Spend",
  transfer_sale: "Transfer Sales"
};

export type EconomyForecast = {
  id: "conservative" | "expected" | "optimistic";
  label: string;
  projectedBalance: number;
  projectedIncome: number;
  projectedExpenses: number;
  projectedNet: number;
};

export type EconomyOverview = {
  currentBalance: number;
  weeklyIncome: number;
  weeklyExpenses: number;
  weeklyNet: number;
  projectedSeasonBalance: number;
  operatingReserveWeeks: number;
  financeWarnings: string[];
  incomeByCategory: Array<{
    category: FinanceTransactionCategory;
    label: string;
    amount: number;
  }>;
  expensesByCategory: Array<{
    category: FinanceTransactionCategory;
    label: string;
    amount: number;
  }>;
  weeklyCashFlow: Array<{
    seasonNumber: number;
    week: number;
    income: number;
    expenses: number;
    net: number;
  }>;
  forecasts: EconomyForecast[];
};

export function getEconomyOverview(gameState: GameState, clubId = gameState.playerClubId): EconomyOverview {
  const club = gameState.clubs[clubId];
  if (!club) {
    throw new Error(`Club with id ${clubId} not found`);
  }

  const transactions = club.economy.transactions ?? [];
  const playerSquad = club.squadPlayerIds.map((pid) => gameState.players[pid]).filter(Boolean);

  // Dynamic wage calculation
  const currentPlayerWages = playerSquad.reduce((sum, p) => sum + (p.contract.wagePerWeek ?? 0), 0);
  const staffWages = club.economy.staffWageTotal !== undefined ? club.economy.staffWageTotal : economyProfile.staffWagePlaceholder;
  const facilityUpkeep = getTotalFacilityUpkeep(club.facilities);

  // Dynamic weekly expenses
  const weeklyExpenses = currentPlayerWages + staffWages + facilityUpkeep;
  const weeklyIncome = economyProfile.weeklyBaselineIncome;
  const weeklyNet = weeklyIncome - weeklyExpenses;

  // Safe operating reserve weeks
  const operatingReserveWeeks = weeklyExpenses > 0 ? club.economy.cashBalance / weeklyExpenses : 99;

  // Warnings
  const financeWarnings = [...(club.economy.financeWarnings ?? [])];
  if (operatingReserveWeeks < economyProfile.reserveWarningWeeks && !financeWarnings.some(w => w.includes("reserve"))) {
    financeWarnings.push(`Low cash reserves! The club has less than ${economyProfile.reserveWarningWeeks} weeks of operating costs in reserve.`);
  }

  // Categories grouping
  const grouped = groupTransactionsByCategory(transactions);

  const incomeCategories: FinanceTransactionCategory[] = [
    "baseline_income",
    "gate_receipts",
    "result_bonus",
    "participation_prize",
    "champion_prize",
    "promotion_bonus",
    "transfer_sale"
  ];

  const expenseCategories: FinanceTransactionCategory[] = [
    "player_wages",
    "staff_wages",
    "facility_upkeep",
    "facility_construction",
    "transfer_purchase"
  ];

  const incomeByCategory = incomeCategories.map((cat) => ({
    category: cat,
    label: financeCategoryLabels[cat],
    amount: grouped[cat] ?? 0
  }));

  const expensesByCategory = expenseCategories.map((cat) => ({
    category: cat,
    label: financeCategoryLabels[cat],
    amount: Math.abs(grouped[cat] ?? 0)
  }));

  // Weekly cash flow history
  const weeklyCashFlow = groupTransactionsByWeek(transactions);

  // Forecast scenarios
  const season = gameState.seasons[gameState.currentSeasonId];
  const remainingFixtures = season.fixtures.filter(
    (f) => f.status === "scheduled" && (f.homeClubId === clubId || f.awayClubId === clubId)
  );

  const calculateScenario = (scenarioKey: "conservative" | "expected" | "optimistic"): EconomyForecast => {
    const config = economyProfile.forecastScenarios[scenarioKey];
    let cash = club.economy.cashBalance;
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const fixture of remainingFixtures) {
      const isHome = fixture.homeClubId === clubId;
      const opponentId = isHome ? fixture.awayClubId : fixture.homeClubId;
      const opponent = opponentId ? gameState.clubs[opponentId] : undefined;
      const attendance = isHome ? calculateStadiumAttendance(club, opponent) : undefined;

      const gateReceipts = isHome ? (attendance?.gateReceipts ?? 0) * config.gateReceiptMultiplier : 0;
      const resultBonus = config.resultBonusPerFixture;

      const income = economyProfile.weeklyBaselineIncome + gateReceipts + resultBonus;
      const expenses = currentPlayerWages + staffWages + facilityUpkeep;

      totalIncome += income;
      totalExpenses += expenses;

      cash = Math.max(0, cash + income - expenses);
    }

    return {
      id: scenarioKey,
      label: config.label,
      projectedBalance: cash,
      projectedIncome: totalIncome,
      projectedExpenses: totalExpenses,
      projectedNet: totalIncome - totalExpenses
    };
  };

  const forecasts = [
    calculateScenario("conservative"),
    calculateScenario("expected"),
    calculateScenario("optimistic")
  ];

  // Standard projected balance matches the estimateProjectedSeasonBalance helper
  const projectedSeasonBalance = estimateProjectedSeasonBalance(gameState, clubId);

  return {
    currentBalance: club.economy.cashBalance,
    weeklyIncome,
    weeklyExpenses,
    weeklyNet,
    projectedSeasonBalance,
    operatingReserveWeeks,
    financeWarnings,
    incomeByCategory,
    expensesByCategory,
    weeklyCashFlow,
    forecasts
  };
}
