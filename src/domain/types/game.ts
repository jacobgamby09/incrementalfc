import type { Club } from "./club";
import type { League, Season } from "./league";
import type { Match } from "./match";
import type { Player } from "./player";
import type { TransferMarketState } from "./transfer";

export type GameDate = {
  seasonNumber: number;
  week: number;
  phase: "preseason" | "regularSeason" | "postseason" | "transferWindow";
};

export type GameSettings = {
  currency: "GBP";
  autosave: boolean;
};

export type GameHistory = {
  seasonsCompleted: number;
  notes: string[];
};

export type PlayerNameRegistry = {
  usedFullNames: string[];
  surnameCounts: Record<string, number>;
};

export type GameState = {
  gameId: string;
  createdAt: string;
  currentDate: GameDate;
  currentSeasonId: string;
  playerClubId: string;
  clubs: Record<string, Club>;
  leagues: Record<string, League>;
  seasons: Record<string, Season>;
  players: Record<string, Player>;
  matches: Record<string, Match>;
  settings: GameSettings;
  history: GameHistory;
  transferMarket: TransferMarketState;
  nameRegistry?: PlayerNameRegistry;
};
