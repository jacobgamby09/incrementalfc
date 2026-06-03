import { describe, expect, it } from "vitest";
import type { Match } from "../types/match";
import type { Lineup } from "../types/tactics";
import { createKeyMoments } from "./keyMoments";

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

const mockResolver = {
  getPlayerName: (id: string) => `Player ${id}`,
  getClubName: (id: string) => `Club ${id}`,
  getClubShortName: (id: string) => id.toUpperCase()
};

describe("keyMoments", () => {
  it("extracts goals with and without assisters correctly", () => {
    const match = createMockMatch();
    const visibleEvents = [
      { minute: 10, type: "goal", clubId: "home", playerId: "scorer1", secondaryPlayerId: "assist1", description: "" },
      { minute: 45, type: "goal", clubId: "away", playerId: "scorer2", description: "" }
    ] as any[];

    const moments = createKeyMoments(match, visibleEvents, mockResolver);

    expect(moments).toHaveLength(2);
    expect(moments[0]).toMatchObject({
      minute: 10,
      type: "goal",
      clubId: "home",
      text: "10' GOAL Player scorer1 (Player assist1) - Club home",
      playerName: "Player scorer1",
      secondaryPlayerName: "Player assist1"
    });
    expect(moments[1]).toMatchObject({
      minute: 45,
      type: "goal",
      clubId: "away",
      text: "45' GOAL Player scorer2 - Club away",
      playerName: "Player scorer2",
      secondaryPlayerName: undefined
    });
  });

  it("extracts big chances and ignores them if there is a goal for the same club in that minute", () => {
    const match = createMockMatch();
    const visibleEvents = [
      // Big chance that does NOT lead to a goal for the home team
      { minute: 20, type: "shot", clubId: "home", playerId: "playerA", xg: 0.35, description: "" },
      // Big chance that DOES lead to a goal for the home team in the same minute
      { minute: 30, type: "shot", clubId: "home", playerId: "playerB", xg: 0.4, description: "" },
      { minute: 30, type: "goal", clubId: "home", playerId: "playerB", description: "" }
    ] as any[];

    const moments = createKeyMoments(match, visibleEvents, mockResolver);

    expect(moments).toHaveLength(2); // One big chance at 20', one goal at 30'
    expect(moments[0]).toMatchObject({
      minute: 20,
      type: "big_chance",
      clubId: "home",
      text: "20' Big chance Player playerA - Club home"
    });
    expect(moments[1]).toMatchObject({
      minute: 30,
      type: "goal",
      clubId: "home",
      text: "30' GOAL Player playerB - Club home"
    });
  });

  it("ignores minor events (event_control, non-big chances, regular saves)", () => {
    const match = createMockMatch();
    const visibleEvents = [
      { minute: 5, type: "event_control", clubId: "home", description: "" },
      { minute: 15, type: "shot", clubId: "home", playerId: "playerA", xg: 0.12, description: "" },
      { minute: 15, type: "save", clubId: "away", playerId: "keeperB", description: "" }
    ] as any[];

    const moments = createKeyMoments(match, visibleEvents, mockResolver);

    expect(moments).toHaveLength(0);
  });

  it("gracefully processes card events", () => {
    const match = createMockMatch();
    const visibleEvents = [
      { minute: 55, type: "yellow_card", clubId: "home", playerId: "playerA", description: "" },
      { minute: 88, type: "red_card", clubId: "away", playerId: "playerB", description: "" }
    ] as any[];

    const moments = createKeyMoments(match, visibleEvents, mockResolver);

    expect(moments).toHaveLength(2);
    expect(moments[0]).toMatchObject({
      minute: 55,
      type: "yellow_card",
      clubId: "home",
      text: "55' YELLOW CARD Player playerA - Club home"
    });
    expect(moments[1]).toMatchObject({
      minute: 88,
      type: "red_card",
      clubId: "away",
      text: "88' RED CARD Player playerB - Club away"
    });
  });
});
