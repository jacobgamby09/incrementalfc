import { describe, expect, it } from "vitest";
import { lowestLeagueStatRange } from "../../data/constants/leagueProfiles";
import { generatePlayer } from "../generation/generatePlayer";
import {
  getAgeCurveStageForAge,
  getEffectivePotentialValue
} from "./playerPotential";

describe("player potential", () => {
  it("treats age 30 as declining with no effective trainable upside while preserving stored talent", () => {
    const player = generatePlayer({ clubId: "club", position: "ST", statRange: lowestLeagueStatRange, age: 30 });
    player.currentStats = { PAS: 5, SHO: 5, TAC: 5, CRO: 5, HEA: 5, ACC: 5, STA: 5, DRI: 5, POS: 5, TEC: 5, PHY: 5, MEN: 5 };
    player.potentialStats = { PAS: 12, SHO: 12, TAC: 12, CRO: 12, HEA: 12, ACC: 12, STA: 12, DRI: 12, POS: 12, TEC: 12, PHY: 12, MEN: 12 };

    expect(getAgeCurveStageForAge(player.age)).toBe("declining");
    expect(getEffectivePotentialValue(player, "SHO")).toBe(5);
    expect(player.potentialStats.SHO).toBe(12);
  });
});
