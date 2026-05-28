import { describe, expect, it } from "vitest";
import { lowestLeagueStatRange } from "../../data/constants/leagueProfiles";
import { generateGameState } from "../generation/generateGameState";
import { generatePlayer } from "../generation/generatePlayer";
import { getPlayerDetailView } from "./getPlayerDetailView";

describe("player detail view", () => {
  it("derives identity, contract, stats, potential, and selected position fit", () => {
    const player = generatePlayer({
      clubId: "club_test",
      position: "CM",
      statRange: lowestLeagueStatRange,
      kitNumber: 8
    });

    const detail = getPlayerDetailView(player, { selectedSlotPosition: "DM" });

    expect(detail.id).toBe(player.id);
    expect(detail.name).toBe(`${player.firstName} ${player.lastName}`);
    expect(detail.age).toBe(player.age);
    expect(detail.primaryPosition).toBe("CM");
    expect(detail.wagePerWeek).toBe(player.contract.wagePerWeek);
    expect(detail.marketValue).toBe(player.contract.marketValue);
    expect(detail.ovr).toBeGreaterThan(0);
    expect(detail.estimatedPot).toBeGreaterThan(0);
    expect(detail.currentStats.length).toBeGreaterThan(0);
    expect(detail.potentialStats.length).toBe(detail.currentStats.length);
    expect(detail.selectedPositionFit).toBeDefined();
    expect(detail.selectedPositionFit?.level).toBe("related");
  });

  it("includes match context when provided", () => {
    const gameState = generateGameState();
    const playerClub = gameState.clubs[gameState.playerClubId];
    const playerId = playerClub.squadPlayerIds.find((candidateId) => gameState.players[candidateId].primaryPosition === "ST")!;
    const player = {
      ...gameState.players[playerId],
      development: {
        ...gameState.players[playerId].development,
        recentStatGrowth: [{ statKey: "ACC", from: 6, to: 7, source: "training" as const }]
      }
    };
    const stateWithGrowth = {
      ...gameState,
      players: {
        ...gameState.players,
        [player.id]: player
      }
    };
    const detail = getPlayerDetailView(player, {
      gameState: stateWithGrowth,
      matchContext: {
        matchId: "match_1",
        clubName: "Incremental FC",
        opponentName: "Greyford City",
        rating: {
          playerId: player.id,
          rating: 7.4,
          summary: "Scored.",
          positives: ["Scored."],
          negatives: []
        }
      }
    });

    expect(detail.matchContext?.rating?.rating).toBe(7.4);
    expect(detail.matchContext?.clubName).toBe("Incremental FC");
    expect(detail.developmentSummary?.statRows.length).toBeGreaterThan(0);
    expect(detail.developmentSummary?.statRows[0]).toEqual(expect.objectContaining({
      current: expect.any(Number),
      potential: expect.any(Number),
      facilityCap: expect.any(Number),
      progressPercent: expect.any(Number)
    }));
    expect(detail.developmentSummary?.statRows.find((row) => row.statKey === "ACC")?.recentDelta).toEqual(expect.objectContaining({
      direction: "increase",
      label: "↑ +1"
    }));
  });
});
