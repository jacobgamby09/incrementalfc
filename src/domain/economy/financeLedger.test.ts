import { describe, expect, it } from "vitest";
import type { EconomyState, FinanceTransaction, FinanceTransactionCategory } from "../types/economy";
import {
  appendFinanceTransaction,
  appendFinanceTransactions,
  groupTransactionsByCategory,
  groupTransactionsByWeek
} from "./financeLedger";

describe("Finance Ledger Helpers", () => {
  const createMockEconomy = (transactions: FinanceTransaction[] = []): EconomyState => ({
    cashBalance: 100000,
    weeklyIncome: 6500,
    weeklyExpenses: 2000,
    playerWageTotal: 1000,
    staffWageTotal: 500,
    facilityUpkeepTotal: 500,
    scoutingUpkeep: 300,
    academyUpkeep: 300,
    sponsorIncomePerWeek: 1000,
    matchdayIncomeEstimate: 0,
    financeWarnings: [],
    transactions
  });

  it("appends a transaction immutably", () => {
    const initialEconomy = createMockEconomy();
    const resultEconomy = appendFinanceTransaction(initialEconomy, {
      seasonNumber: 1,
      week: 1,
      category: "baseline_income",
      amount: 6500,
      description: "Weekly club income"
    });

    expect(initialEconomy.transactions.length).toBe(0); // Immutable check
    expect(resultEconomy.transactions.length).toBe(1);
    expect(resultEconomy.transactions[0]).toEqual({
      id: "tx_1_1_baseline_income_0",
      seasonNumber: 1,
      week: 1,
      category: "baseline_income",
      amount: 6500,
      description: "Weekly club income"
    });
  });

  it("skips zero-value single transactions", () => {
    const initialEconomy = createMockEconomy();
    const resultEconomy = appendFinanceTransaction(initialEconomy, {
      seasonNumber: 1,
      week: 1,
      category: "baseline_income",
      amount: 0,
      description: "Zero transaction"
    });

    expect(resultEconomy.transactions.length).toBe(0);
  });

  it("appends multiple transactions immutably and generates unique IDs", () => {
    const initialEconomy = createMockEconomy();
    const resultEconomy = appendFinanceTransactions(initialEconomy, [
      { seasonNumber: 1, week: 1, category: "baseline_income", amount: 6500, description: "Income" },
      { seasonNumber: 1, week: 1, category: "player_wages", amount: -2000, description: "Wages" },
      { seasonNumber: 1, week: 1, category: "staff_wages", amount: 0, description: "Skip" } // Zero transaction
    ]);

    expect(initialEconomy.transactions.length).toBe(0);
    expect(resultEconomy.transactions.length).toBe(2);
    expect(resultEconomy.transactions[0].id).toBe("tx_1_1_baseline_income_0");
    expect(resultEconomy.transactions[1].id).toBe("tx_1_1_player_wages_1");
  });

  it("calculates category totals correctly", () => {
    const mockTxs: FinanceTransaction[] = [
      { id: "tx1", seasonNumber: 1, week: 1, category: "baseline_income", amount: 6500, description: "Baseline" },
      { id: "tx2", seasonNumber: 1, week: 1, category: "baseline_income", amount: 1500, description: "Extra" },
      { id: "tx3", seasonNumber: 1, week: 1, category: "player_wages", amount: -2000, description: "Wages" },
      { id: "tx4", seasonNumber: 1, week: 1, category: "facility_construction", amount: -10000, description: "Upgrades" }
    ];

    const grouped = groupTransactionsByCategory(mockTxs);
    expect(grouped.baseline_income).toBe(8000);
    expect(grouped.player_wages).toBe(-2000);
    expect(grouped.facility_construction).toBe(-10000);
    expect(grouped.staff_wages).toBe(0); // Zero check
  });

  it("combines weekly income, expenses, and net chronologically", () => {
    const mockTxs: FinanceTransaction[] = [
      { id: "tx1", seasonNumber: 1, week: 2, category: "baseline_income", amount: 6500, description: "Baseline" },
      { id: "tx2", seasonNumber: 1, week: 1, category: "baseline_income", amount: 6500, description: "Baseline" },
      { id: "tx3", seasonNumber: 1, week: 2, category: "player_wages", amount: -2000, description: "Wages" },
      { id: "tx4", seasonNumber: 1, week: 1, category: "player_wages", amount: -2500, description: "Wages" }
    ];

    const weeklyFlow = groupTransactionsByWeek(mockTxs);
    expect(weeklyFlow.length).toBe(2);
    // Chronological order verification (Week 1 before Week 2)
    expect(weeklyFlow[0]).toEqual({
      seasonNumber: 1,
      week: 1,
      income: 6500,
      expenses: 2500,
      net: 4000
    });
    expect(weeklyFlow[1]).toEqual({
      seasonNumber: 1,
      week: 2,
      income: 6500,
      expenses: 2000,
      net: 4500
    });
  });
});
