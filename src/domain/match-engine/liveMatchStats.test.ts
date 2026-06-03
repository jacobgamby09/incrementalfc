import { describe, expect, it } from "vitest";
import type { Match } from "../types/match";
import type { Lineup } from "../types/tactics";
import { createVisibleMatchStats } from "./liveMatchStats";

function createMockMatch(): Match {
  return {
    id: "match_1",
    fixtureId: "fixture_1",
    homeClubId: "home",
    awayClubId: "away",
    homeLineup: {} as Lineup,
    awayLineup: {} as Lineup,
    result: { homeGoals: 0, awayGoals: 0, winnerClubId: null },
    events: [],
    report: {
      summary: "",
      homeStats: {} as any,
      awayStats: {} as any,
      keyProblems: [],
      playerStats: {},
      playerRatings: {},
      recommendations: []
    },
    rewards: { money: 0, fans: 0, reputation: 0, playerXp: {}, tacticalFamiliarity: {} }
  };
}

describe("liveMatchStats", () => {
  it("initializes with 50/50 possession proxy and 0 stats", () => {
    const match = createMockMatch();
    const stats = createVisibleMatchStats(match, []);

    expect(stats.home.possession).toBe(50);
    expect(stats.away.possession).toBe(50);
    expect(stats.home.shots).toBe(0);
    expect(stats.away.shots).toBe(0);
    expect(stats.home.xg).toBe(0);
    expect(stats.away.xg).toBe(0);
  });

  it("accumulates shots, shots on target, xG, saves, and defensive stops correctly", () => {
    const match = createMockMatch();
    const visibleEvents = [
      { minute: 5, type: "event_control", clubId: "home", description: "" },
      { minute: 10, type: "shot", clubId: "home", outcome: "saved", xg: 0.15, description: "" },
      { minute: 10, type: "save", clubId: "away", description: "" }, // Away GK makes a save
      { minute: 25, type: "defensive_stop", clubId: "home", description: "" },
      { minute: 40, type: "shot", clubId: "away", outcome: "scored", xg: 0.45, description: "" },
      { minute: 40, type: "goal", clubId: "away", description: "" }
    ] as any[];

    const stats = createVisibleMatchStats(match, visibleEvents);

    // Home: 1 control event
    // Away: 0 control events
    // Home control weight = 1 + 5 = 6. Away control weight = 0 + 5 = 5.
    // Total weight = 11. Home possession = 6/11 * 100 = 55%. Away = 45%.
    expect(stats.home.possession).toBe(55);
    expect(stats.away.possession).toBe(45);

    // Shots
    expect(stats.home.shots).toBe(1);
    expect(stats.home.shotsOnTarget).toBe(1);
    expect(stats.home.xg).toBe(0.15);

    expect(stats.away.shots).toBe(1);
    expect(stats.away.shotsOnTarget).toBe(1);
    expect(stats.away.xg).toBe(0.45);

    // Saves
    expect(stats.away.saves).toBe(1);
    expect(stats.home.saves).toBe(0);

    // Defensive Stops
    expect(stats.home.defensiveStops).toBe(1);
    expect(stats.away.defensiveStops).toBe(0);
  });

  it("handles empty and future event filter constraints implicitly by receiving filtered visibleEvents array", () => {
    const match = createMockMatch();
    const allEvents = [
      { minute: 10, type: "shot", clubId: "home", outcome: "saved", xg: 0.1, description: "" },
      { minute: 90, type: "shot", clubId: "away", outcome: "scored", xg: 0.8, description: "" }
    ] as any[];

    // Simulate playback at minute 45 (only include events up to minute 45)
    const visibleEvents = allEvents.filter(e => e.minute <= 45);
    const stats = createVisibleMatchStats(match, visibleEvents);

    expect(stats.home.shots).toBe(1);
    expect(stats.away.shots).toBe(0);
  });
});
