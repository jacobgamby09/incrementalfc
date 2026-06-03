import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../types/match";
import { createDisplayTimelineEvents } from "./displayTimeline";

const names: Record<string, string> = {
  creator: "Finn Barker",
  shooter: "Ben Spencer",
  keeper: "Rhys Young"
};

const clubs: Record<string, string> = {
  home: "Incremental FC",
  away: "Greyford City"
};

function display(events: MatchEvent[]) {
  return createDisplayTimelineEvents(events, {
    getPlayerName: (playerId) => names[playerId] ?? playerId,
    getClubName: (clubId) => clubs[clubId] ?? clubId
  });
}

describe("display timeline", () => {
  it("groups a chance, shot, and save into one display event", () => {
    const events: MatchEvent[] = [
      {
        minute: 12,
        type: "chance",
        clubId: "home",
        playerId: "creator",
        secondaryPlayerId: "shooter",
        description: "Setup.",
        chanceType: "sustained_pressure",
        outcome: "created"
      },
      {
        minute: 12,
        type: "shot",
        clubId: "home",
        playerId: "shooter",
        description: "Shot.",
        chanceType: "sustained_pressure",
        xg: 0.19,
        outcome: "saved"
      },
      {
        minute: 12,
        type: "save",
        clubId: "away",
        playerId: "keeper",
        secondaryPlayerId: "shooter",
        description: "Save.",
        chanceType: "sustained_pressure",
        xg: 0.19,
        outcome: "saved"
      }
    ];

    const result = display(events);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: "save",
      minute: 12,
      clubId: "away",
      xg: 0.19,
      chanceType: "sustained_pressure",
      isSave: true,
      primaryPlayerId: "keeper",
      secondaryPlayerId: "shooter",
      rawEventIndexes: [0, 1, 2]
    });
    expect(result[0].text).toContain("Rhys Young saves Ben Spencer's shot from sustained pressure");
  });

  it("groups a chance, shot, and goal into one display event with scorer and xG", () => {
    const events: MatchEvent[] = [
      {
        minute: 34,
        type: "chance",
        clubId: "home",
        playerId: "creator",
        secondaryPlayerId: "shooter",
        description: "Setup.",
        chanceType: "wide_cross",
        outcome: "created"
      },
      {
        minute: 34,
        type: "shot",
        clubId: "home",
        playerId: "shooter",
        description: "Shot.",
        chanceType: "wide_cross",
        xg: 0.14,
        outcome: "scored"
      },
      {
        minute: 34,
        type: "goal",
        clubId: "home",
        playerId: "shooter",
        secondaryPlayerId: "creator",
        description: "Goal.",
        chanceType: "wide_cross",
        xg: 0.14,
        outcome: "scored"
      }
    ];

    const result = display(events);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: "goal",
      clubId: "home",
      xg: 0.14,
      isGoal: true,
      primaryPlayerId: "shooter",
      secondaryPlayerId: "creator",
      rawEventIndexes: [0, 1, 2]
    });
    expect(result[0].text).toContain("GOAL - Ben Spencer scores from a wide cross");
  });

  it("hides setup-only chance rows when followed by a shot outcome", () => {
    const events: MatchEvent[] = [
      {
        minute: 50,
        type: "chance",
        clubId: "home",
        playerId: "creator",
        secondaryPlayerId: "shooter",
        description: "Setup.",
        chanceType: "fast_breakaway",
        outcome: "created"
      },
      {
        minute: 50,
        type: "shot",
        clubId: "home",
        playerId: "shooter",
        description: "Shot.",
        chanceType: "fast_breakaway",
        xg: 0.22,
        outcome: "missed"
      }
    ];

    const result = display(events);

    expect(result).toHaveLength(1);
    expect(result[0].text).not.toContain("Setup");
    expect(result[0].rawEventIndexes).toEqual([0, 1]);
  });

  it("renders penalties as their own readable route", () => {
    const events: MatchEvent[] = [
      {
        minute: 72,
        type: "chance",
        clubId: "home",
        playerId: "shooter",
        secondaryPlayerId: "shooter",
        description: "Penalty.",
        chanceType: "penalty",
        outcome: "created"
      },
      {
        minute: 72,
        type: "shot",
        clubId: "home",
        playerId: "shooter",
        description: "Shot.",
        chanceType: "penalty",
        xg: 0.76,
        outcome: "scored"
      },
      {
        minute: 72,
        type: "goal",
        clubId: "home",
        playerId: "shooter",
        description: "Goal.",
        chanceType: "penalty",
        xg: 0.76,
        outcome: "scored"
      }
    ];

    const result = display(events);

    expect(result).toHaveLength(1);
    expect(result[0].text).toContain("GOAL - Ben Spencer scores from a penalty");
  });

  it("does not mutate raw events while grouping", () => {
    const events: MatchEvent[] = [
      {
        minute: 18,
        type: "chance",
        clubId: "home",
        playerId: "creator",
        secondaryPlayerId: "shooter",
        description: "Setup.",
        chanceType: "sustained_pressure",
        outcome: "created"
      },
      {
        minute: 18,
        type: "shot",
        clubId: "home",
        playerId: "shooter",
        description: "Shot.",
        chanceType: "sustained_pressure",
        xg: 0.16,
        outcome: "missed"
      }
    ];
    const before = structuredClone(events);

    display(events);

    expect(events).toEqual(before);
  });
});
