import { describe, expect, it } from "vitest";
import { lowestLeagueStatRange } from "../../data/constants/leagueProfiles";
import { generatePlayer } from "../generation/generatePlayer";
import type { OutfieldStats } from "../types/player";
import type { Tactic } from "../types/tactics";
import {
  duelRecipes,
  effectiveStat,
  getFatigueModifier,
  scoreDuelRecipe
} from "./contextualDuels";

const balancedTactic: Tactic = {
  id: "balanced",
  name: "Balanced",
  formation: "4-4-2",
  focus: "balanced",
  riskLevel: "balanced",
  instructions: []
};

const aggressiveTempoTactic: Tactic = {
  ...balancedTactic,
  id: "tempo",
  focus: "tiki_taka",
  riskLevel: "aggressive"
};

function stats(overrides: Partial<OutfieldStats> = {}): OutfieldStats {
  return {
    PAS: 6,
    SHO: 6,
    TAC: 6,
    CRO: 6,
    HEA: 6,
    ACC: 6,
    STA: 6,
    DRI: 6,
    POS: 6,
    TEC: 6,
    PHY: 6,
    MEN: 6,
    ...overrides
  };
}

describe("contextual duels", () => {
  it("applies diminishing returns above 80", () => {
    expect(effectiveStat(75)).toBe(75);
    expect(effectiveStat(90)).toBe(85);
    expect(effectiveStat(99)).toBe(89.5);
  });

  it("lets positioning partly compensate for lower acceleration in defensive transition duels", () => {
    const smartDefender = scoreDuelRecipe({
      stats: stats({ POS: 10, ACC: 4, TAC: 7, MEN: 7 }),
      recipe: duelRecipes.fastBreakDefence
    });
    const quickButNaiveDefender = scoreDuelRecipe({
      stats: stats({ POS: 4, ACC: 10, TAC: 7, MEN: 7 }),
      recipe: duelRecipes.fastBreakDefence
    });

    expect(smartDefender).toBeGreaterThan(quickButNaiveDefender);
  });

  it("uses dribbling to improve wide and transition attacking duels", () => {
    const strongCarrier = stats({ DRI: 10, ACC: 8, TEC: 8 });
    const weakCarrier = stats({ DRI: 3, ACC: 8, TEC: 8 });

    expect(scoreDuelRecipe({ stats: strongCarrier, recipe: duelRecipes.wideCreation }))
      .toBeGreaterThan(scoreDuelRecipe({ stats: weakCarrier, recipe: duelRecipes.wideCreation }));
    expect(scoreDuelRecipe({ stats: strongCarrier, recipe: duelRecipes.fastBreakAttack }))
      .toBeGreaterThan(scoreDuelRecipe({ stats: weakCarrier, recipe: duelRecipes.fastBreakAttack }));
  });

  it("fatigues low-stamina players more under aggressive high-tempo tactics late in matches", () => {
    const lowStamina = generatePlayer({ clubId: "club", position: "WB", statRange: lowestLeagueStatRange });
    const highStamina = generatePlayer({ clubId: "club", position: "WB", statRange: lowestLeagueStatRange });
    lowStamina.currentStats = stats({ STA: 3 });
    highStamina.currentStats = stats({ STA: 10 });

    const lowAggressive = getFatigueModifier({
      player: lowStamina,
      slotPosition: "WB",
      tactic: aggressiveTempoTactic,
      minute: 86
    });
    const highAggressive = getFatigueModifier({
      player: highStamina,
      slotPosition: "WB",
      tactic: aggressiveTempoTactic,
      minute: 86
    });
    const lowBalanced = getFatigueModifier({
      player: lowStamina,
      slotPosition: "WB",
      tactic: balancedTactic,
      minute: 86
    });

    expect(lowAggressive).toBeLessThan(highAggressive);
    expect(lowAggressive).toBeLessThan(lowBalanced);
  });
});
