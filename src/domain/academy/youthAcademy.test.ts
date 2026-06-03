import { describe, expect, it } from "vitest";
import { generateGameState } from "../generation/generateGameState";
import { advanceYouthAcademy, resolveYouthProspect } from "./youthAcademy";

describe("youth academy intake", () => {
  it("creates a pending prospect instead of automatically adding a player to the squad", () => {
    const state = generateGameState();
    const club = state.clubs[state.playerClubId];
    club.academy.prospectGenerationProgress = 99;
    const originalSquadSize = club.squadPlayerIds.length;
    const next = advanceYouthAcademy(state, 1, () => 0.2);
    const nextClub = next.clubs[state.playerClubId];

    expect(nextClub.academy.pendingProspect).toBeTruthy();
    expect(nextClub.squadPlayerIds).toHaveLength(originalSquadSize);
  });

  it("signs or releases a pending prospect explicitly", () => {
    const state = generateGameState();
    state.clubs[state.playerClubId].academy.prospectGenerationProgress = 99;
    const withProspect = advanceYouthAcademy(state, 1, () => 0.2);
    const prospect = withProspect.clubs[state.playerClubId].academy.pendingProspect!;

    const signed = resolveYouthProspect(withProspect, true);
    expect(signed.players[prospect.id].clubId).toBe(state.playerClubId);
    expect(signed.clubs[state.playerClubId].squadPlayerIds).toContain(prospect.id);

    const another = advanceYouthAcademy(state, 1, () => 0.2);
    const released = resolveYouthProspect(another, false);
    expect(released.clubs[state.playerClubId].academy.pendingProspect).toBeNull();
    expect(released.players[prospect.id]).toBeUndefined();
  });
});
