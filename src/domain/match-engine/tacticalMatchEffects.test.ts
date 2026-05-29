import { describe, expect, it } from "vitest";
import type { Tactic } from "../types/tactics";
import type { PhaseStrengths } from "./calculatePhaseStrengths";
import {
  calculateChanceCreationChance,
  calculateChanceQualityMultiplier,
  getChanceTypeWeights,
  getEventVolumeModifier
} from "./tacticalMatchEffects";

const basePhase: PhaseStrengths = {
  attack: 6,
  defence: 6,
  midfield: 6,
  goalkeeper: 6,
  familiarity: 50,
  averageMentality: 6
};

function tactic(overrides: Partial<Tactic>): Tactic {
  return {
    id: "test_tactic",
    name: "Test",
    formation: "4-4-2",
    focus: "balanced",
    riskLevel: "balanced",
    instructions: [],
    ...overrides
  };
}

describe("tactical match effects", () => {
  it("formation modifiers affect chance profile in expected directions", () => {
    const compact = getChanceTypeWeights(tactic({ formation: "5-4-1" }));
    const technical = getChanceTypeWeights(tactic({ formation: "3-4-2-1" }));

    expect(compact.fast_breakaway).toBeGreaterThan(technical.fast_breakaway);
    expect(technical.sustained_pressure).toBeGreaterThan(compact.sustained_pressure);
  });

  it("defending defensive shape reduces opponent chance creation", () => {
    const attackingTactic = tactic({ focus: "sustained_pressure" });
    const normalDefence = tactic({ focus: "balanced" });
    const defensiveShape = tactic({ focus: "defensive_shape" });

    expect(calculateChanceCreationChance(basePhase, basePhase, attackingTactic, defensiveShape))
      .toBeLessThan(calculateChanceCreationChance(basePhase, basePhase, attackingTactic, normalDefence));
  });

  it("aggressive risk increases volatility and exposure", () => {
    const aggressive = tactic({ riskLevel: "aggressive" });
    const conservative = tactic({ riskLevel: "conservative" });
    const weightsAgainstAggressive = getChanceTypeWeights(tactic({ focus: "fast_breaks" }), aggressive);
    const weightsAgainstConservative = getChanceTypeWeights(tactic({ focus: "fast_breaks" }), conservative);

    expect(getEventVolumeModifier(aggressive)).toBeGreaterThan(getEventVolumeModifier(conservative));
    expect(weightsAgainstAggressive.fast_breakaway).toBeGreaterThan(weightsAgainstConservative.fast_breakaway);
  });

  it("control improves control profile and reduces transition chaos", () => {
    const controlled = tactic({ focus: "control" });
    const balanced = tactic({ focus: "balanced" });

    expect(getEventVolumeModifier(controlled)).toBeLessThanOrEqual(getEventVolumeModifier(balanced));
    expect(getChanceTypeWeights(tactic({ focus: "fast_breaks" }), controlled).fast_breakaway)
      .toBeLessThan(getChanceTypeWeights(tactic({ focus: "fast_breaks" }), balanced).fast_breakaway);
  });

  it("tiki-taka rewards technical quality and increases sustained pressure tendency", () => {
    const tikiTaka = tactic({ focus: "tiki_taka" });
    const balanced = tactic({ focus: "balanced" });

    expect(getChanceTypeWeights(tikiTaka).sustained_pressure)
      .toBeGreaterThan(getChanceTypeWeights(balanced).sustained_pressure);
    expect(calculateChanceQualityMultiplier({
      chanceType: "sustained_pressure",
      attackingTactic: tikiTaka,
      defendingTactic: balanced,
      attackerSkill: 9,
      creatorSkill: 9
    })).toBeGreaterThan(calculateChanceQualityMultiplier({
      chanceType: "sustained_pressure",
      attackingTactic: tikiTaka,
      defendingTactic: balanced,
      attackerSkill: 4,
      creatorSkill: 4
    }));
  });
});
