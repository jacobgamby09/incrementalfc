import { describe, expect, it } from "vitest";
import { generateGameState } from "../generation/generateGameState";
import { autoSelectLineup } from "../lineup/selectLineup";
import type { Tactic } from "../types/tactics";
import { calculatePhaseStrengths } from "./calculatePhaseStrengths";

describe("phase strengths", () => {
  it("reduces contribution when a player is used badly out of position", () => {
    const gameState = generateGameState();
    const club = gameState.clubs[gameState.playerClubId];
    const tactic = club.tactics.activeTactic;
    const naturalLineup = autoSelectLineup(club, gameState, tactic);
    const strikerSlotIndex = naturalLineup.starters.findIndex((slot) => slot.position === "ST");
    const centreBackId = club.squadPlayerIds.find(
      (playerId) => gameState.players[playerId].primaryPosition === "CB"
    );
    const poorFitLineup = {
      ...naturalLineup,
      starters: naturalLineup.starters.map((slot, index) =>
        index === strikerSlotIndex && centreBackId ? { ...slot, playerId: centreBackId } : slot
      )
    };

    const naturalStrengths = calculatePhaseStrengths(club, gameState, naturalLineup, tactic);
    const poorFitStrengths = calculatePhaseStrengths(club, gameState, poorFitLineup, tactic);

    expect(poorFitStrengths.attack).toBeLessThan(naturalStrengths.attack);
  });

  it("uses slot-position weighting so formation shape changes phase strengths", () => {
    const gameState = generateGameState();
    const club = gameState.clubs[gameState.playerClubId];
    const defensiveTactic: Tactic = {
      ...club.tactics.activeTactic,
      id: "test_541",
      formation: "5-4-1",
      focus: "balanced",
      riskLevel: "balanced"
    };
    const attackingTactic: Tactic = {
      ...club.tactics.activeTactic,
      id: "test_343",
      formation: "3-4-3",
      focus: "balanced",
      riskLevel: "balanced"
    };
    const defensiveLineup = autoSelectLineup(club, gameState, defensiveTactic);
    const attackingLineup = autoSelectLineup(club, gameState, attackingTactic);

    const defensiveShape = calculatePhaseStrengths(club, gameState, defensiveLineup, defensiveTactic);
    const attackingShape = calculatePhaseStrengths(club, gameState, attackingLineup, attackingTactic);

    expect(defensiveShape.defence).toBeGreaterThan(attackingShape.defence);
    expect(attackingShape.attack).toBeGreaterThan(defensiveShape.attack);
  });
});
