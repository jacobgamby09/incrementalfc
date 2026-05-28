import { describe, expect, it } from "vitest";
import { generateGameState } from "../generation/generateGameState";
import type { PlayerPosition } from "../types/player";
import { autoSelectLineup, getSortedPlayersForSlot } from "./selectLineup";
import { calculatePositionFit } from "./positionFit";

function makeDeterministicRng(): () => number {
  let seed = 12345;

  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

describe("lineup option sorting", () => {
  it("orders natural fits above weaker fits for a formation slot", () => {
    const gameState = generateGameState(makeDeterministicRng());
    const club = gameState.clubs[gameState.playerClubId];
    const lineup = autoSelectLineup(club, gameState, club.tactics.activeTactic);
    const strikerSlotIndex = lineup.starters.findIndex((slot) => slot.position === "ST");
    const options = getSortedPlayersForSlot(gameState, club.id, lineup, strikerSlotIndex);
    const firstPoorIndex = options.findIndex(
      (player) => calculatePositionFit(player, "ST").level === "poor"
    );
    const lastNaturalIndex = options.reduce(
      (latestIndex, player, index) =>
        calculatePositionFit(player, "ST").level === "natural" ? index : latestIndex,
      -1
    );

    expect(options[0].primaryPosition).toBe("ST");
    if (firstPoorIndex !== -1 && lastNaturalIndex !== -1) {
      expect(lastNaturalIndex).toBeLessThan(firstPoorIndex);
    }
  });

  it("keeps normal goalkeeper slot options to goalkeepers", () => {
    const gameState = generateGameState(makeDeterministicRng());
    const club = gameState.clubs[gameState.playerClubId];
    const lineup = autoSelectLineup(club, gameState, club.tactics.activeTactic);
    const goalkeeperSlotIndex = lineup.starters.findIndex((slot) => slot.position === "GK");
    const options = getSortedPlayersForSlot(gameState, club.id, lineup, goalkeeperSlotIndex);

    expect(options.length).toBeGreaterThan(0);
    expect(options.every((player) => player.primaryPosition === "GK")).toBe(true);
  });

  it("keeps an invalid current goalkeeper selection visible so it can be fixed", () => {
    const gameState = generateGameState(makeDeterministicRng());
    const club = gameState.clubs[gameState.playerClubId];
    const lineup = structuredClone(autoSelectLineup(club, gameState, club.tactics.activeTactic));
    const goalkeeperSlotIndex = lineup.starters.findIndex((slot) => slot.position === "GK");
    const outfieldPlayer = club.squadPlayerIds
      .map((playerId) => gameState.players[playerId])
      .find((player) => player.primaryPosition !== ("GK" as PlayerPosition));

    expect(outfieldPlayer).toBeDefined();
    lineup.starters[goalkeeperSlotIndex].playerId = outfieldPlayer!.id;

    const options = getSortedPlayersForSlot(gameState, club.id, lineup, goalkeeperSlotIndex);

    expect(options.map((player) => player.id)).toContain(outfieldPlayer!.id);
    expect(options[options.length - 1]?.id).toBe(outfieldPlayer!.id);
  });
});
