import { BarChart3, RefreshCw, Shirt, Trophy } from "lucide-react";
import { routes } from "./routes";
import { useGameStore, type ScreenId } from "../store/gameStore";
import { DashboardScreen } from "../ui/screens/DashboardScreen";
import { LeagueScreen } from "../ui/screens/LeagueScreen";
import { SquadScreen } from "../ui/screens/SquadScreen";
import { MatchReportScreen } from "../ui/screens/MatchReportScreen";
import { MatchSimulationScreen } from "../ui/screens/MatchSimulationScreen";
import { OpponentReportScreen } from "../ui/screens/OpponentReportScreen";
import { TacticsScreen } from "../ui/screens/TacticsScreen";

const routeIcon: Partial<Record<ScreenId, typeof BarChart3>> = {
  dashboard: BarChart3,
  league: Trophy,
  squad: Shirt
};

export function App(): JSX.Element {
  const {
    gameState,
    selectedScreen,
    selectedFixtureId,
    draftTactic,
    draftLineup,
    lineupErrors,
    lastPlayerMatchId,
    createNewGame,
    setSelectedScreen,
    prepareNextMatch,
    setTacticOption,
    setLineupSlot,
    autoSelectDraftLineup,
    playSelectedFixture,
    viewMatchReport
  } = useGameStore();
  const playerClub = gameState.clubs[gameState.playerClubId];

  return (
    <div className="min-h-screen bg-stone-100 text-stone-950">
      <header className="border-b border-stone-300 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-pitch-700">
              Football Manager Incremental
            </p>
            <h1 className="text-2xl font-bold">{playerClub.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex rounded-md border border-stone-300 bg-stone-50 p-1">
              {routes.map((route) => {
                const Icon = routeIcon[route.id] ?? BarChart3;
                const isActive = selectedScreen === route.id;

                return (
                  <button
                    key={route.id}
                    type="button"
                    onClick={() => setSelectedScreen(route.id)}
                    title={route.label}
                    className={`flex h-9 items-center gap-2 rounded px-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-pitch-700 text-white shadow-sm"
                        : "text-stone-700 hover:bg-white hover:text-stone-950"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{route.label}</span>
                  </button>
                );
              })}
            </nav>
            <button
              type="button"
              onClick={createNewGame}
              title="Create New Game"
              className="flex h-10 items-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white transition hover:bg-pitch-700"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>New Game</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        {selectedScreen === "dashboard" && (
          <DashboardScreen gameState={gameState} onPrepareMatch={prepareNextMatch} />
        )}
        {selectedScreen === "league" && <LeagueScreen gameState={gameState} />}
        {selectedScreen === "squad" && <SquadScreen gameState={gameState} />}
        {selectedScreen === "opponentReport" && selectedFixtureId && (
          <OpponentReportScreen
            gameState={gameState}
            fixtureId={selectedFixtureId}
            onContinue={() => setSelectedScreen("tactics")}
          />
        )}
        {selectedScreen === "tactics" && selectedFixtureId && draftTactic && draftLineup && (
          <TacticsScreen
            gameState={gameState}
            fixtureId={selectedFixtureId}
            draftTactic={draftTactic}
            draftLineup={draftLineup}
            lineupErrors={lineupErrors}
            onSetTacticOption={setTacticOption}
            onSetLineupSlot={setLineupSlot}
            onAutoSelectLineup={autoSelectDraftLineup}
            onPlayMatch={playSelectedFixture}
          />
        )}
        {selectedScreen === "matchSimulation" && lastPlayerMatchId && (
          <MatchSimulationScreen
            gameState={gameState}
            matchId={lastPlayerMatchId}
            onViewReport={viewMatchReport}
          />
        )}
        {selectedScreen === "matchReport" && lastPlayerMatchId && (
          <MatchReportScreen
            gameState={gameState}
            matchId={lastPlayerMatchId}
            onBackToDashboard={() => setSelectedScreen("dashboard")}
          />
        )}
      </main>
    </div>
  );
}
