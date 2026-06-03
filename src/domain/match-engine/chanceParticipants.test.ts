import { describe, expect, it } from "vitest";
import { creatorPositionWeight, finisherPositionWeight } from "./chanceParticipants";

describe("chance participants", () => {
  it("keeps central defenders away from most open-play finishes", () => {
    expect(finisherPositionWeight("fast_breakaway", "ST")).toBeGreaterThan(finisherPositionWeight("fast_breakaway", "CB") * 20);
    expect(finisherPositionWeight("sustained_pressure", "AM")).toBeGreaterThan(finisherPositionWeight("sustained_pressure", "CB") * 10);
    expect(finisherPositionWeight("wide_cross", "ST")).toBeGreaterThan(finisherPositionWeight("wide_cross", "CB") * 10);
  });

  it("gives central defenders a genuine aerial set-piece role", () => {
    expect(finisherPositionWeight("corner", "CB")).toBeGreaterThan(finisherPositionWeight("corner", "CM"));
    expect(finisherPositionWeight("indirect_free_kick", "CB")).toBeGreaterThan(finisherPositionWeight("indirect_free_kick", "CM"));
  });

  it("prefers wide players and fullbacks as cross creators", () => {
    expect(creatorPositionWeight("wide_cross", "LW")).toBeGreaterThan(creatorPositionWeight("wide_cross", "CB") * 20);
    expect(creatorPositionWeight("corner", "WB")).toBeGreaterThan(creatorPositionWeight("corner", "ST") * 3);
  });
});

