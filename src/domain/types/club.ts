import type { EconomyState, FacilitySet } from "./economy";
import type { ClubTactics } from "./tactics";
import type { Player } from "./player";
import type { ClubTraining } from "./training";

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
  prospectGenerationProgress: number;
  pendingProspect: Player | null;
  youthCoachBonus: number;
};

export type ScoutingDepartment = {
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

export type ClubArchetype = "ambitious" | "stable" | "youth_development" | "veteran" | "financially_cautious";

export type ClubEcosystemState = {
  archetype: ClubArchetype;
  financialPressure: number; // 0 to 100
  squadNeedProfile: {
    positions: string[];
    minOvr: number;
  };
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
  training: ClubTraining;
  academy: YouthAcademy;
  scouting: ScoutingDepartment;
  seasonStats: ClubSeasonStats;
  history: ClubHistory;
  ecosystem: ClubEcosystemState;
};
