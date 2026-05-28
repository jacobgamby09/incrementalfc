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
  if (position === "ST") return weightedAverage([[stats.SHO, 3], [stats.ACC, 1.5], [stats.TEC, 1.5], [stats.MEN, 1], [stats.HEA, 1]]);
  if (["LW", "RW", "AM"].includes(position)) return weightedAverage([[stats.TEC, 2], [stats.ACC, 1.5], [stats.SHO, 1.5], [stats.PAS, 1], [stats.CRO, 1], [stats.MEN, 1]]);
  if (["CM", "DM"].includes(position)) return weightedAverage([[stats.PAS, 2], [stats.TEC, 2], [stats.MEN, 1.5], [stats.PHY, 1], [stats.TAC, position === "DM" ? 1.5 : 1]]);
  if (["CB", "LB", "RB", "WB"].includes(position)) return weightedAverage([[stats.TAC, 2.5], [stats.PHY, 1.5], [stats.HEA, 1.5], [stats.MEN, 1.5], [stats.ACC, ["LB", "RB", "WB"].includes(position) ? 1 : 0.4]]);
  return weightedAverage([[stats.PAS, 1], [stats.TEC, 1], [stats.MEN, 1]]);
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

export function calculatePlayerPot(player: Player): number {
  const stats = player.potentialStats;
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
    .filter((row): row is MatchRatingRow => Boolean(row))
    .sort((a, b) => b.rating - a.rating);
}
