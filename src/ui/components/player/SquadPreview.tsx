import { useState } from "react";
import {
  calculatePlayerOvr,
  calculatePlayerPot,
  getPlayerPerformanceSummary
} from "../../../domain/player/playerSummaries";
import { getPlayerCapStatus, getPlayerDevelopmentSummary, summarizeGrowth } from "../../../domain/development/playerDevelopment";
import type { GameState } from "../../../domain/types/game";
import type { Player } from "../../../domain/types/player";
import type { PlayerPosition } from "../../../domain/types/player";
import { getStatDefinition, statTooltip } from "../../../domain/player/statDefinitions";
import {
  filterSquadPlayers,
  getSquadStatValue,
  sortSquadPlayers,
  type SquadAgeFilter,
  type SquadFilters,
  type SquadSort
} from "../../../domain/player/squadTableView";
import { formatCurrency } from "../../../utils/format";
import { PlayerNameButton } from "./PlayerNameButton";
import { StatLabel } from "./StatLabel";
import { squadTablePresets, type SquadTablePresetId } from "./squadTablePresets";
import { getPlayerFitness, getReadinessLabel, getReadinessColor } from "../../../domain/fitness/playerFitness";
import { squadRoleLabels } from "../../../domain/player/playerContext";
import { MoraleIndicator } from "./MoraleIndicator";
import { getBestPlayerTacticalFit } from "../../../domain/player/tacticalFit";

type SquadPreviewProps = {
  players: Player[];
  gameState?: GameState;
  limit?: number;
  preset?: SquadTablePresetId;
  onPresetChange?: (preset: SquadTablePresetId) => void;
  onSelectPlayer?: (player: Player) => void;
};

function statValue(player: Player, key: string): string | number {
  return getSquadStatValue(player, key);
}

function formPills(ratings: number[]): JSX.Element {
  if (ratings.length === 0) return <span className="text-stone-500">-</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {ratings.map((rating, index) => (
        <span key={`${rating}-${index}`} className="rounded bg-stone-900 px-1.5 py-0.5 text-[11px] font-bold text-white tabular-nums">
          {rating.toFixed(1)}
        </span>
      ))}
    </div>
  );
}

function cellValue(player: Player, column: string, gameState?: GameState): string | number | JSX.Element {
  const performance = gameState ? getPlayerPerformanceSummary(gameState, player.id) : undefined;

  if (column === "Age") return player.age;
  if (column === "Position") return player.primaryPosition;
  if (column === "OVR") return Math.round(calculatePlayerOvr(player));
  if (column === "POT" || column === "Est. POT") return Math.round(calculatePlayerPot(player));
  if (column === "Dev Points") {
    const points = player.development.unspentDevelopmentPoints ?? 0;
    return points > 0 ? (
      <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
        {points} ready
      </span>
    ) : "-";
  }
  if (column === "Squad Role") return squadRoleLabels[player.squadRole];
  if (column === "Best Focus") {
    const fit = getBestPlayerTacticalFit(player);
    return (
      <span className="inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-xs font-semibold text-sky-900" title={`Best tactical focus fit based on current attributes: ${fit.primaryStats.join(", ")}`}>
        {fit.label} <span className="tabular-nums">{fit.score}%</span>
      </span>
    );
  }
  if (column === "Morale") return <MoraleIndicator morale={player.status.morale} compact />;
  if (column === "Market Rep") return player.marketReputation;
  if (column === "Readiness") {
    const fitness = getPlayerFitness(player);
    const label = getReadinessLabel(fitness);
    const colors = getReadinessColor(fitness);
    return (
      <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-semibold ${colors.bg} ${colors.text} ${colors.border}`}>
        {label} ({fitness})
      </span>
    );
  }
  if (column === "Form") return formPills(performance?.formLastFive ?? []);
  if (column === "Avg Rating") return performance?.display.avgRating ?? "-";
  if (column === "Last Rating") return performance?.display.lastRating ?? "-";
  if (column === "Apps") return performance?.apps ?? 0;
  if (column === "Goals") return performance?.goals ?? 0;
  if (column === "Assists/Key Passes") return `${performance?.assists ?? 0}/${performance?.keyPasses ?? 0}`;
  if (column === "Wage") return formatCurrency(player.contract.wagePerWeek);
  if (column === "Value") return formatCurrency(player.contract.marketValue);
  if (column === "Contract Remaining") {
    const seasons = player.contract.seasonsRemaining;
    return `${seasons} season${seasons === 1 ? "" : "s"}`;
  }
  if (column === "Development Cap") {
    const club = gameState && player.clubId ? gameState.clubs[player.clubId] : undefined;
    return club ? getPlayerDevelopmentSummary(player, club).developmentCap : "-";
  }
  if (column === "Match XP") return player.development.matchXp;
  if (column === "Training XP") return player.development.trainingXp;
  if (column === "Last XP") return `+${player.development.lastMatchXpGained} / +${player.development.lastTrainingXpGained}`;
  if (column === "Facility") {
    const club = gameState && player.clubId ? gameState.clubs[player.clubId] : undefined;
    const summary = club ? getPlayerDevelopmentSummary(player, club) : undefined;
    return summary?.cappedByFacility ? "Capped" : summary?.untappedPotential ? "Untapped" : "OK";
  }
  if (column === "Potential") {
    const club = gameState && player.clubId ? gameState.clubs[player.clubId] : undefined;
    const summary = club ? getPlayerDevelopmentSummary(player, club) : undefined;
    return summary?.cappedByPotential ? "Capped" : "Open";
  }
  if (column === "Recent Growth") return summarizeGrowth(player);
  if (column === "Development Status") {
    const club = gameState && player.clubId ? gameState.clubs[player.clubId] : undefined;
    return club ? getPlayerCapStatus(player, club) : "Developing";
  }
  if (column === "Progress") {
    const club = gameState && player.clubId ? gameState.clubs[player.clubId] : undefined;
    return club ? `${getPlayerDevelopmentSummary(player, club).nextProgressPercent}%` : "-";
  }
  return statValue(player, column);
}

export function SquadPreview({
  players,
  gameState,
  limit,
  preset = "overview",
  onPresetChange,
  onSelectPlayer
}: SquadPreviewProps): JSX.Element {
  const selectedPreset = squadTablePresets.find((candidate) => candidate.id === preset) ?? squadTablePresets[0];
  const [sort, setSort] = useState<SquadSort>({ column: "Position", direction: "asc" });
  const [filters, setFilters] = useState<SquadFilters>({ position: "all", developmentStatus: "all", ageGroup: "all" });
  const positions = Array.from(new Set(players.map((player) => player.primaryPosition))).sort();
  const developmentStatuses = Array.from(new Set(players.map((player) => {
    const club = gameState && player.clubId ? gameState.clubs[player.clubId] : undefined;
    return club ? getPlayerCapStatus(player, club) : "Developing";
  }))).sort();
  const displayedPlayers = sortSquadPlayers(filterSquadPlayers(players, gameState, filters), sort, gameState).slice(0, limit);

  function toggleSort(column: string): void {
    setSort((current) => ({
      column,
      direction: current.column === column && current.direction === "asc" ? "desc" : "asc"
    }));
  }

  function sortMark(column: string): string {
    if (sort.column !== column) return "";
    return sort.direction === "asc" ? " ^" : " v";
  }

  return (
    <div className="space-y-3">
      {onPresetChange && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {squadTablePresets.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => onPresetChange(candidate.id)}
                className={`h-9 rounded-md border px-3 text-sm font-semibold transition ${
                  selectedPreset.id === candidate.id
                    ? "border-pitch-700 bg-pitch-700 text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                {candidate.label}
              </button>
            ))}
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <label className="font-medium text-stone-700">
              Position
              <select
                value={filters.position}
                onChange={(event) => setFilters((current) => ({ ...current, position: event.target.value as "all" | PlayerPosition }))}
                className="mt-1 h-9 w-full rounded border border-stone-300 bg-white px-2 text-sm"
              >
                <option value="all">All positions</option>
                {positions.map((position) => <option key={position} value={position}>{position}</option>)}
              </select>
            </label>
            <label className="font-medium text-stone-700">
              Development Status
              <select
                value={filters.developmentStatus}
                onChange={(event) => setFilters((current) => ({ ...current, developmentStatus: event.target.value as SquadFilters["developmentStatus"] }))}
                className="mt-1 h-9 w-full rounded border border-stone-300 bg-white px-2 text-sm"
              >
                <option value="all">All development statuses</option>
                {developmentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <label className="font-medium text-stone-700">
              Age Group
              <select
                value={filters.ageGroup}
                onChange={(event) => setFilters((current) => ({ ...current, ageGroup: event.target.value as SquadAgeFilter }))}
                className="mt-1 h-9 w-full rounded border border-stone-300 bg-white px-2 text-sm"
              >
                <option value="all">All ages</option>
                <option value="youth">Youth</option>
                <option value="developing">Developing</option>
                <option value="prime">Prime</option>
                <option value="veteran">Veteran</option>
              </select>
            </label>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-stone-300 text-xs uppercase text-stone-500">
              {selectedPreset.columns.map((column) => (
                <th key={column} className="px-3 py-2 font-semibold first:pl-0 last:pr-0">
                  {getStatDefinition(column) ? (
                    <span className="inline-flex items-center gap-1" title={statTooltip(column)}>
                      <StatLabel code={column} onClick={() => toggleSort(column)} suffix={sortMark(column)} />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleSort(column)}
                      className="font-semibold underline-offset-2 hover:underline"
                      title={statTooltip(column)}
                    >
                      {column}{sortMark(column)}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedPlayers.map((player) => (
              <tr key={player.id} className="border-b border-stone-200 bg-white">
                {selectedPreset.columns.map((column) => (
                  <td key={`${player.id}-${column}`} className="px-3 py-2 first:pl-0 last:pr-0">
                    {column === "Player" ? (
                      onSelectPlayer ? (
                        <PlayerNameButton player={player} onClick={() => onSelectPlayer(player)} />
                      ) : (
                        `${player.firstName} ${player.lastName}`
                      )
                    ) : (
                      cellValue(player, column, gameState)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

