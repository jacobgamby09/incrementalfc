import { Landmark, ArrowUpRight, ArrowDownRight, AlertTriangle, TrendingUp, Clock, Shield } from "lucide-react";
import type { GameState } from "../../domain/types/game";
import { formatCurrency } from "../../utils/format";
import { getEconomyOverview, financeCategoryLabels } from "../../domain/economy/economyOverview";

type EconomyScreenProps = {
  gameState: GameState;
};

export function EconomyScreen({ gameState }: EconomyScreenProps): JSX.Element {
  const playerClub = gameState.clubs[gameState.playerClubId];
  const overview = getEconomyOverview(gameState, playerClub.id);

  // Grouped weeks for the CSS bar chart
  const weeklyCashFlow = overview.weeklyCashFlow;
  // Calculate dynamic maximum to scale the CSS bars correctly
  const maxIncomeExpense = weeklyCashFlow.length > 0 
    ? Math.max(...weeklyCashFlow.map(cf => Math.max(cf.income, cf.expenses)), 1)
    : 1;

  // Most recent 12 transactions (newest first)
  const latestTransactions = [...(playerClub.economy.transactions ?? [])]
    .reverse()
    .slice(0, 12);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section className="rounded-md border border-stone-300 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-pitch-50 text-pitch-700">
            <Landmark className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Club Finances</p>
            <h2 className="text-2xl font-bold text-stone-900 leading-tight">
              {playerClub.name} Control Panel
            </h2>
          </div>
        </div>
      </section>

      {/* Warnings Panel */}
      {overview.financeWarnings.length > 0 && (
        <section className="rounded-md border border-red-300 bg-red-50 p-4 text-red-800 shadow-sm">
          <div className="flex gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-650" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-bold">Financial Alerts & Warnings</h3>
              <ul className="mt-1 list-disc pl-4 text-xs space-y-1">
                {overview.financeWarnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Summary Band */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Cash Balance */}
        <div className="rounded-md border border-stone-300 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-stone-400" />
            Current Balance
          </p>
          <p className="mt-2 text-2xl font-black text-stone-900">
            {formatCurrency(overview.currentBalance)}
          </p>
          <p className="mt-1 text-xs text-stone-500">Liquid reserves</p>
        </div>

        {/* Projected Season Balance */}
        <div className="rounded-md border border-stone-300 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-stone-400" />
            Projected Season End
          </p>
          <p className="mt-2 text-2xl font-black text-stone-900">
            {formatCurrency(overview.projectedSeasonBalance)}
          </p>
          <p className="mt-1 text-xs text-stone-500">Expected baseline rollover</p>
        </div>

        {/* Weekly Net (Operational) */}
        <div className="rounded-md border border-stone-300 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            {overview.weeklyNet >= 0 ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
            )}
            Weekly Net (Ops)
          </p>
          <p className={`mt-2 text-2xl font-black ${overview.weeklyNet >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {overview.weeklyNet >= 0 ? "+" : ""}{formatCurrency(overview.weeklyNet)}
          </p>
          <p className="mt-1 text-xs text-stone-500">Excludes gate receipts</p>
        </div>

        {/* Operating Runway */}
        <div className="rounded-md border border-stone-300 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-stone-400" />
            Operating Reserve
          </p>
          <p className={`mt-2 text-2xl font-black ${overview.operatingReserveWeeks < 3 ? "text-amber-700" : "text-stone-900"}`}>
            {overview.operatingReserveWeeks === 99 ? "Unlimited" : `${overview.operatingReserveWeeks.toFixed(1)} wks`}
          </p>
          <p className="mt-1 text-xs text-stone-500">Runway at current wage/upkeep</p>
        </div>
      </section>

      {/* Visual Ledger Details Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Weekly Cash Flow & Latest Transactions */}
        <div className="space-y-6">
          {/* Weekly Cash Flow progress rows */}
          <section className="rounded-md border border-stone-300 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200 pb-2 mb-3">
              Weekly Cash Flow History
            </h3>
            {weeklyCashFlow.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">No cash flow history recorded yet.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex text-[10px] font-bold text-stone-400 uppercase border-b border-stone-200 pb-1">
                  <span className="w-16 shrink-0">Week</span>
                  <span className="flex-1 text-center">Income (Left) vs Expenses (Right)</span>
                  <span className="w-24 text-right shrink-0">Weekly Net</span>
                </div>
                <div className="max-h-[310px] overflow-y-auto pr-1 space-y-1.5">
                  {weeklyCashFlow.map((cf) => (
                    <div key={`${cf.seasonNumber}_${cf.week}`} className="flex items-center gap-4 text-xs font-mono py-1 border-b border-stone-100 last:border-0">
                      <span className="w-16 text-stone-500 shrink-0 font-sans">S{cf.seasonNumber} W{cf.week}</span>
                      <div className="flex-1 flex gap-2 items-center">
                        {/* Income Bar */}
                        <div className="flex-1 flex justify-end">
                          <div 
                            className="h-2.5 rounded bg-emerald-500/80 transition-all" 
                            style={{ width: `${Math.min(100, (cf.income / maxIncomeExpense) * 100)}%` }}
                            title={`Income: ${formatCurrency(cf.income)}`}
                          />
                        </div>
                        {/* Center separator line */}
                        <div className="w-px h-3 bg-stone-300 shrink-0" />
                        {/* Expenses Bar */}
                        <div className="flex-1 flex justify-start">
                          <div 
                            className="h-2.5 rounded bg-rose-500/80 transition-all" 
                            style={{ width: `${Math.min(100, (cf.expenses / maxIncomeExpense) * 100)}%` }}
                            title={`Expenses: ${formatCurrency(cf.expenses)}`}
                          />
                        </div>
                      </div>
                      <span className={`w-24 text-right font-bold ${cf.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {cf.net >= 0 ? "+" : ""}{formatCurrency(cf.net)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Latest Transactions Ledger Table */}
          <section className="rounded-md border border-stone-300 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200 pb-2 mb-3">
              Latest Transactions Ledger
            </h3>
            {latestTransactions.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">No transaction records generated yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px] font-bold">
                      <th className="py-2">Week</th>
                      <th className="py-2">Category</th>
                      <th className="py-2">Description</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-150">
                    {latestTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-stone-50 transition">
                        <td className="py-2 text-stone-500 font-mono">S{tx.seasonNumber} W{tx.week}</td>
                        <td className="py-2 font-medium text-stone-700">{financeCategoryLabels[tx.category]}</td>
                        <td className="py-2 text-stone-600">{tx.description}</td>
                        <td className={`py-2 text-right font-bold ${tx.amount > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                          {tx.amount > 0 ? "+" : ""}{formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Category Breakdowns (Income & Expenses Side-by-Side) */}
        <div className="space-y-6">
          <section className="rounded-md border border-stone-300 bg-white p-4 shadow-sm">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Income Breakdown */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200 pb-2 mb-3 flex items-center gap-1">
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                  Income Breakdown
                </h3>
                <div className="space-y-4">
                  {overview.incomeByCategory.map((cat) => {
                    const maxIncome = Math.max(...overview.incomeByCategory.map(i => i.amount), 1);
                    const widthPercent = (cat.amount / maxIncome) * 100;
                    return (
                      <div key={cat.category} className="text-xs">
                        <div className="flex justify-between font-semibold text-stone-700">
                          <span>{cat.label}</span>
                          <span>{formatCurrency(cat.amount)}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full" 
                            style={{ width: `${widthPercent}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Expenses Breakdown */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200 pb-2 mb-3 flex items-center gap-1">
                  <ArrowDownRight className="h-4 w-4 text-rose-500" />
                  Expense Breakdown
                </h3>
                <div className="space-y-4">
                  {overview.expensesByCategory.map((cat) => {
                    const maxExpense = Math.max(...overview.expensesByCategory.map(e => e.amount), 1);
                    const widthPercent = (cat.amount / maxExpense) * 100;
                    return (
                      <div key={cat.category} className="text-xs">
                        <div className="flex justify-between font-semibold text-stone-700">
                          <span>{cat.label}</span>
                          <span>{formatCurrency(cat.amount)}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-rose-500 rounded-full" 
                            style={{ width: `${widthPercent}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
