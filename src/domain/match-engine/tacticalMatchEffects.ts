import { chanceTypeBaseWeights } from "../../data/constants/formations";
import { clamp } from "../../utils/math";
import type { RandomSource } from "../../utils/random";
import type { ChanceType } from "../types/match";
import type { Tactic } from "../types/tactics";
import { focusProfiles, formationProfiles, riskProfiles } from "../tactics/tacticalProfiles";
import type { PhaseStrengths } from "./calculatePhaseStrengths";

export function getEventVolumeModifier(tactic: Tactic): number {
  return (
    formationProfiles[tactic.formation].eventVolumeModifier +
    focusProfiles[tactic.focus].eventVolumeModifier +
    riskProfiles[tactic.riskLevel].eventVolumeModifier
  );
}

export function getTacticVolatility(tactic: Tactic): number {
  return (
    formationProfiles[tactic.formation].volatilityModifier +
    focusProfiles[tactic.focus].volatilityModifier +
    riskProfiles[tactic.riskLevel].volatilityModifier
  );
}

export function getChanceTypeWeights(attackingTactic: Tactic, defendingTactic?: Tactic): Record<ChanceType, number> {
  const weights: Record<ChanceType, number> = { ...chanceTypeBaseWeights };
  const profiles = [formationProfiles[attackingTactic.formation], focusProfiles[attackingTactic.focus]];

  for (const profile of profiles) {
    for (const [chanceType, modifier] of Object.entries(profile.chanceWeights)) {
      weights[chanceType as ChanceType] += modifier ?? 0;
    }
  }

  if (attackingTactic.riskLevel === "aggressive") {
    weights.fast_breakaway += 0.1;
    weights.sustained_pressure += 0.05;
  }
  if (attackingTactic.riskLevel === "conservative") {
    weights.fast_breakaway += 0.06;
    weights.sustained_pressure -= 0.08;
  }

  if (defendingTactic) {
    const exposure =
      formationProfiles[defendingTactic.formation].fastBreakExposure +
      focusProfiles[defendingTactic.focus].fastBreakExposure +
      riskProfiles[defendingTactic.riskLevel].fastBreakExposure;
    weights.fast_breakaway += exposure * 4;

    if (defendingTactic.focus === "defensive_shape") {
      weights.rebound_big_chance -= 0.04;
    }
    if (defendingTactic.focus === "control") {
      weights.fast_breakaway -= 0.08;
    }
  }

  return {
    fast_breakaway: Math.max(weights.fast_breakaway, 0.05),
    wide_cross: Math.max(weights.wide_cross, 0.05),
    sustained_pressure: Math.max(weights.sustained_pressure, 0.05),
    rebound_big_chance: Math.max(weights.rebound_big_chance, 0.05)
  };
}

export function pickWeightedChanceType(
  attackingTactic: Tactic,
  defendingTactic: Tactic,
  rng: RandomSource
): ChanceType {
  const entries = Object.entries(getChanceTypeWeights(attackingTactic, defendingTactic)).map(
    ([chanceType, weight]) => ({
      chanceType: chanceType as ChanceType,
      weight
    })
  );
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * totalWeight;

  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.chanceType;
  }

  return "sustained_pressure";
}

export function calculateChanceCreationChance(
  attackingPhase: PhaseStrengths,
  defendingPhase: PhaseStrengths,
  attackingTactic: Tactic,
  defendingTactic: Tactic,
  duelCreationModifier = 0
): number {
  let chance =
    0.22 +
    (attackingPhase.attack - defendingPhase.defence) * 0.025 +
    formationProfiles[attackingTactic.formation].ownChanceCreationModifier +
    focusProfiles[attackingTactic.focus].ownChanceCreationModifier +
    riskProfiles[attackingTactic.riskLevel].ownChanceCreationModifier +
    formationProfiles[defendingTactic.formation].opponentChanceCreationModifier +
    focusProfiles[defendingTactic.focus].opponentChanceCreationModifier +
    riskProfiles[defendingTactic.riskLevel].opponentChanceCreationModifier;

  if (attackingTactic.focus === "fast_breaks" && defendingTactic.riskLevel === "aggressive") {
    chance += 0.025;
  }
  if (
    (attackingTactic.focus === "sustained_pressure" || attackingTactic.focus === "tiki_taka") &&
    defendingTactic.focus === "defensive_shape"
  ) {
    chance -= 0.015;
  }

  const volatility = getTacticVolatility(attackingTactic) + getTacticVolatility(defendingTactic);
  chance += volatility * 0.15 + duelCreationModifier * 0.45;

  return clamp(chance, 0.07, 0.52);
}

export function calculateChanceQualityMultiplier(options: {
  chanceType: ChanceType;
  attackingTactic: Tactic;
  defendingTactic: Tactic;
  attackerSkill: number;
  creatorSkill?: number;
  duelQualityModifier?: number;
}): number {
  const { chanceType, attackingTactic, defendingTactic, attackerSkill, creatorSkill, duelQualityModifier = 0 } = options;
  const relevantSkill = (attackerSkill + (creatorSkill ?? attackerSkill)) / 2;
  const formationQuality = formationProfiles[attackingTactic.formation].chanceQuality[chanceType] ?? 0;
  const focusQuality = focusProfiles[attackingTactic.focus].chanceQuality[chanceType] ?? 0;
  const focusSupportsChance =
    Boolean(focusProfiles[attackingTactic.focus].chanceQuality[chanceType]) ||
    focusProfiles[attackingTactic.focus].likelyChanceTypes.includes(chanceType);
  const skillFit = focusSupportsChance ? clamp((relevantSkill - 6) / 28, -0.04, 0.08) : 0;
  let multiplier = 1 + formationQuality + focusQuality + skillFit + duelQualityModifier;

  if (defendingTactic.focus === "defensive_shape") {
    multiplier -= chanceType === "wide_cross" || chanceType === "rebound_big_chance" ? 0.08 : 0.06;
  }
  if (defendingTactic.focus === "control" && chanceType === "fast_breakaway") {
    multiplier -= 0.04;
  }
  if (defendingTactic.riskLevel === "conservative" && chanceType === "fast_breakaway") {
    multiplier -= 0.04;
  }
  if (defendingTactic.riskLevel === "aggressive" && chanceType === "fast_breakaway") {
    multiplier += 0.06;
  }
  if (
    attackingTactic.focus === "tiki_taka" &&
    defendingTactic.focus === "defensive_shape" &&
    chanceType === "sustained_pressure"
  ) {
    multiplier -= 0.04;
  }

  return clamp(multiplier, 0.82, 1.18);
}
