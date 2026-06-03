import { useState } from "react";
import { BarChart3, Download, RefreshCw, Save, Settings, Shirt, Trophy, ShoppingBag, CalendarDays, Sliders, Building2, Dumbbell, Landmark } from "lucide-react";
import { confirmNewGame } from "./newGameConfirmation";
import { getLocalGameSaveInfo, loadGameFromLocalStorage, saveGameToLocalStorage } from "./gameSave";
import { routes } from "./routes";
import { useGameStore, type ScreenId } from "../store/gameStore";
import { DashboardScreen } from "../ui/screens/DashboardScreen";
import { LeagueScreen } from "../ui/screens/LeagueScreen";
import { FixturesScreen } from "../ui/screens/FixturesScreen";
import { SquadScreen } from "../ui/screens/SquadScreen";
import { MatchReportScreen } from "../ui/screens/MatchReportScreen";
import { MatchRewardsScreen } from "../ui/screens/MatchRewardsScreen";
import { MatchSimulationScreen } from "../ui/screens/MatchSimulationScreen";
import { OpponentReportScreen } from "../ui/screens/OpponentReportScreen";
import { TacticsScreen } from "../ui/screens/TacticsScreen";
import { MarketScreen } from "../ui/screens/MarketScreen";
import { FacilitiesScreen } from "../ui/screens/FacilitiesScreen";
import { TrainingScreen } from "../ui/screens/TrainingScreen";
import { EconomyScreen } from "../ui/screens/EconomyScreen";

const routeIcon: Partial<Record<ScreenId, typeof BarChart3>> = {
  dashboard: BarChart3,
  league: Trophy,
  fixtures: CalendarDays,
  tactics: Sliders,
  squad: Shirt,
  market: ShoppingBag,
  facilities: Building2,
  training: Dumbbell,
  economy: Landmark
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
    matchReportBackScreen,
    createNewGame,
    loadGame,
    setSelectedScreen,
    prepareNextMatch,
    setTacticOption,
    setLineupSlot,
    autoSelectDraftLineup,
    saveDraftTactic,
    playSelectedFixture,
    viewMatchReport,
    startFacilityUpgrade,
    resolveYouthProspect,
    assignFocusedTraining,
    allocateDevelopmentPoint
  } = useGameStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveInfo, setSaveInfo] = useState(() => getLocalGameSaveInfo());
  const [settingsMessage, setSettingsMessage] = useState<string>();
  const playerClub = gameState.clubs[gameState.playerClubId];

  function handleNewGame(): void {
    if (!confirmNewGame()) return;
    createNewGame();
    setSettingsOpen(false);
  }

  function handleSaveGame(): void {
    const nextSaveInfo = saveGameToLocalStorage(gameState);
    setSaveInfo(nextSaveInfo);
    setSettingsMessage(nextSaveInfo ? "Game saved in this browser." : "Unable to save in this browser.");
  }

  function handleLoadGame(): void {
    const savedGame = loadGameFromLocalStorage();
    if (!savedGame) {
      setSettingsMessage("No valid browser save found.");
      return;
    }
    if (!window.confirm("Load the browser save? Any unsaved progress in the current game will be lost.")) return;
    loadGame(savedGame);
    setSettingsMessage("Saved game loaded.");
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
            <nav className="flex max-w-full flex-wrap rounded-md border border-stone-300 bg-stone-50 p-1">
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
                <div className="absolute right-0 z-30 mt-2 w-72 rounded-md border border-stone-300 bg-white p-2 shadow-lg">
                  <button
                    type="button"
                    onClick={handleSaveGame}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
                  >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    <span>Save Game</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadGame}
                    disabled={!saveInfo}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-400"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    <span>Load Game</span>
                  </button>
                  <div className="my-1 border-t border-stone-200" />
                  <button
                    type="button"
                    onClick={handleNewGame}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    <span>New Game</span>
                  </button>
                  <p className="px-3 py-2 text-xs text-stone-500">
                    {settingsMessage ?? (saveInfo ? `Browser save: ${new Date(saveInfo.savedAt).toLocaleString()}` : "No browser save yet.")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        {selectedScreen === "dashboard" && (
          <DashboardScreen
            gameState={gameState}
            onPrepareMatch={prepareNextMatch}
            onAllocateDevelopmentPoint={allocateDevelopmentPoint}
          />
        )}
        {selectedScreen === "economy" && <EconomyScreen gameState={gameState} />}
        {selectedScreen === "league" && <LeagueScreen gameState={gameState} />}
        {selectedScreen === "fixtures" && <FixturesScreen gameState={gameState} />}
        {selectedScreen === "squad" && <SquadScreen gameState={gameState} onAllocateDevelopmentPoint={allocateDevelopmentPoint} />}
        {selectedScreen === "training" && (
          <TrainingScreen gameState={gameState} onAssignFocusedTraining={assignFocusedTraining} onAllocateDevelopmentPoint={allocateDevelopmentPoint} />
        )}
        {selectedScreen === "opponentReport" && selectedFixtureId && (
          <OpponentReportScreen
            gameState={gameState}
            fixtureId={selectedFixtureId}
            onContinue={() => setSelectedScreen("tactics")}
            onPlayMatch={() => {
              playSelectedFixture();
              const errors = useGameStore.getState().lineupErrors;
              if (errors && errors.length > 0) {
                setSelectedScreen("tactics");
              }
            }}
          />
        )}
        {selectedScreen === "tactics" && (
          selectedFixtureId && draftTactic && draftLineup ? (
            <TacticsScreen
              gameState={gameState}
              fixtureId={selectedFixtureId}
              draftTactic={draftTactic}
              draftLineup={draftLineup}
              lineupErrors={lineupErrors}
              onSetTacticOption={setTacticOption}
              onSetLineupSlot={setLineupSlot}
              onAutoSelectLineup={autoSelectDraftLineup}
              onSaveTactic={saveDraftTactic}
              onPlayMatch={playSelectedFixture}
              onAllocateDevelopmentPoint={allocateDevelopmentPoint}
            />
          ) : (
            <div className="rounded-md border border-stone-300 bg-white p-8 text-center">
              <Sliders className="mx-auto h-12 w-12 text-stone-400" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold text-stone-900">No active fixture</h3>
              <p className="mt-2 text-sm text-stone-500">
                You can prepare your tactics once the next matchday is scheduled. Start the next season to continue.
              </p>
            </div>
          )
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
            onContinueToRewards={() => {
              if (matchReportBackScreen) {
                setSelectedScreen(matchReportBackScreen);
                useGameStore.setState({ matchReportBackScreen: undefined });
              } else {
                setSelectedScreen("matchRewards");
              }
            }}
            buttonLabel={matchReportBackScreen === "fixtures" ? "Back to Fixtures" : undefined}
          />
        )}
        {selectedScreen === "matchRewards" && lastPlayerMatchId && (
          <MatchRewardsScreen
            gameState={gameState}
            matchId={lastPlayerMatchId}
            onBackToDashboard={() => setSelectedScreen("dashboard")}
          />
        )}
        {selectedScreen === "market" && <MarketScreen gameState={gameState} />}
        {selectedScreen === "facilities" && (
          <FacilitiesScreen
            gameState={gameState}
            onUpgrade={startFacilityUpgrade}
            onResolveProspect={resolveYouthProspect}
          />
        )}
      </main>
    </div>
  );
}
