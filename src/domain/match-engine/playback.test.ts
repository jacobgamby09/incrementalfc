import { describe, expect, it } from "vitest";
import type { Match } from "../types/match";
import type { Lineup } from "../types/tactics";
import { getPlaybackFrame } from "./playback";

function createPlaybackMatch(): Match {
  return {
    id: "match_playback",
    fixtureId: "fixture_playback",
    homeClubId: "home",
    awayClubId: "away",
    homeLineup: {} as Lineup,
    awayLineup: {} as Lineup,
    result: {
      homeGoals: 1,
      awayGoals: 1,
      winnerClubId: null
    },
    events: [
      { minute: 10, type: "goal", clubId: "home", description: "Home scores." },
      { minute: 65, type: "chance", clubId: "home", description: "Home chance." },
      { minute: 80, type: "goal", clubId: "away", description: "Away scores." }
    ],
    report: {
      summary: "",
      homeStats: {
        eventsWon: 0,
        chancesCreated: 0,
        shots: 0,
        goals: 1,
        xg: 0,
        savesForced: 0,
        reboundsWon: 0,
        redCards: 0,
        chanceTypeBreakdown: {
          fast_breakaway: 0,
          wide_cross: 0,
          sustained_pressure: 0,
          rebound_big_chance: 0,
          corner: 0,
          indirect_free_kick: 0,
          direct_free_kick: 0,
          penalty: 0
        }
      },
      awayStats: {
        eventsWon: 0,
        chancesCreated: 0,
        shots: 0,
        goals: 1,
        xg: 0,
        savesForced: 0,
        reboundsWon: 0,
        redCards: 0,
        chanceTypeBreakdown: {
          fast_breakaway: 0,
          wide_cross: 0,
          sustained_pressure: 0,
          rebound_big_chance: 0,
          corner: 0,
          indirect_free_kick: 0,
          direct_free_kick: 0,
          penalty: 0
        }
      },
      keyProblems: [],
      playerStats: {},
      playerRatings: {},
      recommendations: []
    },
    rewards: {
      money: 0,
      fans: 0,
      reputation: 0,
      playerXp: {},
      tacticalFamiliarity: {}
    }
  };
}

describe("match playback", () => {
  it("reveals events by minute without changing final result", () => {
    const match = createPlaybackMatch();
    const frame10 = getPlaybackFrame(match, 10);
    const frame45 = getPlaybackFrame(match, 45);
    const frame90 = getPlaybackFrame(match, 90);

    expect(frame10.hasGoalAtCurrentMinute).toBe(true);
    expect(frame10.latestGoalEvent).toMatchObject({ minute: 10, type: "goal", clubId: "home" });
    expect(frame45.visibleEvents).toHaveLength(1);
    expect(frame45.visibleDisplayEvents).toHaveLength(1);
    expect(frame45.hasGoalAtCurrentMinute).toBe(false);
    expect(frame45.homeGoals).toBe(1);
    expect(frame45.awayGoals).toBe(0);
    expect(frame90.visibleEvents).toHaveLength(3);
    expect(frame90.visibleDisplayEvents).toHaveLength(3);
    expect(frame90.homeGoals).toBe(match.result.homeGoals);
    expect(frame90.awayGoals).toBe(match.result.awayGoals);
    expect(match.result).toEqual({ homeGoals: 1, awayGoals: 1, winnerClubId: null });
  });
});
