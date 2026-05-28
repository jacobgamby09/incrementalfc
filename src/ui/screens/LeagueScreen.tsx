import type { GameState } from "../../domain/types/game";
import { LeagueTable } from "../components/tables/LeagueTable";

type LeagueScreenProps = {
  gameState: GameState;
};

export function LeagueScreen({ gameState }: LeagueScreenProps): JSX.Element {
  const season = gameState.seasons[gameState.currentSeasonId];
  const currentMatchdayFixtures = season.fixtures.filter(
    (fixture) => fixture.matchday === season.currentMatchday
  );

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-stone-300 bg-white p-4">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">League Table</h2>
            <p className="text-sm text-stone-600">10 clubs, 18 matches, top 2 promoted</p>
          </div>
          <p className="text-sm font-medium text-stone-700">Matchday {season.currentMatchday}</p>
        </div>
        <LeagueTable gameState={gameState} />
      </section>

      <section className="rounded-md border border-stone-300 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Current Matchday</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {currentMatchdayFixtures.map((fixture) => (
            <div
              key={fixture.id}
              className="flex items-center justify-between rounded border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
            >
              <span className="font-medium">{gameState.clubs[fixture.homeClubId].name}</span>
              <span className="px-2 text-xs uppercase text-stone-500">
                {fixture.matchId && gameState.matches[fixture.matchId]
                  ? `${gameState.matches[fixture.matchId].result.homeGoals}-${gameState.matches[fixture.matchId].result.awayGoals}`
                  : "vs"}
              </span>
              <span className="font-medium">{gameState.clubs[fixture.awayClubId].name}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
