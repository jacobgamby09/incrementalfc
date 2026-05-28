export type StatRangeProfile = {
  typicalCurrentMin: number;
  typicalCurrentMax: number;
  typicalPotentialMin: number;
  typicalPotentialMax: number;
  rarePotentialMax: number;
};

export type LeagueRewardProfile = {
  participationPrize: number;
  championPrize: number;
  promotionBonus: number;
};

export type League = {
  id: string;
  name: string;
  level: number;
  clubIds: string[];
  teamsCount: number;
  matchesPerSeason: number;
  promotionSpots: number;
  relegationSpots: number;
  playerStatRange: StatRangeProfile;
  rewardProfile: LeagueRewardProfile;
  facilityCapLimit: number;
  reputationRequirement?: number;
};

export type LeagueTableEntry = {
  clubId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type Season = {
  id: string;
  seasonNumber: number;
  leagueId: string;
  clubIds: string[];
  fixtures: Fixture[];
  table: LeagueTableEntry[];
  currentMatchday: number;
  status: "preseason" | "active" | "completed";
  rewardsPaid: boolean;
};

export type Fixture = {
  id: string;
  seasonId: string;
  matchday: number;
  homeClubId: string;
  awayClubId: string;
  matchId?: string;
  status: "scheduled" | "played";
};
