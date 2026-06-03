import { describe, expect, it } from "vitest";
import { generateGameState } from "../generation/generateGameState";
import { runTraining } from "./playerDevelopment";
import {
  getFocusedTrainingAssignment,
  getFocusedTrainingSlotCount,
  updateFocusedTrainingAssignment
} from "./focusedTraining";

describe("focused training", () => {
  it("uses the Training Ground config to expose focused slots", () => {
    const gameState = generateGameState();
    const club = gameState.clubs[gameState.playerClubId];

    expect(getFocusedTrainingSlotCount(club)).toBe(1);
  });

  it("assigns a player to only one focused slot at a time", () => {
    const gameState = generateGameState();
    const club = {
      ...gameState.clubs[gameState.playerClubId],
      facilities: {
        ...gameState.clubs[gameState.playerClubId].facilities,
        trainingGround: {
          ...gameState.clubs[gameState.playerClubId].facilities.trainingGround,
          level: 4
        }
      }
    };
    const playerId = club.squadPlayerIds.find((candidate) => gameState.players[candidate].primaryPosition === "ST")!;
    const firstAssignment = updateFocusedTrainingAssignment({
      club,
      players: gameState.players,
      slotIndex: 0,
      playerId,
      focus: "finishing"
    });
    const movedAssignment = updateFocusedTrainingAssignment({
      club: firstAssignment,
      players: gameState.players,
      slotIndex: 1,
      playerId,
      focus: "physical"
    });

    expect(movedAssignment.training.focusedAssignments).toHaveLength(1);
    expect(getFocusedTrainingAssignment(movedAssignment, 1)).toEqual({
      slotIndex: 1,
      playerId,
      focus: "physical"
    });
  });

  it("adds focused bonus XP on top of normal squad training", () => {
    const gameState = generateGameState();
    const club = gameState.clubs[gameState.playerClubId];
    const playerId = club.squadPlayerIds.find((candidate) => gameState.players[candidate].primaryPosition === "ST")!;
    const baselineResult = runTraining(gameState, club);
    const focusedClub = updateFocusedTrainingAssignment({
      club,
      players: gameState.players,
      slotIndex: 0,
      playerId,
      focus: "finishing"
    });
    const focusedResult = runTraining(gameState, focusedClub);

    expect(focusedResult.trainingXpByPlayerId[playerId]).toBeGreaterThan(baselineResult.trainingXpByPlayerId[playerId]);
  });
});
