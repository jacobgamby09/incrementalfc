import { describe, expect, it } from "vitest";
import { lowestLeagueStatRange } from "../../data/constants/leagueProfiles";
import { generateGameState } from "../generation/generateGameState";
import { generatePlayer } from "../generation/generatePlayer";
import { calculatePlayerOvr, calculatePlayerPot } from "../player/playerSummaries";
import { getScoutedPotentialReport } from "./scoutedPotential";

describe("scouted potential", () => {
  it("shows an estimate interval containing the real POT for external players", () => {
    const gameState = generateGameState();
    const club = gameState.clubs[gameState.playerClubId];
    const player = generatePlayer({ clubId: "other", position: "ST", statRange: lowestLeagueStatRange, age: 18 });
    const report = getScoutedPotentialReport(player, club);
    const realPot = calculatePlayerPot(player);

    expect(report.estimatedMin).toBeLessThanOrEqual(realPot);
    expect(report.estimatedMax).toBeGreaterThanOrEqual(realPot);
    expect(report.confidence).toBe("Low");
  });

  it("uses effective POT for older players rather than stored youth potential", () => {
    const gameState = generateGameState();
    const club = gameState.clubs[gameState.playerClubId];
    const player = generatePlayer({ clubId: "other", position: "ST", statRange: lowestLeagueStatRange, age: 33 });
    player.currentStats = { PAS: 4, SHO: 6, TAC: 4, CRO: 4, HEA: 4, ACC: 6, STA: 5, DRI: 5, POS: 6, TEC: 6, PHY: 5, MEN: 5 };
    player.potentialStats = { PAS: 10, SHO: 12, TAC: 10, CRO: 10, HEA: 10, ACC: 12, STA: 10, DRI: 10, POS: 12, TEC: 12, PHY: 10, MEN: 10 };

    const report = getScoutedPotentialReport(player, club);

    expect(calculatePlayerPot(player)).toBe(calculatePlayerOvr(player));
    expect(report.estimatedMin).toBeLessThanOrEqual(calculatePlayerOvr(player));
    expect(report.estimatedMax).toBeGreaterThanOrEqual(calculatePlayerOvr(player));
    expect(report.estimatedMax).toBeLessThan(12);
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
