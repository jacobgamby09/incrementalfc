import { useState } from "react";
import { CalendarDays, Landmark, Play, Shield, TrendingUp, Trophy, Sparkles, Flame, Award, Building2 } from "lucide-react";
import type { GameState } from "../../domain/types/game";
import { formatCurrency, formatNumber } from "../../utils/format";
import { LeagueTable } from "../components/tables/LeagueTable";
import { PlayerDetailSheet } from "../components/player/PlayerDetailSheet";
import { useGameStore } from "../../store/gameStore";
import { sortTableCanonically } from "../../domain/league/leagueTableView";
import { canPromoteFromLevel, canRelegateFromLevel } from "../../data/constants/leagueProfiles";
import { estimateProjectedSeasonBalance } from "../../domain/economy/clubFinance";
import { calculateClubHype, calculateStadiumAttendance } from "../../domain/economy/stadiumAttendance";
import { activeFacilityTypes } from "../../data/constants/facilityProfiles";
import { getPlayerPerformanceSummary } from "../../domain/player/playerSummaries";
import { getTransferWindowFinalizationIssues } from "../../domain/transfers/transferWindow";

type DashboardScreenProps = {
  gameState: GameState;
  onPrepareMatch: (fixtureId?: string) => void;
  onAllocateDevelopmentPoint: (playerId: string, statKey: string) => void;
};

type DashboardMeterProps = {
  label: string;
  value: number;
  max: number;
  valueLabel: string;
  fillClassName: string;
};

function DashboardMeter({ label, value, max, valueLabel, fillClassName }: DashboardMeterProps): JSX.Element {
  const width = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs text-stone-600">
        <span>{label}</span>
        <span className="font-semibold text-stone-800">{valueLabel}</span>
      </div>
      <div
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-200"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div className={`h-full rounded-full ${fillClassName}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function DashboardScreen({ gameState, onPrepareMatch, onAllocateDevelopmentPoint }: DashboardScreenProps): JSX.Element {
  const { startNextSeason, advanceTransferWeek, finalizeTransferWindow, setSelectedScreen } = useGameStore();
  const playerClub = gameState.clubs[gameState.playerClubId];
  const season = gameState.seasons[gameState.currentSeasonId];
  const league = gameState.leagues[season.leagueId];
  const playerSquad = playerClub.squadPlayerIds.map((playerId) => gameState.players[playerId]);
  const nextFixture = season.fixtures
    .filter(
      (fixture) =>
        fixture.status === "scheduled" &&
        (fixture.homeClubId === playerClub.id || fixture.awayClubId === playerClub.id)
    )
    .sort((a, b) => a.matchday - b.matchday)[0];
  const opponentId =
    nextFixture?.homeClubId === playerClub.id ? nextFixture.awayClubId : nextFixture?.homeClubId;
  const opponent = opponentId ? gameState.clubs[opponentId] : undefined;
  const venue = nextFixture?.homeClubId === playerClub.id ? "Home" : "Away";
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const selectedPlayer = selectedPlayerId ? gameState.players[selectedPlayerId] : undefined;

  const isPostSeason = gameState.currentDate.phase === "postseason";
  const isTransferWindow = gameState.currentDate.phase === "transferWindow";
  const sortedTable = sortTableCanonically(season.table);
  const playerRankIndex = sortedTable.findIndex((entry) => entry.clubId === playerClub.id);
  const playerRank = playerRankIndex !== -1 ? playerRankIndex + 1 : 10;
  const isPromoted = playerRank <= league.promotionSpots && canPromoteFromLevel(league.level);
  const isRelegated = playerRank > (league.teamsCount - league.relegationSpots) && canRelegateFromLevel(league.level);
  const isChampion = playerRank === 1;
  const projectedSeasonBalance = estimateProjectedSeasonBalance(gameState);
  const nextAttendance = nextFixture?.homeClubId === playerClub.id
    ? calculateStadiumAttendance(playerClub, opponent)
    : undefined;
  const clubHype = calculateClubHype(playerClub);
  const expectedWeeklyIncome = playerClub.economy.weeklyIncome + (nextAttendance?.gateReceipts ?? 0);
  const weeklyExpenses = playerClub.economy.weeklyExpenses;
  const netWeeklyChange = expectedWeeklyIncome - weeklyExpenses;
  const formattedNetChange = netWeeklyChange >= 0
    ? `+${formatCurrency(netWeeklyChange)}`
    : `-${formatCurrency(Math.abs(netWeeklyChange))}`;
  const economyMeterMax = Math.max(expectedWeeklyIncome, weeklyExpenses, 1);
  const activeConstruction = activeFacilityTypes.filter((type) => playerClub.facilities[type].construction).length;
  const transferWindowFinalizationIssues = isTransferWindow ? getTransferWindowFinalizationIssues(gameState) : [];

  // Stadium name helper
  const stadiumName = playerClub.name.startsWith("FC ")
    ? `${playerClub.name.replace(/^FC /, "")} Park`
    : playerClub.name.endsWith(" FC")
    ? `${playerClub.name.replace(/ FC$/, "")} Park`
    : playerClub.name.endsWith("FC")
    ? `${playerClub.name.replace(/FC$/, "")} Park`
    : `${playerClub.name} Stadium`;

  // Get performance summaries for the player's squad
  const squadPerformance = playerSquad.map((player) => {
    const summary = getPlayerPerformanceSummary(gameState, player.id, gameState.currentSeasonId);
    const formScore = summary.formLastFive.length > 0
      ? summary.formLastFive.reduce((sum, r) => sum + r, 0) / summary.formLastFive.length
      : 0;
    return {
      player,
      summary,
      formScore
    };
  });

  // Filter players who have made appearances
  const activePlayers = squadPerformance.filter((p) => p.summary.apps > 0);

  // 1. Top Scorer
  const topScorer = squadPerformance.length > 0
    ? [...squadPerformance].sort((a, b) => {
        if (b.summary.goals !== a.summary.goals) return b.summary.goals - a.summary.goals;
        return b.summary.apps - a.summary.apps; // fewer appearances first is better ratio
      })[0]
    : undefined;

  // 2. Most Assists
  const topAssists = squadPerformance.length > 0
    ? [...squadPerformance].sort((a, b) => {
        if (b.summary.assists !== a.summary.assists) return b.summary.assists - a.summary.assists;
        return b.summary.apps - a.summary.apps;
      })[0]
    : undefined;

  // 3. Best Average Rating
  const bestAvgRating = activePlayers.length > 0
    ? [...activePlayers].sort((a, b) => (b.summary.avgRating ?? 0) - (a.summary.avgRating ?? 0))[0]
    : undefined;

  // 4. Best Form
  const bestForm = activePlayers.length > 0
    ? [...activePlayers].sort((a, b) => b.formScore - a.formScore)[0]
    : undefined;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-500">
            <Shield className="h-4 w-4 text-pitch-700" aria-hidden="true" />
            Club
          </div>
          <p className="mt-2 text-2xl font-bold">{playerClub.name}</p>
          <p className="text-sm text-stone-600">Reputation {playerClub.reputation}</p>

          <div className="mt-3 border-t border-stone-200 pt-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
              <Building2 className="h-3.5 w-3.5 text-pitch-700" aria-hidden="true" />
              Stadium
            </div>
            <p className="mt-1 text-sm font-bold text-stone-850 truncate">{stadiumName}</p>
            <p className="text-xs text-stone-500 mt-0.5">Capacity: <span className="font-semibold text-stone-700">{formatNumber(playerClub.facilities.stadium.effects.stadiumCapacity ?? 0)}</span></p>
          </div>
        </div>
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-500">
            <CalendarDays className="h-4 w-4 text-pitch-700" aria-hidden="true" />
            Season
          </div>
          <p className="mt-2 text-2xl font-bold">Season {gameState.currentDate.seasonNumber}</p>
          <p className="text-sm text-stone-600">Matchday {season.currentMatchday}</p>
        </div>
        <div
          onClick={() => setSelectedScreen("economy")}
          className="rounded-md border border-stone-300 bg-white p-4 cursor-pointer hover:border-pitch-500 hover:shadow-sm transition group"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-stone-500 group-hover:text-pitch-800 transition">
            <Landmark className="h-4 w-4 text-pitch-700" aria-hidden="true" />
            Economy
          </div>
          <p className="mt-2 text-2xl font-bold flex items-baseline gap-2">
            <span>{formatCurrency(playerClub.economy.cashBalance)}</span>
            <span className={`text-sm font-semibold ${netWeeklyChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              ({formattedNetChange})
            </span>
          </p>
          <p className="text-xs text-stone-500">Projected season balance {formatCurrency(projectedSeasonBalance)}</p>
          <div className="mt-3 space-y-2">
            <DashboardMeter
              label="Weekly income"
              value={expectedWeeklyIncome}
              max={economyMeterMax}
              valueLabel={formatCurrency(expectedWeeklyIncome)}
              fillClassName="bg-emerald-500"
            />
            <DashboardMeter
              label="Weekly expenses"
              value={weeklyExpenses}
              max={economyMeterMax}
              valueLabel={formatCurrency(weeklyExpenses)}
              fillClassName="bg-rose-500"
            />
          </div>
        </div>
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-500">
            <TrendingUp className="h-4 w-4 text-pitch-700" aria-hidden="true" />
            Fans
          </div>
          <p className="mt-2 text-2xl font-bold">{formatNumber(playerClub.fans)}</p>
          <p className="text-xs text-stone-500">
            {nextAttendance ? `Next home gate ${formatCurrency(nextAttendance.gateReceipts)}` : "Away fixture: no gate receipts"}
          </p>
          <div className="mt-3">
            <DashboardMeter
              label="Hype"
              value={clubHype}
              max={100}
              valueLabel={`${clubHype}/100`}
              fillClassName="bg-amber-500"
            />
          </div>
        </div>
      </section>

      {(activeConstruction > 0 || playerClub.academy.pendingProspect || (nextAttendance?.lostDemand ?? 0) > 0) && (
        <section className="grid gap-2 rounded-md border border-stone-300 bg-white p-4 text-sm sm:grid-cols-3">
          {activeConstruction > 0 && <p><strong>{activeConstruction}</strong> facility upgrade{activeConstruction === 1 ? "" : "s"} under construction.</p>}
          {playerClub.academy.pendingProspect && <p className="font-semibold text-emerald-700">Youth prospect ready for review in Facilities.</p>}
          {(nextAttendance?.lostDemand ?? 0) > 0 && <p><strong>{formatNumber(nextAttendance!.lostDemand)}</strong> expected fans cannot fit in the stadium.</p>}
        </section>
      )}

      <section className="rounded-md border border-stone-300 bg-white p-4">
        {isPostSeason ? (
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Season Completed!</h2>
            <div className="mt-3 p-4 bg-stone-50 border border-stone-200 rounded-md">
              <p className="text-sm font-semibold text-stone-700">Final Position: <span className="text-pitch-700 font-bold">{playerRank}. place</span></p>
              {isChampion && isPromoted ? (
                <p className="mt-1 text-sm text-green-700 font-bold">Champions! You have won the league and earned promotion.</p>
              ) : isChampion ? (
                <p className="mt-1 text-sm text-green-700 font-bold">Champions! You have won the league.</p>
              ) : isPromoted ? (
                <p className="mt-1 text-sm text-green-700 font-bold">Promoted! You are moving up to the next division.</p>
              ) : isRelegated ? (
                <p className="mt-1 text-sm text-red-700 font-bold">Relegated! You are moving down to the lower division.</p>
              ) : (
                <p className="mt-1 text-sm text-stone-600">You finished in the middle of the table. Prepare for another season in this division.</p>
              )}
              <p className="mt-3 text-xs text-stone-500">
                Season is complete. Placement rewards, division changes, age transitions, physical stat declines, and squad churn will be processed when you start the next season.
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => startNextSeason()}
                className="flex h-10 items-center justify-center gap-2 rounded-md bg-pitch-700 px-6 text-sm font-semibold text-white transition hover:bg-pitch-900 shadow-sm"
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                <span>Open Transfer Window</span>
              </button>
            </div>
          </div>
        ) : isTransferWindow ? (
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Offseason Transfer Window</h2>
            <div className="mt-3 grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase text-stone-500">Transfer Week</p>
                <p className="mt-1 text-xl font-bold">
                  {gameState.transferMarket.currentWeek} / {gameState.transferMarket.totalWeeks}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-stone-500">Actions Remaining</p>
                <p className="mt-1 text-xl font-bold">{gameState.transferMarket.actionsRemaining}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-stone-500">Next Season</p>
                <p className="mt-1 text-xl font-bold">Fixtures prepared</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-stone-600">
              Review the market and prepare your squad. Matches unlock when you finalize the offseason window.
            </p>
            {transferWindowFinalizationIssues.length > 0 && (
              <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                <p className="font-bold">Squad review required before the season can begin.</p>
                {transferWindowFinalizationIssues.map((issue) => <p key={issue} className="mt-1">{issue}</p>)}
              </div>
            )}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedScreen("market")}
                className="flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
              >
                View Market
              </button>
              <button
                type="button"
                onClick={() => advanceTransferWeek()}
                disabled={gameState.transferMarket.currentWeek >= gameState.transferMarket.totalWeeks}
                className="flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-400"
              >
                Advance Week
              </button>
              <button
                type="button"
                onClick={() => finalizeTransferWindow()}
                disabled={transferWindowFinalizationIssues.length > 0}
                className="flex h-10 items-center justify-center rounded-md bg-pitch-700 px-4 text-sm font-semibold text-white transition hover:bg-pitch-900 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                Finalize Window
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold">Next Fixture</h2>
            {nextFixture && opponent ? (
              <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
                <div>
                  <p className="text-sm text-stone-500">Opponent</p>
                  <p className="text-xl font-bold">{opponent.name}</p>
                </div>
                <div>
                  <p className="text-sm text-stone-500">Matchday</p>
                  <p className="text-xl font-bold">{nextFixture.matchday}</p>
                </div>
                <div>
                  <p className="text-sm text-stone-500">Venue</p>
                  <p className="text-xl font-bold">{venue}</p>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => onPrepareMatch(nextFixture.id)}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-pitch-700 px-4 text-sm font-semibold text-white transition hover:bg-pitch-900"
                  >
                    <Play className="h-4 w-4" aria-hidden="true" />
                    <span>Prepare Match</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-stone-600">No scheduled fixture.</p>
            )}
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">League Table</h2>
          <LeagueTable gameState={gameState} />
        </div>
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <h2 className="mb-4 text-lg font-semibold text-stone-900">Squad Player Stats</h2>

          {activePlayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-stone-500 border border-dashed border-stone-300 rounded-md bg-stone-50">
              <Sparkles className="h-10 w-10 text-stone-400 mb-2" />
              <p className="text-sm font-semibold">No matches played yet this season</p>
              <p className="text-xs text-stone-400 mt-1">Player statistics will populate here as the season progresses.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Card 1: Top Goalscorer */}
              {topScorer && (
                <div className="relative overflow-hidden rounded-lg border border-stone-200 bg-stone-50 p-4 shadow-sm transition hover:shadow-md">
                  <div className="absolute right-3 top-3 opacity-15">
                    <Trophy className="h-12 w-12 text-amber-500" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Top Goalscorer</p>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setSelectedPlayerId(topScorer.player.id)}
                      className="text-base font-bold text-stone-900 hover:underline hover:text-pitch-700 text-left truncate block w-full"
                    >
                      {topScorer.player.firstName} {topScorer.player.lastName}
                    </button>
                    <p className="text-xs text-stone-500 mt-0.5">{topScorer.player.primaryPosition} • Age {topScorer.player.age}</p>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-pitch-800">{topScorer.summary.goals}</span>
                    <span className="text-sm font-semibold text-stone-600">goals</span>
                    <span className="ml-auto text-xs text-stone-400 font-medium">
                      ({topScorer.summary.apps > 0 ? (topScorer.summary.goals / topScorer.summary.apps).toFixed(2) : "0.00"} / game)
                    </span>
                  </div>
                </div>
              )}

              {/* Card 2: Most Assists */}
              {topAssists && (
                <div className="relative overflow-hidden rounded-lg border border-stone-200 bg-stone-50 p-4 shadow-sm transition hover:shadow-md">
                  <div className="absolute right-3 top-3 opacity-15">
                    <Sparkles className="h-12 w-12 text-sky-500" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Most Assists</p>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setSelectedPlayerId(topAssists.player.id)}
                      className="text-base font-bold text-stone-900 hover:underline hover:text-pitch-700 text-left truncate block w-full"
                    >
                      {topAssists.player.firstName} {topAssists.player.lastName}
                    </button>
                    <p className="text-xs text-stone-500 mt-0.5">{topAssists.player.primaryPosition} • Age {topAssists.player.age}</p>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-pitch-800">{topAssists.summary.assists}</span>
                    <span className="text-sm font-semibold text-stone-600">assists</span>
                    <span className="ml-auto text-xs text-stone-400 font-medium">({topAssists.summary.keyPasses} key passes)</span>
                  </div>
                </div>
              )}

              {/* Card 3: Best Form */}
              {bestForm && (
                <div className="relative overflow-hidden rounded-lg border border-stone-200 bg-stone-50 p-4 shadow-sm transition hover:shadow-md">
                  <div className="absolute right-3 top-3 opacity-15">
                    <Flame className="h-12 w-12 text-orange-500" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Best Form (Last 5)</p>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setSelectedPlayerId(bestForm.player.id)}
                      className="text-base font-bold text-stone-900 hover:underline hover:text-pitch-700 text-left truncate block w-full"
                    >
                      {bestForm.player.firstName} {bestForm.player.lastName}
                    </button>
                    <p className="text-xs text-stone-500 mt-0.5">{bestForm.player.primaryPosition} • Age {bestForm.player.age}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-1.5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-pitch-800">{bestForm.formScore.toFixed(1)}</span>
                      <span className="text-sm font-semibold text-stone-600">rating</span>
                    </div>
                    <div className="flex gap-1">
                      {bestForm.summary.formLastFive.map((rating, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-stone-900 text-white"
                          title={`Rating: ${rating}`}
                        >
                          {rating.toFixed(1)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Card 4: Best Average Rating */}
              {bestAvgRating && (
                <div className="relative overflow-hidden rounded-lg border border-stone-200 bg-stone-50 p-4 shadow-sm transition hover:shadow-md">
                  <div className="absolute right-3 top-3 opacity-15">
                    <Award className="h-12 w-12 text-emerald-500" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Highest Avg Rating</p>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setSelectedPlayerId(bestAvgRating.player.id)}
                      className="text-base font-bold text-stone-900 hover:underline hover:text-pitch-700 text-left truncate block w-full"
                    >
                      {bestAvgRating.player.firstName} {bestAvgRating.player.lastName}
                    </button>
                    <p className="text-xs text-stone-500 mt-0.5">{bestAvgRating.player.primaryPosition} • Age {bestAvgRating.player.age}</p>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-pitch-800">{bestAvgRating.summary.avgRating?.toFixed(2)}</span>
                    <span className="text-sm font-semibold text-stone-600">rating</span>
                    <span className="ml-auto text-xs text-stone-400 font-medium">({bestAvgRating.summary.apps} apps)</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {selectedPlayer && (
        <PlayerDetailSheet
          player={selectedPlayer}
          gameState={gameState}
          onAllocateDevelopmentPoint={onAllocateDevelopmentPoint}
          onClose={() => setSelectedPlayerId(null)}
        />
      )}
    </div>
  );
}
