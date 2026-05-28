import type { Fixture } from "./league";
import type { PlayerPosition } from "./player";
import type { PlayerStatGrowth } from "./player";
import type { Lineup } from "./tactics";

export type ChanceType =
  | "fast_breakaway"
  | "wide_cross"
  | "sustained_pressure"
  | "rebound_big_chance";

export type MatchResult = {
  homeGoals: number;
  awayGoals: number;
  winnerClubId: string | null;
};

export type MatchEventOutcome =
  | "created"
  | "missed"
  | "saved"
  | "scored"
  | "blocked"
  | "cleared"
  | "error_led_to_chance"
  | "error_led_to_goal";

export type MatchEvent = {
  minute: number;
  type:
    | "event_control"
    | "chance"
    | "shot"
    | "goal"
    | "save"
    | "defensive_stop"
    | "error"
    | "rebound"
    | "red_card"
    | "yellow_card";
  clubId: string;
  playerId?: string;
  secondaryPlayerId?: string;
  description: string;
  xg?: number;
  chanceType?: ChanceType;
  outcome?: MatchEventOutcome;
};

export type MatchTeamStats = {
  eventsWon: number;
  chancesCreated: number;
  shots: number;
  goals: number;
  xg: number;
  savesForced: number;
  reboundsWon: number;
  redCards: number;
  chanceTypeBreakdown: Record<ChanceType, number>;
};

export type MatchProblem = {
  code: string;
  severity: "low" | "medium" | "high";
  text: string;
};

export type MatchRecommendation = {
  problemCode: string;
  text: string;
  category: "training" | "tactics" | "transfers" | "staff" | "facilities" | "lineup";
};

export type PlayerMatchStats = {
  playerId: string;
  clubId: string;
  position: PlayerPosition;
  minutes: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  xg: number;
  keyPasses: number;
  chanceInvolvements: number;
  eventsWon: number;
  duelsWon: number;
  duelsLost: number;
  defensiveActions: number;
  defensiveStops: number;
  errors: number;
  errorsLeadingToGoal: number;
  saves: number;
  xgFaced: number;
  goalsConceded: number;
  reboundsAllowed: number;
};

export type PlayerMatchRating = {
  playerId: string;
  rating: number;
  summary: string;
  positives: string[];
  negatives: string[];
};

export type MatchReport = {
  summary: string;
  homeStats: MatchTeamStats;
  awayStats: MatchTeamStats;
  playerStats: Record<string, PlayerMatchStats>;
  playerRatings: Record<string, PlayerMatchRating>;
  keyProblems: MatchProblem[];
  recommendations: MatchRecommendation[];
};

export type PlayerXpReward = {
  trainingXp?: number;
  matchXp: number;
  rating?: number;
  reason: string;
};

export type DevelopmentRewardSummary = {
  playerId: string;
  playerName: string;
  matchXp: number;
  trainingXp: number;
  statGrowth: PlayerStatGrowth[];
  notes: string[];
};

export type MatchRewards = {
  money: number;
  fans: number;
  reputation: number;
  playerXp: Record<string, PlayerXpReward>;
  tacticalFamiliarity: Record<string, number>;
  trainingXp?: Record<string, number>;
  statGrowth?: DevelopmentRewardSummary[];
};

export type Match = {
  id: string;
  fixtureId: Fixture["id"];
  homeClubId: string;
  awayClubId: string;
  homeLineup: Lineup;
  awayLineup: Lineup;
  result: MatchResult;
  events: MatchEvent[];
  report: MatchReport;
  rewards: MatchRewards;
};
