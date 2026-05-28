import {
  calculatePlayerOvr,
  calculatePlayerPot,
  getPlayerPerformanceSummary
} from "../../../domain/player/playerSummaries";
import { getPlayerCapStatus, getPlayerDevelopmentSummary, summarizeGrowth } from "../../../domain/development/playerDevelopment";
import type { GameState } from "../../../domain/types/game";
import type { Player } from "../../../domain/types/player";
import { isGoalkeeperStats } from "../../../domain/types/player";
import { formatCurrency } from "../../../utils/format";
import { PlayerNameButton } from "./PlayerNameButton";
import { squadTablePresets, type SquadTablePresetId } from "./squadTablePresets";

type SquadPreviewProps = {
  players: Player[];
  gameState?: GameState;
  limit?: number;
  preset?: SquadTablePresetId;
  onPresetChange?: (preset: SquadTablePresetId) => void;
  onSelectPlayer?: (player: Player) => void;
};

function statValue(player: Player, key: string): string | number {
  const stats = player.currentStats;
  if (isGoalkeeperStats(stats)) {
    if (key === "PAS/REF") return stats.REF;
    if (key === "SHO/HAN") return stats.HAN;
    if (key === "TAC/DIS") return stats.DIS;
    if (key === "TEC") return stats.TEC;
    if (key === "PHY") return stats.PHY;
    if (key === "MEN") return stats.MEN;
    return "-";
  }

  const map: Record<string, number | undefined> = {
    "PAS/REF": stats.PAS,
    "SHO/HAN": stats.SHO,
    "TAC/DIS": stats.TAC,
    CRO: stats.CRO,
    HEA: stats.HEA,
    ACC: stats.ACC,
    TEC: stats.TEC,
    PHY: stats.PHY,
    MEN: stats.MEN
  };
  return map[key] ?? "-";
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
  if (column === "OVR") return calculatePlayerOvr(player).toFixed(1);
  if (column === "Est. POT") return calculatePlayerPot(player).toFixed(1);
  if (column === "Form") return formPills(performance?.formLastFive ?? []);
  if (column === "Avg Rating") return performance?.display.avgRating ?? "-";
  if (column === "Last Rating") return performance?.display.lastRating ?? "-";
  if (column === "Apps") return performance?.apps ?? 0;
  if (column === "Goals") return performance?.goals ?? 0;
  if (column === "Assists/Key Passes") return `${performance?.assists ?? 0}/${performance?.keyPasses ?? 0}`;
  if (column === "Wage") return formatCurrency(player.contract.wagePerWeek);
  if (column === "Value") return formatCurrency(player.contract.marketValue);
  if (column === "Contract Remaining") return `${player.contract.weeksRemaining} wks`;
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
  if (column === "Cap Status") {
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
  const displayedPlayers = players
    .slice()
    .sort((a, b) => a.primaryPosition.localeCompare(b.primaryPosition) || a.lastName.localeCompare(b.lastName))
    .slice(0, limit);

  return (
    <div className="space-y-3">
      {onPresetChange && (
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
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-stone-300 text-xs uppercase text-stone-500">
              {selectedPreset.columns.map((column) => (
                <th key={column} className="px-3 py-2 font-semibold first:pl-0 last:pr-0">
                  {column}
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
