import type { ChanceType } from "../types/match";
import type { Formation, RiskLevel, TacticalFocus, Tactic } from "../types/tactics";

export type TacticalImpact = {
  title: string;
  benefits: string[];
  tradeoffs: string[];
  chanceWeightHints: Partial<Record<ChanceType, number>>;
};

export const formationImpact: Record<Formation, TacticalImpact> = {
  "4-4-2": {
    title: "Two-forward structure",
    benefits: ["Good box presence for crosses and rebounds.", "Simple shape with balanced coverage."],
    tradeoffs: ["Can be outnumbered by teams with an extra central midfielder."],
    chanceWeightHints: { wide_cross: 0.35, rebound_big_chance: 0.08 }
  },
  "4-3-3": {
    title: "Wide attacking pressure",
    benefits: ["Supports wide overloads and sustained attacking spells.", "Uses wingers well."],
    tradeoffs: ["Aggressive wide shape can leave space for transitions."],
    chanceWeightHints: { wide_cross: 0.35, sustained_pressure: 0.2, fast_breakaway: 0.1 }
  },
  "4-2-3-1": {
    title: "Layered midfield support",
    benefits: ["Strong for sustained pressure through an attacking midfielder.", "Keeps two midfielders behind attacks."],
    tradeoffs: ["Can rely heavily on one striker finishing limited chances."],
    chanceWeightHints: { sustained_pressure: 0.35 }
  },
  "3-5-2": {
    title: "Central control",
    benefits: ["Strong central numbers and two forwards for second balls.", "Wing backs can support wide supply."],
    tradeoffs: ["Wide defensive spaces can appear if wing backs are pinned back."],
    chanceWeightHints: { sustained_pressure: 0.35, wide_cross: 0.15 }
  },
  "5-4-1": {
    title: "Compact defensive base",
    benefits: ["Protects against pressure and invites counter attacks.", "Useful against stronger opponents."],
    tradeoffs: ["Lower natural chance production and fewer bodies forward."],
    chanceWeightHints: { fast_breakaway: 0.35, sustained_pressure: -0.15 }
  }
};

export const focusImpact: Record<TacticalFocus, TacticalImpact> = {
  balanced: {
    title: "Balanced approach",
    benefits: ["Keeps chance creation varied and easy to read."],
    tradeoffs: ["Does not strongly target a specific opponent weakness."],
    chanceWeightHints: {}
  },
  wide_play: {
    title: "Wide Play",
    benefits: ["Increases wide cross chance weight.", "Benefits CRO and HEA players attacking the box."],
    tradeoffs: ["Can be less effective against strong aerial defenders."],
    chanceWeightHints: { wide_cross: 0.6 }
  },
  fast_breaks: {
    title: "Fast Breaks",
    benefits: ["Increases fast breakaway chance weight.", "Benefits ACC, TEC, and SHO players."],
    tradeoffs: ["Can reduce sustained pressure and make attacks more volatile."],
    chanceWeightHints: { fast_breakaway: 0.6, sustained_pressure: -0.1 }
  },
  sustained_pressure: {
    title: "Sustained Pressure",
    benefits: ["Increases sustained pressure chance weight.", "Benefits PAS, TEC, and SHO profiles."],
    tradeoffs: ["Can struggle if the forwards lack quality to turn possession into shots."],
    chanceWeightHints: { sustained_pressure: 0.6 }
  },
  defensive_shape: {
    title: "Defensive Shape",
    benefits: ["Keeps the team compact and encourages safer transitions.", "Can still create counters."],
    tradeoffs: ["Usually lowers attacking ambition and chance volume."],
    chanceWeightHints: { fast_breakaway: 0.2 }
  }
};

export const riskImpact: Record<RiskLevel, TacticalImpact> = {
  conservative: {
    title: "Conservative Risk",
    benefits: ["Reduces opponent transitions and protects the defensive shape."],
    tradeoffs: ["Lowers attacking event volume and chance creation."],
    chanceWeightHints: {}
  },
  balanced: {
    title: "Balanced Risk",
    benefits: ["Keeps event volume steady without overexposing the defence."],
    tradeoffs: ["Does not strongly chase the match state."],
    chanceWeightHints: {}
  },
  aggressive: {
    title: "Aggressive Risk",
    benefits: ["Increases event volume and attacking chance creation."],
    tradeoffs: ["Exposes the team to opponent transitions."],
    chanceWeightHints: {}
  }
};

export function getTacticalImpactPreview(tactic: Tactic): TacticalImpact[] {
  return [formationImpact[tactic.formation], focusImpact[tactic.focus], riskImpact[tactic.riskLevel]];
}
