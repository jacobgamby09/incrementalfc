import { describe, expect, it } from "vitest";
import { lowestLeagueStatRange } from "../../data/constants/leagueProfiles";
import { generateGameState } from "../generation/generateGameState";
import { generatePlayer } from "../generation/generatePlayer";
import { calculatePlayerRealPot } from "../player/playerSummaries";
import { getScoutedPotentialReport } from "./scoutedPotential";

describe("scouted potential", () => {
  it("shows an estimate interval containing the real POT for external players", () => {
    const gameState = generateGameState();
    const club = gameState.clubs[gameState.playerClubId];
    const player = generatePlayer({ clubId: "other", position: "ST", statRange: lowestLeagueStatRange, age: 18 });
    const report = getScoutedPotentialReport(player, club);
    const realPot = calculatePlayerRealPot(player);

    expect(report.estimatedMin).toBeLessThanOrEqual(realPot);
    expect(report.estimatedMax).toBeGreaterThanOrEqual(realPot);
    expect(report.confidence).toBe("Low");
  });

  it("narrows the estimate as scouting quality improves", () => {
    const gameState = generateGameState();
    const club = gameState.clubs[gameState.playerClubId];
    const player = generatePlayer({ clubId: "other", position: "ST", statRange: lowestLeagueStatRange, age: 18 });
    const lowReport = getScoutedPotentialReport(player, club);
    const improvedClub = {
      ...club,
      facilities: {
        ...club.facilities,
        scoutingNetwork: {
          ...club.facilities.scoutingNetwork,
          level: 10
        }
      }
    };
    const highReport = getScoutedPotentialReport(player, improvedClub);

    expect(highReport.estimatedMax - highReport.estimatedMin).toBeLessThan(lowReport.estimatedMax - lowReport.estimatedMin);
    expect(highReport.confidence).toBe("High");
  });
});
