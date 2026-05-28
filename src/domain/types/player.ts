export type OutfieldStats = {
  PAS: number;
  SHO: number;
  TAC: number;
  CRO: number;
  HEA: number;
  ACC: number;
  TEC: number;
  PHY: number;
  MEN: number;
};

export type GoalkeeperStats = {
  REF: number;
  HAN: number;
  DIS: number;
  TEC: number;
  PHY: number;
  MEN: number;
};

export type PlayerPosition =
  | "GK"
  | "CB"
  | "LB"
  | "RB"
  | "WB"
  | "DM"
  | "CM"
  | "AM"
  | "LW"
  | "RW"
  | "ST";

export type PlayerRole =
  | "goalkeeper"
  | "defensive_defender"
  | "ball_playing_defender"
  | "fullback"
  | "holding_midfielder"
  | "box_to_box_midfielder"
  | "playmaker"
  | "winger"
  | "inside_forward"
  | "target_forward"
  | "pressing_forward";

export type PlayerDevelopment = {
  trainingXp: number;
  matchXp: number;
  developmentRate: number;
  ageCurveStage: "youth" | "developing" | "prime" | "declining";
  cappedStats: string[];
  statProgress: Record<string, number>;
  lastMatchXpGained: number;
  lastTrainingXpGained: number;
  recentStatGrowth: PlayerStatGrowth[];
  recentDevelopmentNotes: string[];
};

export type PlayerStatGrowth = {
  statKey: string;
  from: number;
  to: number;
  source: "match" | "training" | "combined";
  matchId?: string;
};

export type PlayerContract = {
  wagePerWeek: number;
  weeksRemaining: number;
  marketValue: number;
  releaseClause?: number;
};

export type PlayerStatus = {
  fitness: number;
  morale: number;
  form: number;
  injuryWeeksRemaining: number;
  suspendedMatchesRemaining: number;
};

export type PlayerHistory = {
  seasonsPlayed: number;
  totalAppearances: number;
  totalGoals: number;
  totalAssists: number;
  totalCleanSheets?: number;
  previousClubIds: string[];
};

export type PlayerAppearanceProfile =
  | "youthful"
  | "veteran"
  | "athletic"
  | "stocky"
  | "lean"
  | "commanding";

export type PlayerVisualIdentity = {
  portraitSeed: string;
  appearanceProfile: PlayerAppearanceProfile;
  kitNumber: number;
};

export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  nationality?: string;
  clubId: string | null;
  primaryPosition: PlayerPosition;
  secondaryPositions: PlayerPosition[];
  preferredRole?: PlayerRole;
  currentStats: OutfieldStats | GoalkeeperStats;
  potentialStats: OutfieldStats | GoalkeeperStats;
  development: PlayerDevelopment;
  contract: PlayerContract;
  status: PlayerStatus;
  history: PlayerHistory;
  visualIdentity: PlayerVisualIdentity;
};

export const outfieldStatKeys = [
  "PAS",
  "SHO",
  "TAC",
  "CRO",
  "HEA",
  "ACC",
  "TEC",
  "PHY",
  "MEN"
] as const;

export const goalkeeperStatKeys = ["REF", "HAN", "DIS", "TEC", "PHY", "MEN"] as const;

export type OutfieldStatKey = (typeof outfieldStatKeys)[number];
export type GoalkeeperStatKey = (typeof goalkeeperStatKeys)[number];

export function isGoalkeeperStats(
  stats: OutfieldStats | GoalkeeperStats
): stats is GoalkeeperStats {
  return "REF" in stats;
}
