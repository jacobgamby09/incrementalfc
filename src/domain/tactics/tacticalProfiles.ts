import type { ChanceType } from "../types/match";
import type { Formation, RiskLevel, TacticalFocus } from "../types/tactics";

export type PhaseKey = "defence" | "midfield" | "attack";
export type StatCode =
  | "PAS"
  | "SHO"
  | "TAC"
  | "CRO"
  | "HEA"
  | "ACC"
  | "STA"
  | "DRI"
  | "POS"
  | "REF"
  | "HAN"
  | "DIS"
  | "TEC"
  | "PHY"
  | "MEN";

export type TacticalProfile = {
  title: string;
  benefits: string[];
  tradeoffs: string[];
  primaryStats: StatCode[];
  likelyChanceTypes: ChanceType[];
  vulnerabilities: string[];
  phaseModifiers: Record<PhaseKey, number>;
  chanceWeights: Partial<Record<ChanceType, number>>;
  chanceQuality: Partial<Record<ChanceType, number>>;
  ownChanceCreationModifier: number;
  opponentChanceCreationModifier: number;
  eventVolumeModifier: number;
  volatilityModifier: number;
  fastBreakExposure: number;
};

export const formationProfiles: Record<Formation, TacticalProfile> = {
  "4-4-2": {
    title: "Balanced two-forward structure",
    benefits: ["Good wide-cross supply and box presence.", "Two forwards help attack rebounds and second balls."],
    tradeoffs: ["Can be outnumbered centrally by three-midfielder shapes."],
    primaryStats: ["CRO", "HEA", "SHO", "POS"],
    likelyChanceTypes: ["wide_cross", "rebound_big_chance"],
    vulnerabilities: ["Central control", "Technical midfield overloads"],
    phaseModifiers: { defence: 1, midfield: 0.98, attack: 1.03 },
    chanceWeights: { wide_cross: 0.35, rebound_big_chance: 0.08 },
    chanceQuality: { wide_cross: 0.03, rebound_big_chance: 0.02 },
    ownChanceCreationModifier: 0,
    opponentChanceCreationModifier: 0,
    eventVolumeModifier: 0,
    volatilityModifier: 0,
    fastBreakExposure: 0
  },
  "4-3-3": {
    title: "Wide attacking pressure",
    benefits: ["Supports wingers and sustained spells.", "Good shape for wide pressure high up the pitch."],
    tradeoffs: ["Aggressive use can leave space for transitions."],
    primaryStats: ["DRI", "ACC", "CRO", "TEC"],
    likelyChanceTypes: ["wide_cross", "sustained_pressure"],
    vulnerabilities: ["Fast breaks behind advanced wide players"],
    phaseModifiers: { defence: 0.99, midfield: 1.02, attack: 1.04 },
    chanceWeights: { wide_cross: 0.35, sustained_pressure: 0.2, fast_breakaway: 0.1 },
    chanceQuality: { wide_cross: 0.02, sustained_pressure: 0.02 },
    ownChanceCreationModifier: 0.01,
    opponentChanceCreationModifier: 0,
    eventVolumeModifier: 1,
    volatilityModifier: 0.02,
    fastBreakExposure: 0.02
  },
  "4-2-3-1": {
    title: "Layered attacking midfield",
    benefits: ["Strong central control and sustained pressure.", "Rewards technical AM and CM quality."],
    tradeoffs: ["Can rely heavily on one striker to finish the moves."],
    primaryStats: ["PAS", "TEC", "POS", "MEN"],
    likelyChanceTypes: ["sustained_pressure"],
    vulnerabilities: ["Isolated striker", "Direct counters into wide channels"],
    phaseModifiers: { defence: 1.01, midfield: 1.05, attack: 1.01 },
    chanceWeights: { sustained_pressure: 0.35 },
    chanceQuality: { sustained_pressure: 0.03 },
    ownChanceCreationModifier: 0.01,
    opponentChanceCreationModifier: -0.005,
    eventVolumeModifier: 0,
    volatilityModifier: -0.01,
    fastBreakExposure: 0.01
  },
  "3-5-2": {
    title: "Central overload",
    benefits: ["Strong midfield control and two-striker presence.", "Wing backs support both possession and supply."],
    tradeoffs: ["Can be stretched by strong wide attacks."],
    primaryStats: ["PAS", "TEC", "STA", "POS"],
    likelyChanceTypes: ["sustained_pressure", "wide_cross"],
    vulnerabilities: ["Wide crossing teams", "Fast switches behind wing backs"],
    phaseModifiers: { defence: 1.01, midfield: 1.07, attack: 1.02 },
    chanceWeights: { sustained_pressure: 0.35, wide_cross: 0.15 },
    chanceQuality: { sustained_pressure: 0.02, rebound_big_chance: 0.02 },
    ownChanceCreationModifier: 0.01,
    opponentChanceCreationModifier: 0.005,
    eventVolumeModifier: 1,
    volatilityModifier: 0,
    fastBreakExposure: 0.02
  },
  "5-4-1": {
    title: "Compact defensive block",
    benefits: ["Protects the box and encourages safer counters.", "Useful against stronger opponents."],
    tradeoffs: ["Low natural chance volume and fewer bodies forward."],
    primaryStats: ["TAC", "POS", "PHY", "MEN"],
    likelyChanceTypes: ["fast_breakaway"],
    vulnerabilities: ["Pressure can build if counters do not stick"],
    phaseModifiers: { defence: 1.08, midfield: 0.96, attack: 0.9 },
    chanceWeights: { fast_breakaway: 0.35, sustained_pressure: -0.15 },
    chanceQuality: { fast_breakaway: 0.02 },
    ownChanceCreationModifier: -0.025,
    opponentChanceCreationModifier: -0.025,
    eventVolumeModifier: -2,
    volatilityModifier: -0.02,
    fastBreakExposure: -0.02
  },
  "5-3-2": {
    title: "Defensive two-forward counter shape",
    benefits: ["Strong central defensive structure with two outlets.", "More counter and box threat than a lone striker block."],
    tradeoffs: ["Less width and lower sustained pressure than midfield-heavy shapes."],
    primaryStats: ["TAC", "POS", "SHO", "ACC"],
    likelyChanceTypes: ["fast_breakaway", "rebound_big_chance"],
    vulnerabilities: ["Wide overloads", "Long spells without the ball"],
    phaseModifiers: { defence: 1.07, midfield: 0.98, attack: 0.97 },
    chanceWeights: { fast_breakaway: 0.3, rebound_big_chance: 0.07, sustained_pressure: -0.1 },
    chanceQuality: { fast_breakaway: 0.03, rebound_big_chance: 0.02 },
    ownChanceCreationModifier: -0.015,
    opponentChanceCreationModifier: -0.018,
    eventVolumeModifier: -1,
    volatilityModifier: 0,
    fastBreakExposure: -0.01
  },
  "3-4-3": {
    title: "Aggressive wide attacking shape",
    benefits: ["Creates wide pressure and overloads high areas.", "Puts three attackers around the box."],
    tradeoffs: ["Leaves space behind wing backs and can be hit by fast breaks."],
    primaryStats: ["DRI", "ACC", "CRO", "SHO"],
    likelyChanceTypes: ["wide_cross", "sustained_pressure"],
    vulnerabilities: ["Fast breakaways", "Direct balls into channels"],
    phaseModifiers: { defence: 0.95, midfield: 1.01, attack: 1.08 },
    chanceWeights: { wide_cross: 0.35, sustained_pressure: 0.25, fast_breakaway: 0.1 },
    chanceQuality: { wide_cross: 0.03, sustained_pressure: 0.02 },
    ownChanceCreationModifier: 0.02,
    opponentChanceCreationModifier: 0.015,
    eventVolumeModifier: 2,
    volatilityModifier: 0.04,
    fastBreakExposure: 0.05
  },
  "3-4-2-1": {
    title: "Technical half-space control",
    benefits: ["Creates sustained pressure through AM/CM quality.", "Good control when the technical spine is strong."],
    tradeoffs: ["Can lack pure width and box presence."],
    primaryStats: ["PAS", "TEC", "POS", "DRI"],
    likelyChanceTypes: ["sustained_pressure"],
    vulnerabilities: ["Fast breaks if overcommitted", "Physical defensive blocks"],
    phaseModifiers: { defence: 0.98, midfield: 1.06, attack: 1.03 },
    chanceWeights: { sustained_pressure: 0.42, wide_cross: -0.08 },
    chanceQuality: { sustained_pressure: 0.04 },
    ownChanceCreationModifier: 0.01,
    opponentChanceCreationModifier: 0,
    eventVolumeModifier: 0,
    volatilityModifier: -0.005,
    fastBreakExposure: 0.025
  }
};

export const focusProfiles: Record<TacticalFocus, TacticalProfile> = {
  balanced: {
    title: "Balanced approach",
    benefits: ["Keeps chance creation varied and stable."],
    tradeoffs: ["Does not strongly target a specific opponent weakness."],
    primaryStats: ["PAS", "SHO", "TAC", "POS"],
    likelyChanceTypes: ["fast_breakaway", "wide_cross", "sustained_pressure"],
    vulnerabilities: ["Specialist opponents can impose a clearer identity."],
    phaseModifiers: { defence: 1, midfield: 1, attack: 1 },
    chanceWeights: {},
    chanceQuality: {},
    ownChanceCreationModifier: 0,
    opponentChanceCreationModifier: 0,
    eventVolumeModifier: 0,
    volatilityModifier: 0,
    fastBreakExposure: 0
  },
  wide_play: {
    title: "Wide Play",
    benefits: ["Creates more wide crosses.", "Rewards CRO/HEA runners and physical box presence."],
    tradeoffs: ["Can be blunted by aerial defenders and strong handling goalkeepers."],
    primaryStats: ["DRI", "CRO", "ACC", "HEA", "POS"],
    likelyChanceTypes: ["wide_cross", "rebound_big_chance"],
    vulnerabilities: ["Strong aerial defenders", "Goalkeepers with good HAN"],
    phaseModifiers: { defence: 0.99, midfield: 1, attack: 1.03 },
    chanceWeights: { wide_cross: 0.6, rebound_big_chance: 0.05 },
    chanceQuality: { wide_cross: 0.06 },
    ownChanceCreationModifier: 0.01,
    opponentChanceCreationModifier: 0,
    eventVolumeModifier: 1,
    volatilityModifier: 0.01,
    fastBreakExposure: 0.01
  },
  fast_breaks: {
    title: "Fast Breaks",
    benefits: ["Creates more transition chances.", "Rewards ACC, TEC, SHO and composed decisions."],
    tradeoffs: ["Produces less sustained pressure and more volatile attacks."],
    primaryStats: ["ACC", "DRI", "SHO", "POS"],
    likelyChanceTypes: ["fast_breakaway"],
    vulnerabilities: ["Deep conservative blocks", "Poor finishing under pressure"],
    phaseModifiers: { defence: 0.99, midfield: 0.97, attack: 1.04 },
    chanceWeights: { fast_breakaway: 0.6, sustained_pressure: -0.12 },
    chanceQuality: { fast_breakaway: 0.06 },
    ownChanceCreationModifier: 0.015,
    opponentChanceCreationModifier: 0.005,
    eventVolumeModifier: 1,
    volatilityModifier: 0.04,
    fastBreakExposure: 0.015
  },
  sustained_pressure: {
    title: "Sustained Pressure",
    benefits: ["Turns midfield control into repeated attacking sequences.", "Rewards PAS, TEC, SHO and MEN."],
    tradeoffs: ["Can expose counters if used with high risk."],
    primaryStats: ["PAS", "TEC", "POS", "MEN", "STA"],
    likelyChanceTypes: ["sustained_pressure"],
    vulnerabilities: ["Fast breaks into vacated space", "Compact defensive blocks"],
    phaseModifiers: { defence: 0.99, midfield: 1.04, attack: 1.03 },
    chanceWeights: { sustained_pressure: 0.6, fast_breakaway: -0.08 },
    chanceQuality: { sustained_pressure: 0.06 },
    ownChanceCreationModifier: 0.02,
    opponentChanceCreationModifier: 0.005,
    eventVolumeModifier: 2,
    volatilityModifier: 0.01,
    fastBreakExposure: 0.025
  },
  defensive_shape: {
    title: "Defensive Shape",
    benefits: ["Reduces opponent chance creation and chance quality.", "Protects central zones and aerial situations."],
    tradeoffs: ["Lowers own attacking ambition and chance volume."],
    primaryStats: ["TAC", "POS", "PHY", "HEA", "MEN"],
    likelyChanceTypes: ["fast_breakaway"],
    vulnerabilities: ["Limited attacking output", "Sustained pressure if clearances fail"],
    phaseModifiers: { defence: 1.07, midfield: 0.97, attack: 0.93 },
    chanceWeights: { fast_breakaway: 0.2, sustained_pressure: -0.08 },
    chanceQuality: { fast_breakaway: 0.02 },
    ownChanceCreationModifier: -0.025,
    opponentChanceCreationModifier: -0.04,
    eventVolumeModifier: -2,
    volatilityModifier: -0.025,
    fastBreakExposure: -0.035
  },
  control: {
    title: "Control",
    benefits: ["Improves midfield control.", "Reduces transition chaos and opponent fast breaks."],
    tradeoffs: ["Less explosive chance creation than direct attacking focuses."],
    primaryStats: ["PAS", "TEC", "POS", "MEN"],
    likelyChanceTypes: ["sustained_pressure"],
    vulnerabilities: ["May circulate possession without enough penetration."],
    phaseModifiers: { defence: 1.02, midfield: 1.07, attack: 0.98 },
    chanceWeights: { sustained_pressure: 0.25, fast_breakaway: -0.12 },
    chanceQuality: { sustained_pressure: 0.02 },
    ownChanceCreationModifier: -0.005,
    opponentChanceCreationModifier: -0.02,
    eventVolumeModifier: -1,
    volatilityModifier: -0.04,
    fastBreakExposure: -0.03
  },
  tiki_taka: {
    title: "Tiki-taka",
    benefits: ["Creates technical sustained pressure.", "Rewards PAS, TEC, MEN and quick supporting movement."],
    tradeoffs: ["Can struggle against physical defensive shape and fast breaks if overcommitted."],
    primaryStats: ["PAS", "TEC", "DRI", "POS", "MEN"],
    likelyChanceTypes: ["sustained_pressure"],
    vulnerabilities: ["Fast breaks", "Physical compact blocks"],
    phaseModifiers: { defence: 0.98, midfield: 1.06, attack: 1.02 },
    chanceWeights: { sustained_pressure: 0.5, fast_breakaway: -0.08 },
    chanceQuality: { sustained_pressure: 0.07 },
    ownChanceCreationModifier: 0.015,
    opponentChanceCreationModifier: 0.008,
    eventVolumeModifier: 1,
    volatilityModifier: 0,
    fastBreakExposure: 0.025
  }
};

export const riskProfiles: Record<RiskLevel, Pick<
  TacticalProfile,
  "benefits" | "tradeoffs" | "phaseModifiers" | "ownChanceCreationModifier" | "opponentChanceCreationModifier" | "eventVolumeModifier" | "volatilityModifier" | "fastBreakExposure"
> & { title: string }> = {
  conservative: {
    title: "Conservative Risk",
    benefits: ["Reduces opponent transitions and protects the defensive shape."],
    tradeoffs: ["Lowers attacking event volume and chance creation."],
    phaseModifiers: { defence: 1.03, midfield: 0.99, attack: 0.96 },
    ownChanceCreationModifier: -0.03,
    opponentChanceCreationModifier: -0.025,
    eventVolumeModifier: -2,
    volatilityModifier: -0.03,
    fastBreakExposure: -0.04
  },
  balanced: {
    title: "Balanced Risk",
    benefits: ["Keeps event volume steady without overexposing the defence."],
    tradeoffs: ["Does not strongly chase the match state."],
    phaseModifiers: { defence: 1, midfield: 1, attack: 1 },
    ownChanceCreationModifier: 0,
    opponentChanceCreationModifier: 0,
    eventVolumeModifier: 0,
    volatilityModifier: 0,
    fastBreakExposure: 0
  },
  aggressive: {
    title: "Aggressive Risk",
    benefits: ["Increases event volume and attacking chance creation."],
    tradeoffs: ["Exposes the team to opponent transitions and fast breakaways."],
    phaseModifiers: { defence: 0.96, midfield: 1.01, attack: 1.05 },
    ownChanceCreationModifier: 0.05,
    opponentChanceCreationModifier: 0.03,
    eventVolumeModifier: 4,
    volatilityModifier: 0.05,
    fastBreakExposure: 0.06
  }
};
