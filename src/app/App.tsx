import { useState } from "react";
import { BarChart3, RefreshCw, Settings, Shirt, Trophy } from "lucide-react";
import { confirmNewGame } from "./newGameConfirmation";
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const playerClub = gameState.clubs[gameState.playerClubId];

  function handleNewGame(): void {
    if (!confirmNewGame()) return;
    createNewGame();
    setSettingsOpen(false);
  }

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
            <div className="relative">
              <button
                type="button"
                onClick={() => setSettingsOpen((open) => !open)}
                title="Settings"
                className="flex h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
                <span>Settings</span>
              </button>
              {settingsOpen && (
                <div className="absolute right-0 z-30 mt-2 w-56 rounded-md border border-stone-300 bg-white p-2 shadow-lg">
                  <button
                    type="button"
                    onClick={handleNewGame}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    <span>New Game</span>
                  </button>
                </div>
              )}
            </div>
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
