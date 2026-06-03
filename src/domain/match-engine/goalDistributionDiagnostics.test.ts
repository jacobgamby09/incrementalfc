import { describe, expect, it } from "vitest";
import { generateGameState } from "../generation/generateGameState";
import { autoSelectLineup } from "../lineup/selectLineup";
import { isSetPieceChanceType, type ChanceType } from "../types/match";
import type { PlayerPosition } from "../types/player";
import { createSeededRandomSource } from "./matchBalanceDiagnostics";
import { simulateMatch } from "./simulateMatch";

describe("goal distribution diagnostics", () => {
  it("keeps open-play goals attacker-led while preserving a visible set-piece route", () => {
    const gameState = generateGameState(createSeededRandomSource(420));
    const fixture = gameState.seasons[gameState.currentSeasonId].fixtures[0];
    const homeClub = gameState.clubs[fixture.homeClubId];
    const awayClub = gameState.clubs[fixture.awayClubId];
    const homeTactic = homeClub.tactics.activeTactic;
    const awayTactic = awayClub.tactics.activeTactic;
    const homeLineup = autoSelectLineup(homeClub, gameState, homeTactic);
    const awayLineup = autoSelectLineup(awayClub, gameState, awayTactic);
    const rng = createSeededRandomSource(421);
    const goalsByPosition: Partial<Record<PlayerPosition, number>> = {};
    const goalsByType: Partial<Record<ChanceType, number>> = {};
    let totalGoals = 0;
    let openPlayGoals = 0;
    let openPlayDefenderGoals = 0;
    let setPieceGoals = 0;

    for (let matchIndex = 0; matchIndex < 600; matchIndex += 1) {
      const match = simulateMatch({
        fixture,
        homeClub,
        awayClub,
        homeLineup,
        awayLineup,
        homeTactic,
        awayTactic,
        gameState,
        reportingClubId: homeClub.id,
        rng
      });

      for (const event of match.events.filter((candidate) => candidate.type === "goal")) {
        const lineup = event.clubId === homeClub.id ? homeLineup : awayLineup;
        const position = lineup.starters.find((slot) => slot.playerId === event.playerId)?.position;
        if (!position || !event.chanceType) continue;
        totalGoals += 1;
        goalsByPosition[position] = (goalsByPosition[position] ?? 0) + 1;
        goalsByType[event.chanceType] = (goalsByType[event.chanceType] ?? 0) + 1;
        if (isSetPieceChanceType(event.chanceType)) {
          setPieceGoals += 1;
        } else {
          openPlayGoals += 1;
          if (["CB", "LB", "RB"].includes(position)) openPlayDefenderGoals += 1;
        }
      }
    }

    const attackingGoals =
      (goalsByPosition.ST ?? 0) +
      (goalsByPosition.LW ?? 0) +
      (goalsByPosition.RW ?? 0) +
      (goalsByPosition.AM ?? 0);
    const summary = {
      totalGoals,
      attackingGoalShare: Number((attackingGoals / totalGoals).toFixed(3)),
      setPieceGoalShare: Number((setPieceGoals / totalGoals).toFixed(3)),
      openPlayDefenderGoalShare: Number((openPlayDefenderGoals / openPlayGoals).toFixed(3))
    };
    console.table([summary]);
    console.table(goalsByPosition);
    console.table(goalsByType);

    expect(totalGoals).toBeGreaterThan(500);
    expect(summary.attackingGoalShare).toBeGreaterThan(0.62);
    expect(summary.openPlayDefenderGoalShare).toBeLessThan(0.12);
    expect(summary.setPieceGoalShare).toBeGreaterThan(0.08);
    expect(summary.setPieceGoalShare).toBeLessThan(0.35);
    expect(goalsByType.corner ?? 0).toBeGreaterThan(0);
    expect(goalsByType.indirect_free_kick ?? 0).toBeGreaterThan(0);
    expect(goalsByType.direct_free_kick ?? 0).toBeGreaterThan(0);
    expect(goalsByType.penalty ?? 0).toBeGreaterThan(0);
  });
});
