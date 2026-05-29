import { describe, expect, it } from "vitest";
import { squadTablePresets } from "./squadTablePresets";

describe("squad table presets", () => {
  it("defines compact presets with required columns", () => {
    const overview = squadTablePresets.find((preset) => preset.id === "overview")!;
    const attributes = squadTablePresets.find((preset) => preset.id === "attributes")!;
    const development = squadTablePresets.find((preset) => preset.id === "development")!;

    expect(overview.columns).toEqual(expect.arrayContaining(["Player", "OVR", "Est. POT", "Form", "Avg Rating"]));
    expect(attributes.columns).toEqual([
      "Player",
      "Position",
      "PAS",
      "SHO",
      "TAC",
      "CRO",
      "HEA",
      "ACC",
      "STA",
      "DRI",
      "POS",
      "REF",
      "HAN",
      "DIS",
      "TEC",
      "PHY",
      "MEN"
    ]);
    expect(attributes.columns).not.toEqual(expect.arrayContaining(["PAS/REF", "SHO/HAN", "TAC/DIS"]));
    expect(development.columns).toEqual([
      "Player",
      "Age",
      "Position",
      "OVR",
      "Est. POT",
      "Match XP",
      "Training XP",
      "Last XP",
      "Recent Growth",
      "Cap Status"
    ]);
    expect(Math.max(...squadTablePresets.filter((preset) => preset.id !== "attributes").map((preset) => preset.columns.length))).toBeLessThanOrEqual(10);
  });
});
