import { describe, expect, it } from "vitest";
import type { Tactic } from "../types/tactics";
import { createsDangerousCornerAfterSave, pickSetPieceAfterFailedAttack } from "./setPieces";

const tactic: Tactic = {
  id: "tactic",
  name: "Tactic",
  formation: "4-4-2",
  focus: "balanced",
  riskLevel: "balanced",
  instructions: []
};

function sequenceRng(values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? values[values.length - 1];
}

describe("set pieces", () => {
  it("creates penalties, direct free kicks, and indirect free kicks as distinct outcomes", () => {
    expect(pickSetPieceAfterFailedAttack(tactic, sequenceRng([0, 0]))).toBe("penalty");
    expect(pickSetPieceAfterFailedAttack(tactic, sequenceRng([0, 0.2]))).toBe("direct_free_kick");
    expect(pickSetPieceAfterFailedAttack(tactic, sequenceRng([0, 0.8]))).toBe("indirect_free_kick");
  });

  it("makes aggressive defending slightly more likely to concede a dangerous set piece", () => {
    const aggressive = { ...tactic, riskLevel: "aggressive" as const };
    const conservative = { ...tactic, riskLevel: "conservative" as const };

    expect(pickSetPieceAfterFailedAttack(aggressive, sequenceRng([0.08, 0.5]))).toBe("indirect_free_kick");
    expect(pickSetPieceAfterFailedAttack(conservative, sequenceRng([0.08, 0.5]))).toBeUndefined();
  });

  it("creates dangerous corners from a minority of saved shots", () => {
    expect(createsDangerousCornerAfterSave(() => 0.1)).toBe(true);
    expect(createsDangerousCornerAfterSave(() => 0.2)).toBe(false);
  });
});

