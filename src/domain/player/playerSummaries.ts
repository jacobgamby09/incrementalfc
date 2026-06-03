import { roundTo } from "../../utils/math";
import type { GameState } from "../types/game";
import type { Fixture } from "../types/league";
import type { Match, PlayerMatchRating, PlayerMatchStats } from "../types/match";
import {
  isGoalkeeperStats,
  type GoalkeeperStats,
  type OutfieldStats,
  type Player,
  type PlayerPosition
} from "../types/player";
import { getOutfieldStatValue } from "./statAccess";
import { getEffectivePotentialStats, getRealPotentialStats } from "./playerPotential";

export type PlayerRatingHistoryEntry = {
  matchId: string;
  fixtureId: string;
  matchday: number;
  rating: PlayerMatchRating;
  stats: PlayerMatchStats;
};

export type PlayerPerformanceSummary = {
  apps: number;
  goals: number;
  assists: number;
  keyPasses: number;
  formLastFive: number[];
  avgRating?: number;
  lastRating?: number;
  display: {
    avgRating: string;
    lastRating: string;
    form: string;
  };
};

export type PlayerSeasonSummary = PlayerPerformanceSummary & {
  seasonId: string;
  seasonNumber: number;
};

export type PlayerMatchContext = {
  matchId: string;
  clubName: string;
  opponentName: string;
  rating?: PlayerMatchRating;
  stats?: PlayerMatchStats;
};

export type MatchRatingRow = {
  playerId: string;
  playerName: string;
  clubId: string;
  clubName: string;
  clubShortName: string;
  isOwnClub: boolean;
  position: PlayerPosition;
  rating: number;
  keyStatsSummary: string;
  matchContext: PlayerMatchContext;
};

function weightedAverage(values: Array<[number, number]>): number {
  const totalWeight = values.reduce((sum, [, weight]) => sum + weight, 0);
  return values.reduce((sum, [value, weight]) => sum + value * weight, 0) / totalWeight;
}

function outfieldRating(stats: OutfieldStats, position: PlayerPosition): number {
  const value = (key: keyof OutfieldStats) => getOutfieldStatValue(stats, key);
  if (position === "ST") return weightedAverage([[value("SHO"), 3], [value("POS"), 2], [value("ACC"), 1.5], [value("TEC"), 1.25], [value("DRI"), 1.25], [value("MEN"), 0.75]]);
  if (["LW", "RW"].includes(position)) return weightedAverage([[value("DRI"), 2.5], [value("ACC"), 2], [value("CRO"), 1.75], [value("TEC"), 1.5], [value("SHO"), 1], [value("POS"), 0.75]]);
  if (position === "AM") return weightedAverage([[value("PAS"), 2], [value("TEC"), 2], [value("POS"), 1.5], [value("MEN"), 1.25], [value("DRI"), 1.25], [value("SHO"), 1]]);
  if (position === "CM") return weightedAverage([[value("PAS"), 2.2], [value("TEC"), 1.8], [value("POS"), 1.6], [value("MEN"), 1.4], [value("DRI"), 0.8], [value("STA"), 0.8]]);
  if (position === "DM") return weightedAverage([[value("TAC"), 2.2], [value("POS"), 2], [value("PHY"), 1.3], [value("PAS"), 1.2], [value("MEN"), 1.2], [value("STA"), 0.9]]);
  if (position === "WB") return weightedAverage([[value("STA"), 2], [value("ACC"), 1.8], [value("CRO"), 1.7], [value("DRI"), 1.4], [value("TAC"), 1.2], [value("POS"), 1]]);
  if (["LB", "RB"].includes(position)) return weightedAverage([[value("TAC"), 2], [value("POS"), 1.6], [value("ACC"), 1.4], [value("STA"), 1.1], [value("CRO"), 1], [value("PHY"), 1]]);
  if (position === "CB") return weightedAverage([[value("TAC"), 2.5], [value("POS"), 2.2], [value("PHY"), 1.6], [value("HEA"), 1.6], [value("MEN"), 1.1]]);
  return weightedAverage([[value("PAS"), 1], [value("TEC"), 1], [value("MEN"), 1]]);
}

function goalkeeperRating(stats: GoalkeeperStats): number {
  return weightedAverage([[stats.REF, 2.5], [stats.HAN, 2], [stats.MEN, 1.5], [stats.DIS, 1]]);
}

export function calculatePlayerOvr(player: Player): number {
  const stats = player.currentStats;
  const value = isGoalkeeperStats(stats)
    ? goalkeeperRating(stats)
    : outfieldRating(stats, player.primaryPosition);
  return roundTo(value, 1);
}

export function calculatePlayerRealPot(player: Player): number {
  const stats = getRealPotentialStats(player);
  const value = isGoalkeeperStats(stats)
    ? goalkeeperRating(stats)
    : outfieldRating(stats, player.primaryPosition);
  return roundTo(value, 1);
}

export function calculatePlayerPot(player: Player): number {
  const stats = getEffectivePotentialStats(player);
  const value = isGoalkeeperStats(stats)
    ? goalkeeperRating(stats)
    : outfieldRating(stats, player.primaryPosition);
  return roundTo(value, 1);
}

function fixtureForMatch(gameState: GameState, seasonId: string, match: Match): Fixture | undefined {
  return gameState.seasons[seasonId]?.fixtures.find((fixture) => fixture.id === match.fixtureId);
}

export function getPlayerRatingHistory(
  gameState: GameState,
  playerId: string,
  seasonId: string = gameState.currentSeasonId
): PlayerRatingHistoryEntry[] {
  return Object.values(gameState.matches)
    .map((match) => {
      const rating = match.report.playerRatings[playerId];
      const stats = match.report.playerStats[playerId];
      const fixture = fixtureForMatch(gameState, seasonId, match);
      if (!rating || !stats || !fixture || fixture.status !== "played") return undefined;
      return {
        matchId: match.id,
        fixtureId: fixture.id,
        matchday: fixture.matchday,
        rating,
        stats
      };
    })
    .filter((entry): entry is PlayerRatingHistoryEntry => Boolean(entry))
    .sort((a, b) => b.matchday - a.matchday);
}

export function getPlayerPerformanceSummary(
  gameState: GameState,
  playerId: string,
  seasonId: string = gameState.currentSeasonId
): PlayerPerformanceSummary {
  const history = getPlayerRatingHistory(gameState, playerId, seasonId);
  const apps = history.length;
  const goals = history.reduce((sum, entry) => sum + entry.stats.goals, 0);
  const assists = history.reduce((sum, entry) => sum + entry.stats.assists, 0);
  const keyPasses = history.reduce((sum, entry) => sum + entry.stats.keyPasses, 0);
  const formLastFive = history.slice(0, 5).map((entry) => entry.rating.rating);
  const avgRating = apps > 0 ? roundTo(history.reduce((sum, entry) => sum + entry.rating.rating, 0) / apps, 1) : undefined;
  const lastRating = history[0]?.rating.rating;

  return {
    apps,
    goals,
    assists,
    keyPasses,
    formLastFive,
    avgRating,
    lastRating,
    display: {
      avgRating: avgRating === undefined ? "-" : avgRating.toFixed(1),
      lastRating: lastRating === undefined ? "-" : lastRating.toFixed(1),
      form: formLastFive.length === 0 ? "-" : formLastFive.map((rating) => rating.toFixed(1)).join(" ")
    }
  };
}

export function getPlayerSeasonHistory(gameState: GameState, playerId: string): PlayerSeasonSummary[] {
  return Object.values(gameState.seasons)
    .map((season) => ({
      ...getPlayerPerformanceSummary(gameState, playerId, season.id),
      seasonId: season.id,
      seasonNumber: season.seasonNumber
    }))
    .filter((summary) => summary.apps > 0)
    .sort((left, right) => right.seasonNumber - left.seasonNumber);
}

export function keyPlayerStatsSummary(stats: PlayerMatchStats): string {
  if (stats.position === "GK") return `${stats.saves} saves, ${stats.xgFaced.toFixed(1)} xG faced`;

  const parts: string[] = [];
  if (stats.goals > 0) parts.push(`${stats.goals} goal${stats.goals === 1 ? "" : "s"}`);
  if (stats.assists > 0) parts.push(`${stats.assists} assist${stats.assists === 1 ? "" : "s"}`);
  if (stats.chanceInvolvements > 0) parts.push(`${stats.chanceInvolvements} chance involvement${stats.chanceInvolvements === 1 ? "" : "s"}`);
  if (stats.defensiveStops > 0) parts.push(`${stats.defensiveStops} defensive stop${stats.defensiveStops === 1 ? "" : "s"}`);
  if (parts.length === 0 && stats.shots > 0) parts.push(`${stats.goals} goals from ${stats.xg.toFixed(1)} xG`);

  return parts.length > 0 ? parts.join(", ") : "Steady 90 minutes";
}

export type MatchRatingFilter = "all" | "player" | "opponent";
export type MatchRatingSortColumn = "player" | "club" | "position" | "rating";
export type MatchRatingSort = {
  column: MatchRatingSortColumn;
  direction: "asc" | "desc";
};

export function sortMatchRatingRows(rows: MatchRatingRow[], sort: MatchRatingSort = { column: "rating", direction: "desc" }): MatchRatingRow[] {
  const direction = sort.direction === "asc" ? 1 : -1;
  return rows.slice().sort((left, right) => {
    const leftValue = sort.column === "player"
      ? left.playerName
      : sort.column === "club"
        ? left.clubShortName
        : sort.column === "position"
          ? left.position
          : left.rating;
    const rightValue = sort.column === "player"
      ? right.playerName
      : sort.column === "club"
        ? right.clubShortName
        : sort.column === "position"
          ? right.position
          : right.rating;
    const result = typeof leftValue === "number" && typeof rightValue === "number"
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue));
    if (result !== 0) return result * direction;
    return right.rating - left.rating;
  });
}

export function getMatchRatingRows(
  gameState: GameState,
  match: Match,
  playerClubId: string,
  filter: MatchRatingFilter = "all"
): MatchRatingRow[] {
  const opponentClubId = match.homeClubId === playerClubId ? match.awayClubId : match.homeClubId;

  return Object.values(match.report.playerRatings)
    .map((rating): MatchRatingRow | undefined => {
      const stats = match.report.playerStats[rating.playerId];
      const player = gameState.players[rating.playerId];
      if (!stats || !player) return undefined;
      const club = gameState.clubs[stats.clubId];
      const isOwnClub = stats.clubId === playerClubId;
      if (filter === "player" && !isOwnClub) return undefined;
      if (filter === "opponent" && stats.clubId !== opponentClubId) return undefined;

      return {
        playerId: rating.playerId,
        playerName: `${player.firstName} ${player.lastName}`,
        clubId: stats.clubId,
        clubName: club.name,
        clubShortName: club.shortName,
        isOwnClub,
        position: stats.position,
        rating: rating.rating,
        keyStatsSummary: keyPlayerStatsSummary(stats),
        matchContext: {
          matchId: match.id,
          clubName: club.name,
          opponentName: gameState.clubs[isOwnClub ? opponentClubId : playerClubId].name,
          rating,
          stats
        }
      };
    })
    .filter((row): row is MatchRatingRow => Boolean(row));
}
