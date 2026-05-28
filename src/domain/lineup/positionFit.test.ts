import { describe, expect, it } from "vitest";
import { generatePlayer } from "../generation/generatePlayer";
import { lowestLeagueStatRange } from "../../data/constants/leagueProfiles";
import { calculatePositionFit } from "./positionFit";

describe("position fit", () => {
  it("classifies natural, related, poor, and invalid fits", () => {
    const centreBack = generatePlayer({
      clubId: "club_test",
      position: "CB",
      statRange: lowestLeagueStatRange,
      kitNumber: 5
    });
    const rightBack = generatePlayer({
      clubId: "club_test",
      position: "RB",
      statRange: lowestLeagueStatRange,
      kitNumber: 2
    });
    const goalkeeper = generatePlayer({
      clubId: "club_test",
      position: "GK",
      statRange: lowestLeagueStatRange,
      kitNumber: 1
    });

    expect(calculatePositionFit(centreBack, "CB")).toMatchObject({ level: "natural", effectiveness: 1 });
    expect(calculatePositionFit(rightBack, "WB").level).toBe("related");
    expect(calculatePositionFit(rightBack, "LW").level).toBe("poor");
    expect(calculatePositionFit(goalkeeper, "ST").level).toBe("invalid");
  });

  it("uses secondary position before related position logic", () => {
    const midfielder = generatePlayer({
      clubId: "club_test",
      position: "CM",
      statRange: lowestLeagueStatRange,
      kitNumber: 8
    });
    midfielder.secondaryPositions = ["DM"];

    expect(calculatePositionFit(midfielder, "DM")).toMatchObject({
      level: "secondary",
      effectiveness: 0.93
    });
  });
});
