import type { ChanceType } from "../types/match";
import type { Formation, RiskLevel, TacticalFocus, Tactic } from "../types/tactics";
import { focusProfiles, formationProfiles, riskProfiles, type StatCode } from "./tacticalProfiles";

export type TacticalImpact = {
  title: string;
  benefits: string[];
  tradeoffs: string[];
  primaryStats: StatCode[];
  likelyChanceTypes: ChanceType[];
  vulnerabilities: string[];
  chanceWeightHints: Partial<Record<ChanceType, number>>;
};

function profileToImpact(profile: {
  title: string;
  benefits: string[];
  tradeoffs: string[];
  primaryStats?: StatCode[];
  likelyChanceTypes?: ChanceType[];
  vulnerabilities?: string[];
  chanceWeights?: Partial<Record<ChanceType, number>>;
}): TacticalImpact {
  return {
    title: profile.title,
    benefits: profile.benefits,
    tradeoffs: profile.tradeoffs,
    primaryStats: profile.primaryStats ?? [],
    likelyChanceTypes: profile.likelyChanceTypes ?? [],
    vulnerabilities: profile.vulnerabilities ?? [],
    chanceWeightHints: profile.chanceWeights ?? {}
  };
}

export const formationImpact: Record<Formation, TacticalImpact> = Object.fromEntries(
  Object.entries(formationProfiles).map(([formation, profile]) => [formation, profileToImpact(profile)])
) as Record<Formation, TacticalImpact>;

export const focusImpact: Record<TacticalFocus, TacticalImpact> = Object.fromEntries(
  Object.entries(focusProfiles).map(([focus, profile]) => [focus, profileToImpact(profile)])
) as Record<TacticalFocus, TacticalImpact>;

export const riskImpact: Record<RiskLevel, TacticalImpact> = {
  conservative: {
    title: riskProfiles.conservative.title,
    benefits: riskProfiles.conservative.benefits,
    tradeoffs: riskProfiles.conservative.tradeoffs,
    primaryStats: [],
    likelyChanceTypes: [],
    vulnerabilities: ["Can invite pressure if the team cannot counter."],
    chanceWeightHints: {}
  },
  balanced: {
    title: riskProfiles.balanced.title,
    benefits: riskProfiles.balanced.benefits,
    tradeoffs: riskProfiles.balanced.tradeoffs,
    primaryStats: [],
    likelyChanceTypes: [],
    vulnerabilities: [],
    chanceWeightHints: {}
  },
  aggressive: {
    title: riskProfiles.aggressive.title,
    benefits: riskProfiles.aggressive.benefits,
    tradeoffs: riskProfiles.aggressive.tradeoffs,
    primaryStats: [],
    likelyChanceTypes: ["fast_breakaway"],
    vulnerabilities: ["Opponent transitions into the space behind pressure."],
    chanceWeightHints: {}
  }
};

export function getTacticalImpactPreview(tactic: Tactic): TacticalImpact[] {
  return [formationImpact[tactic.formation], focusImpact[tactic.focus], riskImpact[tactic.riskLevel]];
}
