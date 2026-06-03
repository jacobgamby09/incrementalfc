import { roundTo } from "../../utils/math";
import type { Match, MatchEvent } from "../types/match";

export type LiveTeamStats = {
  shots: number;
  shotsOnTarget: number;
  xg: number;
  saves: number;
  defensiveStops: number;
  possession: number;
};

export type LiveMatchStats = {
  home: LiveTeamStats;
  away: LiveTeamStats;
};

export function createVisibleMatchStats(
  match: Match,
  visibleEvents: MatchEvent[]
): LiveMatchStats {
  const homeId = match.homeClubId;
  const awayId = match.awayClubId;

  // 1. Initialize stats structures
  const homeStats: LiveTeamStats = {
    shots: 0,
    shotsOnTarget: 0,
    xg: 0,
    saves: 0,
    defensiveStops: 0,
    possession: 50
  };

  const awayStats: LiveTeamStats = {
    shots: 0,
    shotsOnTarget: 0,
    xg: 0,
    saves: 0,
    defensiveStops: 0,
    possession: 50
  };

  let homeControlCount = 0;
  let awayControlCount = 0;

  // 2. Iterate through visible events and accumulate
  for (const event of visibleEvents) {
    const isHome = event.clubId === homeId;
    const isAway = event.clubId === awayId;
    const xg = event.xg ?? 0;

    if (event.type === "event_control") {
      if (isHome) homeControlCount += 1;
      if (isAway) awayControlCount += 1;
    }

    if (event.type === "shot") {
      if (isHome) {
        homeStats.shots += 1;
        homeStats.xg = roundTo(homeStats.xg + xg, 2);
        if (event.outcome === "scored" || event.outcome === "saved") {
          homeStats.shotsOnTarget += 1;
        }
      } else if (isAway) {
        awayStats.shots += 1;
        awayStats.xg = roundTo(awayStats.xg + xg, 2);
        if (event.outcome === "scored" || event.outcome === "saved") {
          awayStats.shotsOnTarget += 1;
        }
      }
    }

    if (event.type === "save") {
      if (isHome) {
        homeStats.saves += 1;
      } else if (isAway) {
        awayStats.saves += 1;
      }
    }

    if (event.type === "defensive_stop") {
      if (isHome) {
        homeStats.defensiveStops += 1;
      } else if (isAway) {
        awayStats.defensiveStops += 1;
      }
    }
  }

  // 3. Calculate possession proxy with smoothing (+5)
  const homeWeight = homeControlCount + 5;
  const awayWeight = awayControlCount + 5;
  const homePossession = Math.round((homeWeight / (homeWeight + awayWeight)) * 100);
  const awayPossession = 100 - homePossession;

  homeStats.possession = homePossession;
  awayStats.possession = awayPossession;

  // Make sure we keep xg precision rounded
  homeStats.xg = roundTo(homeStats.xg, 2);
  awayStats.xg = roundTo(awayStats.xg, 2);

  return {
    home: homeStats,
    away: awayStats
  };
}
