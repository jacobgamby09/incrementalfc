import { describe, expect, it } from "vitest";
import type { MatchTeamStats } from "../types/match";
import { generateMatchReport } from "./generateMatchReport";

function stats(overrides: Partial<MatchTeamStats>): MatchTeamStats {
  return {
    eventsWon: 0,
    chancesCreated: 0,
    shots: 0,
    goals: 0,
    xg: 0,
    savesForced: 0,
    reboundsWon: 0,
    redCards: 0,
    chanceTypeBreakdown: {
      fast_breakaway: 0,
      wide_cross: 0,
      sustained_pressure: 0,
      rebound_big_chance: 0
    },
    ...overrides
  };
}

describe("match report feedback", () => {
  it("produces specific xG and chance-route feedback", () => {
    const report = generateMatchReport({
      reportingClubName: "Incremental FC",
      opponentClubName: "Test United",
      reportingGoals: 1,
      opponentGoals: 2,
      reportingStats: stats({
        eventsWon: 24,
        chancesCreated: 6,
        shots: 9,
        goals: 1,
        xg: 2.1,
        chanceTypeBreakdown: {
          fast_breakaway: 0,
          wide_cross: 1,
          sustained_pressure: 4,
          rebound_big_chance: 1
        }
      }),
      opponentStats: stats({
        eventsWon: 15,
        chancesCreated: 5,
        shots: 6,
        goals: 2,
        xg: 0.9,
        chanceTypeBreakdown: {
          fast_breakaway: 4,
          wide_cross: 0,
          sustained_pressure: 1,
          rebound_big_chance: 0
        }
      })
    });

    expect(report.keyProblems.map((problem) => problem.code)).toContain("clear_xg_advantage");
    expect(report.keyProblems.map((problem) => problem.code)).toContain("opponent_main_threat");
    expect(report.keyProblems.some((problem) => problem.text.includes("fast breakaways"))).toBe(true);
  });
});
