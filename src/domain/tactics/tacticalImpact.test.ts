import { describe, expect, it } from "vitest";
import { formations, tacticalFocuses } from "../../data/constants/formations";
import type { RiskLevel, Tactic } from "../types/tactics";
import { formationImpact, focusImpact, getTacticalImpactPreview, riskImpact } from "./tacticalImpact";

describe("tactical impact", () => {
  it("has readable impact data for every formation, focus, and risk level", () => {
    const riskLevels: RiskLevel[] = ["conservative", "balanced", "aggressive"];

    for (const formation of formations) {
      expect(formationImpact[formation].benefits.length).toBeGreaterThan(0);
      expect(formationImpact[formation].tradeoffs.length).toBeGreaterThan(0);
    }
    for (const focus of tacticalFocuses) {
      expect(focusImpact[focus].benefits.length).toBeGreaterThan(0);
      expect(focusImpact[focus].tradeoffs.length).toBeGreaterThan(0);
      expect(focusImpact[focus].primaryStats.length).toBeGreaterThan(0);
      expect(focusImpact[focus].likelyChanceTypes.length).toBeGreaterThan(0);
    }
    for (const riskLevel of riskLevels) {
      expect(riskImpact[riskLevel].benefits.length).toBeGreaterThan(0);
      expect(riskImpact[riskLevel].tradeoffs.length).toBeGreaterThan(0);
    }
  });

  it("returns selected formation, focus, and risk impact together", () => {
    const tactic: Tactic = {
      id: "tactic_test",
      name: "Test",
      formation: "4-3-3",
      focus: "wide_play",
      riskLevel: "aggressive",
      instructions: []
    };

    expect(getTacticalImpactPreview(tactic).map((impact) => impact.title)).toEqual([
      "Wide attacking pressure",
      "Wide Play",
      "Aggressive Risk"
    ]);
  });

  it("includes the new control and tiki-taka tactical identities", () => {
    expect(focusImpact.control.benefits.join(" ")).toContain("midfield control");
    expect(focusImpact.control.tradeoffs.join(" ")).toContain("explosive");
    expect(focusImpact.tiki_taka.primaryStats).toEqual(expect.arrayContaining(["PAS", "TEC", "MEN"]));
    expect(focusImpact.tiki_taka.likelyChanceTypes).toContain("sustained_pressure");
  });
});
