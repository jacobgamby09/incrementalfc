import { Play, BookOpen, AlertCircle } from "lucide-react";
import type { GameState } from "../../domain/types/game";
import { useGameStore } from "../../store/gameStore";

type FixturesScreenProps = {
  gameState: GameState;
};

export function FixturesScreen({ gameState }: FixturesScreenProps): JSX.Element {
  const { prepareNextMatch, setViewingMatch } = useGameStore();
  const playerClub = gameState.clubs[gameState.playerClubId];
  const season = gameState.seasons[gameState.currentSeasonId];

  // Get all fixtures for the player's club
  const clubFixtures = season.fixtures
    .filter(
      (fixture) => fixture.homeClubId === playerClub.id || fixture.awayClubId === playerClub.id
    )
    .sort((a, b) => a.matchday - b.matchday);

  // Find the next scheduled fixture for the player's club
  const nextScheduledFixture = season.fixtures
    .filter(
      (fixture) =>
        fixture.status === "scheduled" &&
        (fixture.homeClubId === playerClub.id || fixture.awayClubId === playerClub.id)
    )
    .sort((a, b) => a.matchday - b.matchday)[0];

  return (
    <div className="space-y-6">
      <header className="rounded-md border border-stone-300 bg-white p-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-900">Fixtures & Results</h2>
          <p className="text-sm text-stone-600">
            View full fixture list and match history for the current season.
          </p>
        </div>
      </header>

      <div className="rounded-md border border-stone-300 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 w-24">Matchday</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 w-20">Venue</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Opponent</th>
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-stone-500 w-32">Result</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-stone-500 w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 bg-white">
              {clubFixtures.map((fixture) => {
                const isHome = fixture.homeClubId === playerClub.id;
                const opponentId = isHome ? fixture.awayClubId : fixture.homeClubId;
                const opponent = gameState.clubs[opponentId];
                const isNextMatch = nextScheduledFixture?.id === fixture.id;

                const match = fixture.matchId ? gameState.matches[fixture.matchId] : null;
                const scoreDisplay = match
                  ? `${match.result.homeGoals} - ${match.result.awayGoals}`
                  : "vs";

                let outcomeBadge = null;
                if (match) {
                  const homeGoals = match.result.homeGoals;
                  const awayGoals = match.result.awayGoals;
                  let outcome: "W" | "D" | "L";
                  if (homeGoals === awayGoals) {
                    outcome = "D";
                  } else if (isHome) {
                    outcome = homeGoals > awayGoals ? "W" : "L";
                  } else {
                    outcome = awayGoals > homeGoals ? "W" : "L";
                  }

                  const badgeColors = {
                    W: "bg-emerald-500 text-white",
                    D: "bg-amber-500 text-white",
                    L: "bg-red-500 text-white"
                  };

                  outcomeBadge = (
                    <span 
                      className={`inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-black uppercase leading-none shadow-sm ${badgeColors[outcome]}`}
                      title={outcome === "W" ? "Won" : outcome === "D" ? "Draw" : "Lost"}
                    >
                      {outcome}
                    </span>
                  );
                }

                return (
                  <tr
                    key={fixture.id}
                    className={`hover:bg-stone-50/50 transition ${
                      isNextMatch ? "bg-pitch-50/30 border-l-4 border-l-pitch-700" : ""
                    }`}
                  >
                    {/* Matchday */}
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-stone-900 tabular-nums">
                      M {fixture.matchday}
                    </td>

                    {/* Venue */}
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-600">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-bold border ${
                          isHome
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-red-100 text-red-800 border-red-200"
                        }`}
                      >
                        {isHome ? "HOME" : "AWAY"}
                      </span>
                    </td>

                    {/* Opponent */}
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-900">{opponent.name}</span>
                        {isNextMatch && (
                          <span className="inline-flex items-center gap-1 rounded bg-pitch-100 px-2 py-0.5 text-[10px] font-bold text-pitch-800 border border-pitch-200 uppercase tracking-wide">
                            Next
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Result & Score */}
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-bold text-stone-900 tabular-nums">
                          {scoreDisplay}
                        </span>
                        {outcomeBadge}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-right">
                      {fixture.status === "played" && fixture.matchId ? (
                        <button
                          type="button"
                          onClick={() => setViewingMatch(fixture.matchId!, "fixtures")}
                          className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 shadow-sm transition"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>View Report</span>
                        </button>
                      ) : isNextMatch ? (
                        <button
                          type="button"
                          onClick={() => prepareNextMatch(fixture.id)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-pitch-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pitch-900 shadow-sm transition"
                        >
                          <Play className="h-3.5 w-3.5" />
                          <span>Prepare Match</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-stone-400 font-medium">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>Scheduled</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
