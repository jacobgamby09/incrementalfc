import { describe, expect, it } from "vitest";
import { generateGameState } from "../generation/generateGameState";
import { autoSelectLineup } from "../lineup/selectLineup";
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
});
