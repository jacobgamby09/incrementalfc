import type { RandomSource } from "../../utils/random";
import type { SetPieceChanceType } from "../types/match";
import type { Tactic } from "../types/tactics";

export function pickSetPieceAfterFailedAttack(defendingTactic: Tactic, rng: RandomSource): SetPieceChanceType | undefined {
  const foulChance =
    0.07 +
    (defendingTactic.riskLevel === "aggressive" ? 0.025 : 0) -
    (defendingTactic.riskLevel === "conservative" ? 0.015 : 0);

  if (rng() >= foulChance) return undefined;

  const severityRoll = rng();
  const penaltyThreshold = defendingTactic.riskLevel === "aggressive" ? 0.09 : 0.055;
  if (severityRoll < penaltyThreshold) return "penalty";
  if (severityRoll < 0.42) return "direct_free_kick";
  return "indirect_free_kick";
}

export function createsDangerousCornerAfterSave(rng: RandomSource): boolean {
  return rng() < 0.16;
}

