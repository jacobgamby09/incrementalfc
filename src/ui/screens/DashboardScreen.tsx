import { CalendarDays, Landmark, Play, Shield, TrendingUp } from "lucide-react";
import type { GameState } from "../../domain/types/game";
import { formatCurrency, formatNumber } from "../../utils/format";
import { LeagueTable } from "../components/tables/LeagueTable";
import { SquadPreview } from "../components/player/SquadPreview";

type DashboardScreenProps = {
  gameState: GameState;
  onPrepareMatch: (fixtureId?: string) => void;
};

export function DashboardScreen({ gameState, onPrepareMatch }: DashboardScreenProps): JSX.Element {
  const playerClub = gameState.clubs[gameState.playerClubId];
  const season = gameState.seasons[gameState.currentSeasonId];
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
        </div>
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-500">
            <CalendarDays className="h-4 w-4 text-pitch-700" aria-hidden="true" />
            Season
          </div>
          <p className="mt-2 text-2xl font-bold">Season {gameState.currentDate.seasonNumber}</p>
          <p className="text-sm text-stone-600">Matchday {season.currentMatchday}</p>
        </div>
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-500">
            <Landmark className="h-4 w-4 text-pitch-700" aria-hidden="true" />
            Cash
          </div>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(playerClub.economy.cashBalance)}</p>
          <p className="text-sm text-stone-600">
            Wages {formatCurrency(playerClub.economy.playerWageTotal)}/wk
          </p>
        </div>
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-500">
            <TrendingUp className="h-4 w-4 text-pitch-700" aria-hidden="true" />
            Support
          </div>
          <p className="mt-2 text-2xl font-bold">{formatNumber(playerClub.fans)}</p>
          <p className="text-sm text-stone-600">
            Matchday {formatCurrency(playerClub.economy.matchdayIncomeEstimate)}
          </p>
        </div>
      </section>

      <section className="rounded-md border border-stone-300 bg-white p-4">
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
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">League Table</h2>
          <LeagueTable gameState={gameState} />
        </div>
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">Squad Preview</h2>
          <SquadPreview players={playerSquad} gameState={gameState} limit={12} />
        </div>
      </section>
    </div>
  );
}
