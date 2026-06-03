import type { EconomyState, FinanceTransaction, FinanceTransactionCategory } from "../types/economy";

export function appendFinanceTransaction(
  economy: EconomyState,
  transaction: Omit<FinanceTransaction, "id">
): EconomyState {
  if (transaction.amount === 0) return economy;
  
  const currentTransactions = economy.transactions ?? [];
  const newTx: FinanceTransaction = {
    ...transaction,
    id: `tx_${transaction.seasonNumber}_${transaction.week}_${transaction.category}_${currentTransactions.length}`
  };

  return {
    ...economy,
    transactions: [...currentTransactions, newTx]
  };
}

export function appendFinanceTransactions(
  economy: EconomyState,
  transactions: Array<Omit<FinanceTransaction, "id">>
): EconomyState {
  const filtered = transactions.filter((tx) => tx.amount !== 0);
  if (filtered.length === 0) return economy;

  const currentTransactions = economy.transactions ?? [];
  let nextLength = currentTransactions.length;
  const newTxs: FinanceTransaction[] = [];

  for (const tx of filtered) {
    newTxs.push({
      ...tx,
      id: `tx_${tx.seasonNumber}_${tx.week}_${tx.category}_${nextLength}`
    });
    nextLength += 1;
  }

  return {
    ...economy,
    transactions: [...currentTransactions, ...newTxs]
  };
}

export function groupTransactionsByCategory(
  transactions: FinanceTransaction[]
): Record<FinanceTransactionCategory, number> {
  const result: Record<FinanceTransactionCategory, number> = {
    baseline_income: 0,
    gate_receipts: 0,
    result_bonus: 0,
    participation_prize: 0,
    champion_prize: 0,
    promotion_bonus: 0,
    player_wages: 0,
    staff_wages: 0,
    facility_upkeep: 0,
    facility_construction: 0,
    transfer_purchase: 0,
    transfer_sale: 0
  };

  for (const tx of transactions) {
    if (tx.category in result) {
      result[tx.category] += tx.amount;
    }
  }

  return result;
}

export function groupTransactionsByWeek(
  transactions: FinanceTransaction[]
): Array<{
  seasonNumber: number;
  week: number;
  income: number;
  expenses: number;
  net: number;
}> {
  const groups: Record<string, { seasonNumber: number; week: number; income: number; expenses: number; net: number }> = {};

  for (const tx of transactions) {
    const key = `${tx.seasonNumber}_${tx.week}`;
    if (!groups[key]) {
      groups[key] = {
        seasonNumber: tx.seasonNumber,
        week: tx.week,
        income: 0,
        expenses: 0,
        net: 0
      };
    }
    const group = groups[key];
    if (tx.amount > 0) {
      group.income += tx.amount;
    } else {
      group.expenses += Math.abs(tx.amount);
    }
    group.net += tx.amount;
  }

  return Object.values(groups).sort((a, b) => {
    if (a.seasonNumber !== b.seasonNumber) return a.seasonNumber - b.seasonNumber;
    return a.week - b.week;
  });
}
