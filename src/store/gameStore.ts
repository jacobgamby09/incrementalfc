import { create } from "zustand";
import type { GameState } from "../domain/types/game";
import type { Fixture } from "../domain/types/league";
import type { Formation, Lineup, RiskLevel, TacticalFocus, Tactic } from "../domain/types/tactics";
import { generateGameState } from "../domain/generation/generateGameState";
import { autoSelectLineup, syncLineupToFormation, validateLineup } from "../domain/lineup/selectLineup";
import { playMatchday } from "../domain/season/playMatchday";

export type ScreenId = "dashboard" | "league" | "squad" | "opponentReport" | "tactics" | "matchSimulation" | "matchReport";

type GameStore = {
  gameState: GameState;
  selectedScreen: ScreenId;
  selectedFixtureId?: string;
  draftTactic?: Tactic;
  draftLineup?: Lineup;
  lineupErrors: string[];
  lastPlayerMatchId?: string;
  createNewGame: () => void;
  setSelectedScreen: (screen: ScreenId) => void;
  prepareNextMatch: (fixtureId?: string) => void;
  setTacticOption: (
    key: "formation" | "focus" | "riskLevel",
    value: Formation | TacticalFocus | RiskLevel
  ) => void;
  setLineupSlot: (slotIndex: number, playerId: string) => void;
  autoSelectDraftLineup: () => void;
  playSelectedFixture: () => void;
  viewMatchReport: () => void;
};

function getNextPlayerFixture(gameState: GameState): Fixture | undefined {
  const season = gameState.seasons[gameState.currentSeasonId];
  return season.fixtures
    .filter(
      (fixture) =>
        fixture.status === "scheduled" &&
        (fixture.homeClubId === gameState.playerClubId || fixture.awayClubId === gameState.playerClubId)
    )
    .sort((a, b) => a.matchday - b.matchday)[0];
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: generateGameState(),
  selectedScreen: "dashboard",
  lineupErrors: [],
  createNewGame: () =>
    set({
      gameState: generateGameState(),
      selectedScreen: "dashboard",
      selectedFixtureId: undefined,
      draftTactic: undefined,
      draftLineup: undefined,
      lineupErrors: [],
      lastPlayerMatchId: undefined
    }),
  setSelectedScreen: (screen) => set({ selectedScreen: screen }),
  prepareNextMatch: (fixtureId) =>
    set((state) => {
      const fixture = fixtureId
        ? state.gameState.seasons[state.gameState.currentSeasonId].fixtures.find((candidate) => candidate.id === fixtureId)
        : getNextPlayerFixture(state.gameState);
      if (!fixture) return state;

      const playerClub = state.gameState.clubs[state.gameState.playerClubId];
      const draftTactic = { ...playerClub.tactics.activeTactic };
      const draftLineup = autoSelectLineup(playerClub, state.gameState, draftTactic);

      return {
        selectedScreen: "opponentReport",
        selectedFixtureId: fixture.id,
        draftTactic,
        draftLineup,
        lineupErrors: validateLineup(draftLineup, state.gameState, playerClub.id).errors,
        lastPlayerMatchId: undefined
      };
    }),
  setTacticOption: (key, value) =>
    set((state) => {
      if (!state.draftTactic || !state.draftLineup) return state;
      const draftTactic = {
        ...state.draftTactic,
        [key]: value
      } as Tactic;
      const syncedLineup =
        key === "formation"
          ? autoSelectLineup(state.gameState.clubs[state.gameState.playerClubId], state.gameState, draftTactic)
          : syncLineupToFormation(state.draftLineup, draftTactic);

      return {
        draftTactic,
        draftLineup: syncedLineup,
        lineupErrors: validateLineup(syncedLineup, state.gameState, state.gameState.playerClubId).errors
      };
    }),
  setLineupSlot: (slotIndex, playerId) =>
    set((state) => {
      if (!state.draftLineup) return state;
      const player = state.gameState.players[playerId];
      const draftLineup = {
        ...state.draftLineup,
        starters: state.draftLineup.starters.map((slot, index) =>
          index === slotIndex
            ? {
                ...slot,
                playerId,
                role: player?.preferredRole
              }
            : slot
        )
      };

      return {
        draftLineup,
        lineupErrors: validateLineup(draftLineup, state.gameState, state.gameState.playerClubId).errors
      };
    }),
  autoSelectDraftLineup: () =>
    set((state) => {
      if (!state.draftTactic) return state;
      const draftLineup = autoSelectLineup(
        state.gameState.clubs[state.gameState.playerClubId],
        state.gameState,
        state.draftTactic
      );
      return {
        draftLineup,
        lineupErrors: validateLineup(draftLineup, state.gameState, state.gameState.playerClubId).errors
      };
    }),
  playSelectedFixture: () =>
    set((state) => {
      if (!state.selectedFixtureId || !state.draftLineup || !state.draftTactic) return state;
      const validation = validateLineup(state.draftLineup, state.gameState, state.gameState.playerClubId);
      if (!validation.valid) {
        return {
          lineupErrors: validation.errors
        };
      }

      const result = playMatchday({
        gameState: state.gameState,
        fixtureId: state.selectedFixtureId,
        playerLineup: state.draftLineup,
        playerTactic: state.draftTactic
      });

      return {
        gameState: result.gameState,
        lastPlayerMatchId: result.playerMatchId,
        selectedScreen: "matchSimulation",
        lineupErrors: []
      };
    }),
  viewMatchReport: () => set({ selectedScreen: "matchReport" })
}));
