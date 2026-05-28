import type { EconomyState, FacilitySet } from "./economy";
import type { ClubTactics } from "./tactics";

export type MatchResultCode = "W" | "D" | "L";

export type ClubSeasonStats = {
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  formLastFive: MatchResultCode[];
};

export type ClubHistory = {
  foundedSeason?: number;
  promotions: number;
  relegations: number;
  highestLeagueLevel: number;
  trophies: string[];
};

export type YouthAcademy = {
  level: number;
  weeklyUpkeep: number;
  prospectGenerationProgress: number;
  prospectGenerationRate: number;
  youthCoachBonus: number;
};

export type ScoutingDepartment = {
  level: number;
  weeklyUpkeep: number;
  reportAccuracy: number;
};

export type ClubKitStyle = "classic" | "sash" | "stripes" | "hoops" | "quarters";

export type ClubHubTheme = "community" | "industrial" | "coastal" | "market_town" | "academy";

export type ClubVisualIdentity = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  badgeSeed: string;
  kitStyle: ClubKitStyle;
  hubTheme: ClubHubTheme;
};

export type Club = {
  id: string;
  name: string;
  shortName: string;
  leagueId: string;
  reputation: number;
  fans: number;
  visualIdentity: ClubVisualIdentity;
  squadPlayerIds: string[];
  staffIds: string[];
  economy: EconomyState;
  facilities: FacilitySet;
  tactics: ClubTactics;
  academy: YouthAcademy;
  scouting: ScoutingDepartment;
  seasonStats: ClubSeasonStats;
  history: ClubHistory;
};
