import { useState } from "react";
import { Landmark, TrendingUp, Shield, Zap, ArrowRight, AlertTriangle, Sparkles, Trophy } from "lucide-react";
import type { GameState } from "../../domain/types/game";
import { getMatchDevelopmentSummary } from "../../domain/development/developmentPresentation";
import { getMatchRatingRows, type MatchRatingRow } from "../../domain/player/playerSummaries";
import { formatCurrency, formatNumber } from "../../utils/format";
import { PlayerDetailSheet } from "../components/player/PlayerDetailSheet";
import { PlayerNameButton } from "../components/player/PlayerNameButton";

type MatchRewardsScreenProps = {
  gameState: GameState;
  matchId: string;
  onBackToDashboard: () => void;
};

export function MatchRewardsScreen({
  gameState,
  matchId,
  onBackToDashboard
}: MatchRewardsScreenProps): JSX.Element {
  const match = gameState.matches[matchId];
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedRatingRow, setSelectedRatingRow] = useState<MatchRatingRow | undefined>(undefined);

  const playerIsHome = match.homeClubId === gameState.playerClubId;
  const playerClub = gameState.clubs[gameState.playerClubId];
  const opponentClub = gameState.clubs[playerIsHome ? match.awayClubId : match.homeClubId];

  const developmentSummary = getMatchDevelopmentSummary(gameState, match);
  const allRatingRows = getMatchRatingRows(gameState, match, gameState.playerClubId);
  const selectedPlayer = selectedPlayerId ? gameState.players[selectedPlayerId] : undefined;

  function openPlayerId(playerId: string): void {
    setSelectedPlayerId(playerId);
    setSelectedRatingRow(allRatingRows.find((row) => row.playerId === playerId));
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <section className="rounded-md border border-stone-300 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-stone-500">Post-Match Summary</p>
            <h2 className="mt-1 text-2xl font-bold text-stone-900">Match Rewards & Development</h2>
            <p className="mt-1 text-sm text-stone-600">
              Rewards accrued from the fixture against {opponentClub.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-pitch-700 px-6 text-sm font-semibold text-white transition hover:bg-pitch-900 shadow-sm"
          >
            <span>Claim Rewards & Continue</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Primary Club Rewards Cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-5 flex items-start gap-4">
          <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Result Bonus</p>
            <p className="mt-1 text-2xl font-black text-emerald-950 tabular-nums">{formatCurrency(match.rewards.money)}</p>
            <p className="text-xs text-emerald-700 mt-1">Sporting reward for this result</p>
          </div>
        </div>

        <div className="rounded-md border border-blue-200 bg-blue-50/50 p-5 flex items-start gap-4">
          <div className="rounded-full bg-blue-100 p-3 text-blue-700">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-800">New Supporters</p>
            <p className="mt-1 text-2xl font-black text-blue-950 tabular-nums">+{formatNumber(match.rewards.fans)}</p>
            <p className="text-xs text-blue-700 mt-1">Expanding your fan base</p>
          </div>
        </div>

        <div className="rounded-md border border-purple-200 bg-purple-50/50 p-5 flex items-start gap-4">
          <div className="rounded-full bg-purple-100 p-3 text-purple-700">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-800">Reputation Gain</p>
            <p className="mt-1 text-2xl font-black text-purple-950 tabular-nums">+{match.rewards.reputation.toFixed(2)}</p>
            <p className="text-xs text-purple-700 mt-1">Enhances club prestige</p>
          </div>
        </div>
      </section>

      {playerClub.economy.lastWeeklySummary && (
        <section className="rounded-md border border-stone-300 bg-white p-4">
          <h3 className="font-bold text-stone-950">Weekly Club Finances</h3>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3 xl:grid-cols-6">
            <FinanceStat label="Baseline income" value={formatCurrency(playerClub.economy.lastWeeklySummary.baselineIncome)} />
            <FinanceStat label="Gate receipts" value={formatCurrency(playerClub.economy.lastWeeklySummary.gateReceipts)} />
            <FinanceStat label="Result bonus" value={formatCurrency(playerClub.economy.lastWeeklySummary.resultBonus)} />
            <FinanceStat label="Player wages" value={`-${formatCurrency(playerClub.economy.lastWeeklySummary.playerWages)}`} />
            <FinanceStat label="Facility upkeep" value={`-${formatCurrency(playerClub.economy.lastWeeklySummary.facilityUpkeep)}`} />
            <FinanceStat label="Weekly net" value={formatCurrency(playerClub.economy.lastWeeklySummary.netChange)} />
          </div>
          <p className="mt-3 text-xs text-stone-500">
            {playerClub.economy.lastWeeklySummary.fixtureVenue === "home" ? "Home fixture: gate receipts included." : "Away fixture: no gate receipts."}
          </p>
        </section>
      )}

      {/* Secondary Development stats */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-stone-300 bg-white p-4 flex items-center gap-3">
          <Zap className="h-5 w-5 text-amber-500" />
          <div className="text-sm">
            <span className="block text-stone-500 font-medium">Squad Match XP</span>
            <span className="font-bold text-stone-900 tabular-nums">+{formatNumber(developmentSummary.totalMatchXp)} XP</span>
          </div>
        </div>

        <div className="rounded-md border border-stone-300 bg-white p-4 flex items-center gap-3">
          <Trophy className="h-5 w-5 text-pitch-700" />
          <div className="text-sm">
            <span className="block text-stone-500 font-medium">Club Training XP</span>
            <span className="font-bold text-stone-900 tabular-nums">+{formatNumber(developmentSummary.totalTrainingXp)} XP</span>
          </div>
        </div>

        <div className="rounded-md border border-stone-300 bg-white p-4 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          <div className="text-sm">
            <span className="block text-stone-500 font-medium">Tactic Familiarity</span>
            <span className="font-bold text-indigo-950 tabular-nums">+{developmentSummary.tacticalFamiliarityGained}%</span>
          </div>
        </div>
      </section>

      {/* Development Grid */}
      <section className="grid gap-6 xl:grid-cols-2">
        {/* Top XP Gainers */}
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <h3 className="mb-4 text-lg font-bold text-stone-950">Top Player Development Progress</h3>
          <div className="space-y-3">
            {developmentSummary.topXpGainers.map((entry) => {
              const player = gameState.players[entry.playerId];
              return (
                <div key={entry.playerId} className="rounded border border-stone-200 bg-stone-50/50 p-3 hover:bg-stone-50 transition" title={entry.reasonText}>
                  <div className="flex justify-between items-center gap-3">
                    {player ? (
                      <PlayerNameButton
                        player={player}
                        isOwnClub
                        onClick={() => openPlayerId(entry.playerId)}
                      />
                    ) : (
                      <span className="font-medium text-stone-900">{entry.playerName}</span>
                    )}
                    <span className="flex items-center gap-2">
                      {entry.statIncreaseBadges.map((badge) => (
                        <span key={badge} className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                          {badge}
                        </span>
                      ))}
                      <span className="font-bold text-stone-900 tabular-nums text-sm">+{entry.totalXp} XP</span>
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200">
                      <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.min(100, entry.progressPercent)}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-stone-500 tabular-nums w-8 text-right">{Math.round(entry.progressPercent)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stat Increases & Facility Warnings */}
        <div className="space-y-6">
          {/* Development Points */}
          <div className="rounded-md border border-stone-300 bg-white p-4">
            <h3 className="mb-4 text-lg font-bold text-stone-950">Development Points</h3>
            <div className="space-y-3 text-sm">
              {developmentSummary.noGrowthMessage && (
                <div className="rounded border border-stone-200 bg-stone-50/50 p-4 text-center text-stone-500 font-medium">
                  {developmentSummary.noGrowthMessage}
                </div>
              )}
              {developmentSummary.improvedPlayers.map((summary) => (
                <div key={summary.playerId} className="rounded border border-pitch-200 bg-pitch-50/50 p-3 flex items-center justify-between">
                  {gameState.players[summary.playerId] ? (
                    <PlayerNameButton
                      player={gameState.players[summary.playerId]}
                      isOwnClub
                      onClick={() => openPlayerId(summary.playerId)}
                    />
                  ) : (
                    <span className="font-semibold text-stone-900">{summary.playerName}</span>
                  )}
                  <span className="flex flex-wrap gap-1.5 justify-end">
                    {summary.statGrowth.map((growth) => (
                      <span key={growth.statKey} className="rounded bg-pitch-100 border border-pitch-200 px-2 py-0.5 text-xs font-bold text-pitch-900">
                        {growth.statKey} {growth.from} → {growth.to}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Facility Cap Warnings */}
          {developmentSummary.capSummaries.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50/30 p-4">
              <h4 className="flex items-center gap-2 text-sm font-bold text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-700" />
                <span>Development Bottlenecks</span>
              </h4>
              <div className="mt-3 space-y-2 text-xs text-amber-950">
                {developmentSummary.capSummaries.map((summaryText, i) => (
                  <p key={i} className="font-medium">• {summaryText}</p>
                ))}
              </div>
              <p className="mt-3 text-xs text-amber-700 font-semibold bg-amber-50 rounded border border-amber-100 p-2">
                Tip: Upgrade your Training Ground in Facilities to unlock untapped potential and raise player development limits.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Overlay Player Details Sheet */}
      {selectedPlayer && (
        <PlayerDetailSheet
          player={selectedPlayer}
          gameState={gameState}
          matchContext={selectedRatingRow?.matchContext}
          onClose={() => {
            setSelectedPlayerId(null);
            setSelectedRatingRow(undefined);
          }}
        />
      )}
    </div>
  );
}

function FinanceStat({ label, value }: { label: string; value: string }): JSX.Element {
  return <div><p className="text-xs font-semibold uppercase text-stone-500">{label}</p><p className="mt-1 font-bold tabular-nums">{value}</p></div>;
}
