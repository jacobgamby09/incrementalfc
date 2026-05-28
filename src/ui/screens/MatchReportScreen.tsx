import { useState } from "react";
import type { GameState } from "../../domain/types/game";
import type { MatchTeamStats } from "../../domain/types/match";
import {
  getMatchRatingRows,
  sortMatchRatingRows,
  type MatchRatingFilter,
  type MatchRatingSort,
  type MatchRatingSortColumn,
  type MatchRatingRow
} from "../../domain/player/playerSummaries";
import { getMatchDevelopmentSummary } from "../../domain/development/developmentPresentation";
import { formatCurrency, formatNumber } from "../../utils/format";
import { PlayerDetailSheet } from "../components/player/PlayerDetailSheet";
import { PlayerNameButton } from "../components/player/PlayerNameButton";
import { LeagueTable } from "../components/tables/LeagueTable";

type MatchReportScreenProps = {
  gameState: GameState;
  matchId: string;
  onBackToDashboard: () => void;
};

function statRows(stats: MatchTeamStats): Array<[string, string | number]> {
  return [
    ["Events won", stats.eventsWon],
    ["Chances", stats.chancesCreated],
    ["Shots", stats.shots],
    ["xG", stats.xg.toFixed(2)],
    ["Saves forced", stats.savesForced],
    ["Rebounds won", stats.reboundsWon]
  ];
}

function labelChanceType(value: string): string {
  return value.replace(/_/g, " ");
}

function ratingRowClass(row: MatchRatingRow): string {
  return row.isOwnClub ? "border-pitch-200 bg-pitch-50" : "border-stone-200 bg-stone-50";
}

export function MatchReportScreen({
  gameState,
  matchId,
  onBackToDashboard
}: MatchReportScreenProps): JSX.Element {
  const match = gameState.matches[matchId];
  const [ratingFilter, setRatingFilter] = useState<MatchRatingFilter>("all");
  const [ratingSort, setRatingSort] = useState<MatchRatingSort>({ column: "rating", direction: "desc" });
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedRatingRow, setSelectedRatingRow] = useState<MatchRatingRow | undefined>(undefined);
  const playerIsHome = match.homeClubId === gameState.playerClubId;
  const playerStats = playerIsHome ? match.report.homeStats : match.report.awayStats;
  const opponentStats = playerIsHome ? match.report.awayStats : match.report.homeStats;
  const playerClub = gameState.clubs[gameState.playerClubId];
  const opponentClub = gameState.clubs[playerIsHome ? match.awayClubId : match.homeClubId];
  const allRatingRows = sortMatchRatingRows(getMatchRatingRows(gameState, match, gameState.playerClubId));
  const filteredRatingRows = sortMatchRatingRows(getMatchRatingRows(gameState, match, gameState.playerClubId, ratingFilter), ratingSort);
  const topPerformers = allRatingRows.slice(0, 3);
  const underperformers = allRatingRows.filter((row) => row.rating < 6).slice(0, 3);
  const selectedPlayer = selectedPlayerId ? gameState.players[selectedPlayerId] : undefined;
  const developmentSummary = getMatchDevelopmentSummary(gameState, match);

  function openPlayer(row: MatchRatingRow): void {
    setSelectedPlayerId(row.playerId);
    setSelectedRatingRow(row);
  }

  function openPlayerId(playerId: string): void {
    setSelectedPlayerId(playerId);
    setSelectedRatingRow(allRatingRows.find((row) => row.playerId === playerId));
  }

  function toggleRatingSort(column: MatchRatingSortColumn): void {
    setRatingSort((current) => ({
      column,
      direction: current.column === column && current.direction === "asc" ? "desc" : "asc"
    }));
  }

  function ratingSortMark(column: MatchRatingSortColumn): string {
    if (ratingSort.column !== column) return "";
    return ratingSort.direction === "asc" ? " ↑" : " ↓";
  }

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-stone-300 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-stone-500">Match Report</p>
            <h2 className="mt-1 text-2xl font-bold">{match.report.summary}</h2>
            <p className="mt-1 text-sm text-stone-600">
              {playerClub.name} vs {opponentClub.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="h-10 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white transition hover:bg-pitch-700"
          >
            Back to Dashboard
          </button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <h3 className="mb-3 text-lg font-semibold">Your Stats</h3>
          <div className="space-y-2 text-sm">
            {statRows(playerStats).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <span className="text-stone-600">{label}</span>
                <span className="font-medium tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <h3 className="mb-3 text-lg font-semibold">Opponent Stats</h3>
          <div className="space-y-2 text-sm">
            {statRows(opponentStats).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <span className="text-stone-600">{label}</span>
                <span className="font-medium tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <h3 className="mb-3 text-lg font-semibold">Rewards</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-stone-600">Money</span>
              <span className="font-medium">{formatCurrency(match.rewards.money)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-stone-600">Fans</span>
              <span className="font-medium">{formatNumber(match.rewards.fans)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-stone-600">Reputation</span>
              <span className="font-medium">+{match.rewards.reputation}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-stone-600">Player XP</span>
              <span className="font-medium">{Object.keys(match.rewards.playerXp).length} players</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-stone-600">Training XP</span>
              <span className="font-medium">{formatNumber(developmentSummary.totalTrainingXp)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-stone-600">Tactic Familiarity</span>
              <span className="font-medium">+{developmentSummary.tacticalFamiliarityGained}%</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-stone-300 bg-white p-4">
        <h3 className="mb-3 text-lg font-semibold">Development</h3>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded border border-stone-200 bg-stone-50 px-3 py-2">
            <span className="text-stone-600">Total match XP</span>
            <span className="float-right font-bold tabular-nums">{formatNumber(developmentSummary.totalMatchXp)}</span>
          </div>
          <div className="rounded border border-stone-200 bg-stone-50 px-3 py-2">
            <span className="text-stone-600">Total training XP</span>
            <span className="float-right font-bold tabular-nums">{formatNumber(developmentSummary.totalTrainingXp)}</span>
          </div>
          <div className="rounded border border-stone-200 bg-stone-50 px-3 py-2">
            <span className="text-stone-600">Tactical familiarity</span>
            <span className="float-right font-bold tabular-nums">+{developmentSummary.tacticalFamiliarityGained}%</span>
          </div>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold uppercase text-stone-500">Top XP Gainers</h4>
            <div className="mt-2 space-y-2 text-sm">
              {developmentSummary.topXpGainers.slice(0, 4).map((entry) => {
                const player = gameState.players[entry.playerId];
                return (
                <div key={entry.playerId} className="rounded border border-stone-200 bg-stone-50 px-3 py-2" title={entry.reasonText}>
                  <div className="flex justify-between gap-3">
                    {player ? (
                      <PlayerNameButton
                        player={player}
                        isOwnClub
                        onClick={() => openPlayerId(entry.playerId)}
                      />
                    ) : (
                      <span className="font-medium">{entry.playerName}</span>
                    )}
                    <span className="flex items-center gap-2">
                      {entry.statIncreaseBadges.map((badge) => (
                        <span key={badge} className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                          {badge}
                        </span>
                      ))}
                      <span className="font-bold tabular-nums">+{entry.totalXp} XP</span>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded bg-stone-200">
                    <div className="h-full rounded bg-emerald-500" style={{ width: `${Math.min(100, entry.progressPercent)}%` }} />
                  </div>
                </div>
                );
              })}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase text-stone-500">Stat Increases</h4>
            <div className="mt-2 space-y-2 text-sm">
              {developmentSummary.noGrowthMessage && (
                <div className="rounded border border-stone-200 bg-stone-50 px-3 py-2 text-stone-600">
                  {developmentSummary.noGrowthMessage}
                </div>
              )}
              {developmentSummary.improvedPlayers.map((summary) => (
                <div key={summary.playerId} className="rounded border border-pitch-200 bg-pitch-50 px-3 py-2">
                  {gameState.players[summary.playerId] ? (
                    <PlayerNameButton
                      player={gameState.players[summary.playerId]}
                      isOwnClub
                      onClick={() => openPlayerId(summary.playerId)}
                    />
                  ) : (
                    <span className="font-semibold">{summary.playerName}</span>
                  )}
                  <span className="ml-2 text-stone-700">
                    {summary.statGrowth.map((growth) => `+${growth.to - growth.from} ${growth.statKey}`).join(", ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <h3 className="mb-3 text-lg font-semibold">Feedback</h3>
          <div className="space-y-3">
            {match.report.keyProblems.map((problem) => (
              <div key={problem.code} className="rounded border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
                <span className="font-semibold capitalize">{problem.severity}</span>
                <span className="ml-2">{problem.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <h3 className="mb-3 text-lg font-semibold">Recommendations</h3>
          <div className="space-y-3">
            {match.report.recommendations.map((recommendation) => (
              <div key={`${recommendation.problemCode}-${recommendation.text}`} className="rounded border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
                <span className="font-semibold capitalize">{recommendation.category}</span>
                <span className="ml-2">{recommendation.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <h3 className="mb-3 text-lg font-semibold">Top Performers</h3>
          <div className="space-y-3">
            {topPerformers.map((row) => {
              const player = gameState.players[row.playerId];
              return (
                <div key={row.playerId} className={`rounded border px-3 py-2 text-sm ${ratingRowClass(row)}`}>
                  <div className="flex items-center justify-between gap-3">
                    {player && (
                      <PlayerNameButton
                        player={player}
                        clubTag={row.clubShortName}
                        position={row.position}
                        isOwnClub={row.isOwnClub}
                        onClick={() => openPlayer(row)}
                      />
                    )}
                    <span className="font-bold tabular-nums text-pitch-800">{row.rating.toFixed(1)}</span>
                  </div>
                  <p className="mt-1 text-stone-600">{row.keyStatsSummary}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <h3 className="mb-3 text-lg font-semibold">Underperformers</h3>
          <div className="space-y-3">
            {underperformers.length === 0 && (
              <div className="rounded border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
                No major individual underperformance flagged.
              </div>
            )}
            {underperformers.map((row) => {
              const player = gameState.players[row.playerId];
              return (
                <div key={row.playerId} className={`rounded border px-3 py-2 text-sm ${ratingRowClass(row)}`}>
                  <div className="flex items-center justify-between gap-3">
                    {player && (
                      <PlayerNameButton
                        player={player}
                        clubTag={row.clubShortName}
                        position={row.position}
                        isOwnClub={row.isOwnClub}
                        onClick={() => openPlayer(row)}
                      />
                    )}
                    <span className="font-bold tabular-nums text-orange-700">{row.rating.toFixed(1)}</span>
                  </div>
                  <p className="mt-1 text-stone-600">{row.keyStatsSummary}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-md border border-stone-300 bg-white p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold">Player Ratings</h3>
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "All"],
              ["player", playerClub.shortName],
              ["opponent", opponentClub.shortName]
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setRatingFilter(value as MatchRatingFilter)}
                className={`h-8 rounded-md border px-3 text-xs font-semibold transition ${
                  ratingFilter === value ? "border-pitch-700 bg-pitch-700 text-white" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-stone-300 text-xs uppercase text-stone-500">
                <th className="py-2 pr-3 font-semibold">
                  <button type="button" onClick={() => toggleRatingSort("player")} className="font-semibold underline-offset-2 hover:underline">
                    Player{ratingSortMark("player")}
                  </button>
                </th>
                <th className="px-3 py-2 font-semibold">
                  <button type="button" onClick={() => toggleRatingSort("club")} className="font-semibold underline-offset-2 hover:underline">
                    Club{ratingSortMark("club")}
                  </button>
                </th>
                <th className="px-3 py-2 font-semibold">
                  <button type="button" onClick={() => toggleRatingSort("position")} className="font-semibold underline-offset-2 hover:underline">
                    Position{ratingSortMark("position")}
                  </button>
                </th>
                <th className="px-3 py-2 text-right font-semibold">
                  <button type="button" onClick={() => toggleRatingSort("rating")} className="font-semibold underline-offset-2 hover:underline">
                    Rating{ratingSortMark("rating")}
                  </button>
                </th>
                <th className="py-2 pl-3 font-semibold">Key Stats</th>
              </tr>
            </thead>
            <tbody>
              {filteredRatingRows.map((row) => {
                const player = gameState.players[row.playerId];
                return (
                <tr key={row.playerId} className={`border-b ${row.isOwnClub ? "bg-pitch-50" : "bg-white"}`}>
                  <td className="py-2 pr-3 font-medium">
                    {player && (
                      <PlayerNameButton
                        player={player}
                        isOwnClub={row.isOwnClub}
                        onClick={() => openPlayer(row)}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">{row.clubShortName}</td>
                  <td className="px-3 py-2">{row.position}</td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums">{row.rating.toFixed(1)}</td>
                  <td className="py-2 pl-3 text-stone-700">{row.keyStatsSummary}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-stone-300 bg-white p-4">
        <h3 className="mb-3 text-lg font-semibold">Your Chance Breakdown</h3>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {Object.entries(playerStats.chanceTypeBreakdown).map(([chanceType, count]) => (
            <div key={chanceType} className="rounded border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
              <span className="capitalize text-stone-600">{labelChanceType(chanceType)}</span>
              <span className="float-right font-semibold tabular-nums">{count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-stone-300 bg-white p-4">
        <h3 className="mb-3 text-lg font-semibold">Updated League Table</h3>
        <LeagueTable gameState={gameState} />
      </section>

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
