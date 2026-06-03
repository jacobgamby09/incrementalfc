import { useState } from "react";
import { defaultLeagueSort, sortLeagueTable, type LeagueSort, type LeagueSortColumn } from "../../../domain/league/leagueTableView";
import type { GameState } from "../../../domain/types/game";
import { ClubDetailModal } from "../club/ClubDetailModal";

type LeagueTableProps = {
  gameState: GameState;
  limit?: number;
};

export function LeagueTable({ gameState, limit }: LeagueTableProps): JSX.Element {
  const season = gameState.seasons[gameState.currentSeasonId];
  const league = gameState.leagues[season.leagueId];
  const promotionSpots = league?.promotionSpots ?? 0;
  const relegationSpots = league?.relegationSpots ?? 0;
  const teamsCount = league?.teamsCount ?? 10;

  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [sort, setSort] = useState<LeagueSort>(defaultLeagueSort);
  const sortedTable = sortLeagueTable(season.table, gameState, sort).slice(0, limit);
  const columns: Array<{ label: LeagueSortColumn; className: string }> = [
    { label: "Club", className: "py-2 pr-3 text-left" },
    { label: "P", className: "px-3 py-2 text-right" },
    { label: "W", className: "px-3 py-2 text-right" },
    { label: "D", className: "px-3 py-2 text-right" },
    { label: "L", className: "px-3 py-2 text-right" },
    { label: "GF", className: "px-3 py-2 text-right" },
    { label: "GA", className: "px-3 py-2 text-right" },
    { label: "GD", className: "px-3 py-2 text-right" },
    { label: "Pts", className: "py-2 pl-3 text-right" }
  ];

  function toggleSort(column: LeagueSortColumn): void {
    setSort((current) => ({
      column,
      direction: current.column === column && current.direction === "asc" ? "desc" : "asc"
    }));
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-stone-300 text-xs uppercase text-stone-500">
            {columns.map((column) => (
              <th key={column.label} className={`${column.className} font-semibold`}>
                <button type="button" onClick={() => toggleSort(column.label)} className="font-semibold underline-offset-2 hover:underline">
                  {column.label}{sort.column === column.label ? (sort.direction === "asc" ? " ^" : " v") : ""}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedTable.map((entry, index) => {
            const club = gameState.clubs[entry.clubId];
            const isPlayerClub = entry.clubId === gameState.playerClubId;

            // Mark the configured promotion cutoff when this division has promotion spots.
            const isPromotionLine = promotionSpots > 0 && index === promotionSpots - 1;
            // Mark the configured relegation cutoff when this division has relegation spots.
            const isRelegationLine = relegationSpots > 0 && index === teamsCount - relegationSpots - 1;

            const borderClass = isPromotionLine
              ? "border-b-2 border-dashed border-emerald-500/60"
              : isRelegationLine
              ? "border-b-2 border-dashed border-rose-500/60"
              : "border-b border-stone-200";

            return (
              <tr
                key={entry.clubId}
                className={`${borderClass} ${
                  isPlayerClub ? "bg-pitch-50 font-semibold" : "bg-white"
                }`}
              >
                <td className="py-2 pr-3">
                  <span className="mr-2 inline-block w-5 text-right text-stone-500">{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedClubId(entry.clubId)}
                    className="font-semibold text-pitch-700 hover:underline text-left"
                  >
                    {club.name}
                  </button>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{entry.played}</td>
                <td className="px-3 py-2 text-right tabular-nums">{entry.wins}</td>
                <td className="px-3 py-2 text-right tabular-nums">{entry.draws}</td>
                <td className="px-3 py-2 text-right tabular-nums">{entry.losses}</td>
                <td className="px-3 py-2 text-right tabular-nums">{entry.goalsFor}</td>
                <td className="px-3 py-2 text-right tabular-nums">{entry.goalsAgainst}</td>
                <td className="px-3 py-2 text-right tabular-nums">{entry.goalDifference}</td>
                <td className="py-2 pl-3 text-right tabular-nums">{entry.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedClubId && (
        <ClubDetailModal
          clubId={selectedClubId}
          gameState={gameState}
          onClose={() => setSelectedClubId(null)}
        />
      )}
    </div>
  );
}
