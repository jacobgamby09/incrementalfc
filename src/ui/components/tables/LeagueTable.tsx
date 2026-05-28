import type { GameState } from "../../../domain/types/game";

type LeagueTableProps = {
  gameState: GameState;
  limit?: number;
};

export function LeagueTable({ gameState, limit }: LeagueTableProps): JSX.Element {
  const season = gameState.seasons[gameState.currentSeasonId];
  const sortedTable = [...season.table]
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return gameState.clubs[a.clubId].name.localeCompare(gameState.clubs[b.clubId].name);
    })
    .slice(0, limit);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-stone-300 text-xs uppercase text-stone-500">
            <th className="py-2 pr-3 font-semibold">Club</th>
            <th className="px-3 py-2 text-right font-semibold">P</th>
            <th className="px-3 py-2 text-right font-semibold">W</th>
            <th className="px-3 py-2 text-right font-semibold">D</th>
            <th className="px-3 py-2 text-right font-semibold">L</th>
            <th className="px-3 py-2 text-right font-semibold">GF</th>
            <th className="px-3 py-2 text-right font-semibold">GA</th>
            <th className="px-3 py-2 text-right font-semibold">GD</th>
            <th className="py-2 pl-3 text-right font-semibold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {sortedTable.map((entry, index) => {
            const club = gameState.clubs[entry.clubId];
            const isPlayerClub = entry.clubId === gameState.playerClubId;

            return (
              <tr
                key={entry.clubId}
                className={`border-b border-stone-200 ${
                  isPlayerClub ? "bg-pitch-50 font-semibold" : "bg-white"
                }`}
              >
                <td className="py-2 pr-3">
                  <span className="mr-2 inline-block w-5 text-right text-stone-500">{index + 1}</span>
                  {club.name}
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
    </div>
  );
}
