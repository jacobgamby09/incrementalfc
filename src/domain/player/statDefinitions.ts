import { goalkeeperStatKeys, outfieldStatKeys, type GoalkeeperStatKey, type OutfieldStatKey } from "../types/player";

export type StatKey = OutfieldStatKey | GoalkeeperStatKey;

export type StatDefinition = {
  code: StatKey;
  name: string;
  description: string;
  matchEngineUsage: string;
};

export const statDefinitions: Record<StatKey, StatDefinition> = {
  PAS: {
    code: "PAS",
    name: "Passing",
    description: "Quality and reliability when moving the ball through midfield and into attacking areas.",
    matchEngineUsage: "Affects midfield control, sustained pressure, chance creation, and build-up play."
  },
  SHO: {
    code: "SHO",
    name: "Shooting",
    description: "Finishing quality and ability to turn chances into goals.",
    matchEngineUsage: "Affects shot quality and finishing in goal probability calculations."
  },
  TAC: {
    code: "TAC",
    name: "Tackling",
    description: "Defensive timing, ball winning, and ability to stop attacks cleanly.",
    matchEngineUsage: "Affects defensive phase strength, defensive stops, and chance suppression."
  },
  CRO: {
    code: "CRO",
    name: "Crossing",
    description: "Delivery quality from wide areas.",
    matchEngineUsage: "Affects wide cross chance quality and wide-play attacking value."
  },
  HEA: {
    code: "HEA",
    name: "Heading",
    description: "Aerial ability in both boxes.",
    matchEngineUsage: "Affects crosses, rebounds, box defending, and aerial chance outcomes."
  },
  ACC: {
    code: "ACC",
    name: "Acceleration",
    description: "Burst, pace over short distances, and ability to attack space.",
    matchEngineUsage: "Affects fast breakaways, wide threats, recovery, and transition danger."
  },
  STA: {
    code: "STA",
    name: "Stamina",
    description: "Engine, repeat-effort capacity, and ability to maintain intensity late in matches.",
    matchEngineUsage: "Affects fatigue, pressing, wing backs, aggressive risk, repeated actions, and late-match effectiveness."
  },
  DRI: {
    code: "DRI",
    name: "Dribbling",
    description: "Ball-carrying quality, 1v1 ability, and control while moving at speed.",
    matchEngineUsage: "Affects wide play, fast breaks, breaking compact blocks, and transition chance quality."
  },
  POS: {
    code: "POS",
    name: "Positioning",
    description: "Off-ball intelligence, timing, marking, and ability to find or close space.",
    matchEngineUsage: "Affects defensive positioning, attacking movement, box runs, rebounds, and closing angles."
  },
  TEC: {
    code: "TEC",
    name: "Technique",
    description: "General technical quality under pressure.",
    matchEngineUsage: "Used across attacking, midfield, and chance conversion actions."
  },
  PHY: {
    code: "PHY",
    name: "Physicality",
    description: "Strength, stamina, robustness, and duel presence.",
    matchEngineUsage: "Affects defensive contests, midfield resilience, and physical chance types."
  },
  MEN: {
    code: "MEN",
    name: "Mentality",
    description: "Composure, consistency, decision-making, and pressure handling.",
    matchEngineUsage: "Affects pressure situations, close duel outcomes, and tactical reliability."
  },
  REF: {
    code: "REF",
    name: "Reflexes",
    description: "Goalkeeper reaction speed and shot-stopping instinct.",
    matchEngineUsage: "Affects save probability and goals prevented."
  },
  HAN: {
    code: "HAN",
    name: "Handling",
    description: "Goalkeeper catching security and rebound control.",
    matchEngineUsage: "Affects saves, rebounds allowed, and shot containment."
  },
  DIS: {
    code: "DIS",
    name: "Distribution",
    description: "Goalkeeper passing, kicking, and restart quality.",
    matchEngineUsage: "Supports possession control and launch quality from the back."
  }
};

export const allStatKeys: StatKey[] = [...outfieldStatKeys, ...goalkeeperStatKeys]
  .filter((key, index, keys) => keys.indexOf(key) === index) as StatKey[];

export function getStatDefinition(code: string): StatDefinition | undefined {
  return statDefinitions[code as StatKey];
}

export function statTooltip(code: string): string {
  const definition = getStatDefinition(code);
  return definition
    ? `${definition.code} - ${definition.name}: ${definition.description} ${definition.matchEngineUsage}`
    : code;
}
