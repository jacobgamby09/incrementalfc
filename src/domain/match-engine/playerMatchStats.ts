import { roundTo } from "../../utils/math";
import type { GameState } from "../types/game";
import type { Match, PlayerMatchStats } from "../types/match";
import type { Lineup } from "../types/tactics";

function emptyPlayerStats(playerId: string, clubId: string, position: PlayerMatchStats["position"]): PlayerMatchStats {
  return {
    playerId,
    clubId,
    position,
    minutes: 90,
    goals: 0,
    assists: 0,
    shots: 0,
    shotsOnTarget: 0,
    xg: 0,
    keyPasses: 0,
    chanceInvolvements: 0,
    eventsWon: 0,
    duelsWon: 0,
    duelsLost: 0,
    defensiveActions: 0,
    defensiveStops: 0,
    errors: 0,
    errorsLeadingToGoal: 0,
    saves: 0,
    xgFaced: 0,
    goalsConceded: 0,
    reboundsAllowed: 0
  };
}

function addLineupStats(
  statsByPlayerId: Record<string, PlayerMatchStats>,
  lineup: Lineup,
  clubId: string
): void {
  for (const slot of lineup.starters) {
    if (!slot.playerId) continue;
    statsByPlayerId[slot.playerId] = emptyPlayerStats(slot.playerId, clubId, slot.position);
  }
}

function defensiveStarterIds(statsByPlayerId: Record<string, PlayerMatchStats>, clubId: string): string[] {
  return Object.values(statsByPlayerId)
    .filter((stats) => stats.clubId === clubId && ["GK", "CB", "LB", "RB", "WB", "DM"].includes(stats.position))
    .map((stats) => stats.playerId);
}

function goalkeeperId(statsByPlayerId: Record<string, PlayerMatchStats>, clubId: string): string | undefined {
  return Object.values(statsByPlayerId).find((stats) => stats.clubId === clubId && stats.position === "GK")?.playerId;
}

export function aggregatePlayerMatchStats(match: Match, gameState: GameState): Record<string, PlayerMatchStats> {
  const statsByPlayerId: Record<string, PlayerMatchStats> = {};
  addLineupStats(statsByPlayerId, match.homeLineup, match.homeClubId);
  addLineupStats(statsByPlayerId, match.awayLineup, match.awayClubId);

  const homeDefensiveIds = defensiveStarterIds(statsByPlayerId, match.homeClubId);
  const awayDefensiveIds = defensiveStarterIds(statsByPlayerId, match.awayClubId);
  const homeGoalkeeperId = goalkeeperId(statsByPlayerId, match.homeClubId);
  const awayGoalkeeperId = goalkeeperId(statsByPlayerId, match.awayClubId);

  for (const event of match.events) {
    const primary = event.playerId ? statsByPlayerId[event.playerId] : undefined;
    const secondary = event.secondaryPlayerId ? statsByPlayerId[event.secondaryPlayerId] : undefined;
    const xg = event.xg ?? 0;

    if (event.type === "event_control" && primary) {
      primary.eventsWon += 1;
    }

    if (event.type === "chance") {
      if (primary) {
        primary.keyPasses += 1;
        primary.chanceInvolvements += 1;
      }
      if (secondary) {
        secondary.chanceInvolvements += 1;
      }
    }

    if (event.type === "shot") {
      if (primary) {
        primary.shots += 1;
        primary.xg = roundTo(primary.xg + xg, 2);
        if (event.outcome === "scored" || event.outcome === "saved") {
          primary.shotsOnTarget += 1;
        }
      }
    }

    if (event.type === "goal") {
      if (primary) {
        primary.goals += 1;
      }
      if (secondary) {
        secondary.assists += 1;
      }
      if (event.clubId === match.homeClubId && awayGoalkeeperId) {
        statsByPlayerId[awayGoalkeeperId].xgFaced = roundTo(statsByPlayerId[awayGoalkeeperId].xgFaced + xg, 2);
      }
      if (event.clubId === match.awayClubId && homeGoalkeeperId) {
        statsByPlayerId[homeGoalkeeperId].xgFaced = roundTo(statsByPlayerId[homeGoalkeeperId].xgFaced + xg, 2);
      }
      const defendingIds = event.clubId === match.homeClubId ? awayDefensiveIds : homeDefensiveIds;
      for (const playerId of defendingIds) {
        statsByPlayerId[playerId].goalsConceded += 1;
      }
    }

    if (event.type === "save" && primary) {
      primary.saves += 1;
      primary.xgFaced = roundTo(primary.xgFaced + xg, 2);
    }

    if (event.type === "defensive_stop" && primary) {
      primary.defensiveStops += 1;
      primary.defensiveActions += 1;
      primary.duelsWon += 1;
    }

    if (event.type === "error" && primary) {
      primary.errors += 1;
      if (event.outcome === "error_led_to_goal") {
        primary.errorsLeadingToGoal += 1;
      }
    }

    if (event.type === "rebound") {
      if (primary) {
        primary.chanceInvolvements += 1;
      }
      const defendingGoalkeeper = event.clubId === match.homeClubId ? awayGoalkeeperId : homeGoalkeeperId;
      if (defendingGoalkeeper) {
        statsByPlayerId[defendingGoalkeeper].reboundsAllowed += 1;
      }
    }
  }

  for (const stats of Object.values(statsByPlayerId)) {
    const player = gameState.players[stats.playerId];
    if (!player) continue;
    stats.xg = roundTo(stats.xg, 2);
    stats.xgFaced = roundTo(stats.xgFaced, 2);
  }

  return statsByPlayerId;
}
