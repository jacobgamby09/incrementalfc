import { create } from "zustand";
import type { GameState } from "../domain/types/game";
import type { Fixture } from "../domain/types/league";
import type { Formation, Lineup, RiskLevel, TacticalFocus, Tactic } from "../domain/types/tactics";
import type { SaleStrategy } from "../domain/types/transfer";
import { generateGameState } from "../domain/generation/generateGameState";
import { autoSelectLineup, syncLineupToFormation, validateLineup } from "../domain/lineup/selectLineup";
import { playMatchday } from "../domain/season/playMatchday";
import { finalizeTransferWindow, openTransferWindow } from "../domain/season/seasonRollover";
import { startFacilityUpgrade } from "../domain/facilities/facilityUpgrades";
import { resolveYouthProspect } from "../domain/academy/youthAcademy";
import type { ActiveFacilityType } from "../domain/types/economy";
import { getTacticKey } from "../domain/tactics/tacticFamiliarity";
import { updateFocusedTrainingAssignment } from "../domain/development/focusedTraining";
import { allocateDevelopmentPoint, getDevelopmentCap } from "../domain/development/playerDevelopment";
import type { TrainingFocus } from "../domain/types/training";
import {
  advanceTransferWeek,
  listPlayerForSale,
  removePlayerListing,
  respondToIncomingTransferOffer,
  submitNegotiationOffer,
  type SubmitNegotiationOfferInput
} from "../domain/transfers/transferWindow";

export type ScreenId = "dashboard" | "league" | "fixtures" | "squad" | "training" | "opponentReport" | "tactics" | "matchSimulation" | "matchReport" | "matchRewards" | "market" | "facilities" | "economy";

type GameStore = {
  gameState: GameState;
  selectedScreen: ScreenId;
  selectedFixtureId?: string;
  draftTactic?: Tactic;
  draftLineup?: Lineup;
  lineupErrors: string[];
  lastPlayerMatchId?: string;
  matchReportBackScreen?: ScreenId;
  createNewGame: () => void;
  loadGame: (gameState: GameState) => void;
  setSelectedScreen: (screen: ScreenId) => void;
  prepareNextMatch: (fixtureId?: string) => void;
  setTacticOption: (
    key: "formation" | "focus" | "riskLevel",
    value: Formation | TacticalFocus | RiskLevel
  ) => void;
  setLineupSlot: (slotIndex: number, playerId: string) => void;
  autoSelectDraftLineup: () => void;
  saveDraftTactic: () => void;
  playSelectedFixture: () => void;
  viewMatchReport: () => void;
  setViewingMatch: (matchId: string, backScreen: ScreenId) => void;
  startNextSeason: () => void;
  advanceTransferWeek: () => void;
  finalizeTransferWindow: () => void;
  submitNegotiationOffer: (input: SubmitNegotiationOfferInput) => void;
  listPlayerForSale: (playerId: string, strategy: SaleStrategy) => void;
  removePlayerListing: (playerId: string) => void;
  respondToIncomingTransferOffer: (offerId: string, decision: "accept" | "reject") => void;
  startFacilityUpgrade: (type: ActiveFacilityType) => void;
  resolveYouthProspect: (sign: boolean) => void;
  assignFocusedTraining: (slotIndex: number, playerId?: string, focus?: TrainingFocus) => void;
  allocateDevelopmentPoint: (playerId: string, statKey: string) => void;
};

function getNextPlayerFixture(gameState: GameState): Fixture | undefined {
  if (gameState.currentDate.phase !== "regularSeason") return undefined;
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
  matchReportBackScreen: undefined,
  createNewGame: () =>
    set({
      gameState: generateGameState(),
      selectedScreen: "dashboard",
      selectedFixtureId: undefined,
      draftTactic: undefined,
      draftLineup: undefined,
      lineupErrors: [],
      lastPlayerMatchId: undefined,
      matchReportBackScreen: undefined
    }),
  loadGame: (gameState) =>
    set({
      gameState,
      selectedScreen: "dashboard",
      selectedFixtureId: undefined,
      draftTactic: undefined,
      draftLineup: undefined,
      lineupErrors: [],
      lastPlayerMatchId: undefined,
      matchReportBackScreen: undefined
    }),
  setSelectedScreen: (screen) =>
    set((state) => {
      if (screen === "tactics" && (!state.selectedFixtureId || !state.draftTactic || !state.draftLineup)) {
        if (state.gameState.currentDate.phase !== "regularSeason") return { selectedScreen: screen };
        const season = state.gameState.seasons[state.gameState.currentSeasonId];
        const nextFixture = season?.fixtures
          .filter(
            (f) =>
              f.status === "scheduled" &&
              (f.homeClubId === state.gameState.playerClubId || f.awayClubId === state.gameState.playerClubId)
          )
          .sort((a, b) => a.matchday - b.matchday)[0];

        if (nextFixture) {
          const playerClub = state.gameState.clubs[state.gameState.playerClubId];
          const draftTactic = state.draftTactic || { ...playerClub.tactics.activeTactic };

          let finalLineup: Lineup;
          if (state.draftLineup) {
            finalLineup = state.draftLineup;
          } else {
            const squadIds = new Set(playerClub.squadPlayerIds);
            const savedLineup = playerClub.tactics.activeLineup;
            const isLineupValid = savedLineup &&
              savedLineup.tacticId === draftTactic.id &&
              savedLineup.starters.every(slot => slot.playerId && squadIds.has(slot.playerId));

            finalLineup = isLineupValid && savedLineup ? savedLineup : autoSelectLineup(playerClub, state.gameState, draftTactic);
          }

          return {
            selectedScreen: screen,
            selectedFixtureId: nextFixture.id,
            draftTactic,
            draftLineup: finalLineup,
            lineupErrors: validateLineup(finalLineup, state.gameState, playerClub.id).errors
          };
        }
      }
      return { selectedScreen: screen };
    }),
  prepareNextMatch: (fixtureId) =>
    set((state) => {
      if (state.gameState.currentDate.phase !== "regularSeason") return state;
      const fixture = fixtureId
        ? state.gameState.seasons[state.gameState.currentSeasonId].fixtures.find((candidate) => candidate.id === fixtureId)
        : getNextPlayerFixture(state.gameState);
      if (!fixture) return state;

      const playerClub = state.gameState.clubs[state.gameState.playerClubId];
      const draftTactic = { ...playerClub.tactics.activeTactic };

      const savedLineup = playerClub.tactics.activeLineup;
      const squadIds = new Set(playerClub.squadPlayerIds);
      const isLineupValid = savedLineup &&
        savedLineup.tacticId === draftTactic.id &&
        savedLineup.starters.every(slot => slot.playerId && squadIds.has(slot.playerId));

      const finalLineup = isLineupValid && savedLineup
        ? savedLineup
        : autoSelectLineup(playerClub, state.gameState, draftTactic);

      return {
        selectedScreen: "opponentReport",
        selectedFixtureId: fixture.id,
        draftTactic,
        draftLineup: finalLineup,
        lineupErrors: validateLineup(finalLineup, state.gameState, playerClub.id).errors,
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
  saveDraftTactic: () =>
    set((state) => {
      if (!state.draftTactic || !state.draftLineup) return state;
      const playerClub = state.gameState.clubs[state.gameState.playerClubId];
      const savedTactics = playerClub.tactics.savedTactics.some((tactic) => tactic.id === state.draftTactic?.id)
        ? playerClub.tactics.savedTactics.map((tactic) => (tactic.id === state.draftTactic?.id ? state.draftTactic! : tactic))
        : [...playerClub.tactics.savedTactics, state.draftTactic];
      const tacticKey = getTacticKey(state.draftTactic);

      return {
        gameState: {
          ...state.gameState,
          clubs: {
            ...state.gameState.clubs,
            [playerClub.id]: {
              ...playerClub,
              tactics: {
                ...playerClub.tactics,
                activeTactic: state.draftTactic,
                savedTactics,
                familiarityByTacticId: {
                  ...playerClub.tactics.familiarityByTacticId,
                  [tacticKey]:
                    playerClub.tactics.familiarityByTacticId[tacticKey] ??
                    playerClub.tactics.familiarityByTacticId[state.draftTactic.id] ??
                    50
                },
                activeLineup: state.draftLineup
              }
            }
          }
        }
      };
    }),
  playSelectedFixture: () =>
    set((state) => {
      if (state.gameState.currentDate.phase !== "regularSeason") return state;
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
  viewMatchReport: () => set({ selectedScreen: "matchReport" }),
  setViewingMatch: (matchId, backScreen) =>
    set({
      lastPlayerMatchId: matchId,
      selectedScreen: "matchReport",
      matchReportBackScreen: backScreen
    }),
  startNextSeason: () =>
    set((state) => {
      const nextState = openTransferWindow(state.gameState);
      return {
        gameState: nextState,
        selectedScreen: "dashboard",
        selectedFixtureId: undefined,
        draftTactic: undefined,
        draftLineup: undefined,
        lineupErrors: [],
        lastPlayerMatchId: undefined,
        matchReportBackScreen: undefined
      };
    }),
  advanceTransferWeek: () =>
    set((state) => ({
      gameState: advanceTransferWeek(state.gameState)
    })),
  finalizeTransferWindow: () =>
    set((state) => ({
      gameState: finalizeTransferWindow(state.gameState),
      selectedScreen: "dashboard",
      selectedFixtureId: undefined,
      draftTactic: undefined,
      draftLineup: undefined,
      lineupErrors: [],
      lastPlayerMatchId: undefined,
      matchReportBackScreen: undefined
    })),
  submitNegotiationOffer: (input) =>
    set((state) => ({
      gameState: submitNegotiationOffer(state.gameState, input)
    })),
  listPlayerForSale: (playerId, strategy) =>
    set((state) => ({
      gameState: listPlayerForSale(state.gameState, playerId, strategy)
    })),
  removePlayerListing: (playerId) =>
    set((state) => ({
      gameState: removePlayerListing(state.gameState, playerId)
    })),
  respondToIncomingTransferOffer: (offerId, decision) =>
    set((state) => ({
      gameState: respondToIncomingTransferOffer(state.gameState, offerId, decision)
    })),
  startFacilityUpgrade: (type) =>
    set((state) => ({
      gameState: startFacilityUpgrade(state.gameState, state.gameState.playerClubId, type)
    })),
  resolveYouthProspect: (sign) =>
    set((state) => ({
      gameState: resolveYouthProspect(state.gameState, sign)
    })),
  assignFocusedTraining: (slotIndex, playerId, focus) =>
    set((state) => {
      const playerClub = state.gameState.clubs[state.gameState.playerClubId];
      return {
        gameState: {
          ...state.gameState,
          clubs: {
            ...state.gameState.clubs,
            [playerClub.id]: updateFocusedTrainingAssignment({
              club: playerClub,
              players: state.gameState.players,
              slotIndex,
              playerId,
              focus
            })
          }
        }
      };
    }),
  allocateDevelopmentPoint: (playerId, statKey) =>
    set((state) => {
      const player = state.gameState.players[playerId];
      if (!player || player.clubId !== state.gameState.playerClubId) return state;
      const playerClub = state.gameState.clubs[state.gameState.playerClubId];
      const nextPlayer = allocateDevelopmentPoint({
        player,
        statKey,
        developmentCap: getDevelopmentCap(playerClub)
      });
      if (nextPlayer === player) return state;

      return {
        gameState: {
          ...state.gameState,
          players: {
            ...state.gameState.players,
            [playerId]: nextPlayer
          }
        }
      };
    })
}));
