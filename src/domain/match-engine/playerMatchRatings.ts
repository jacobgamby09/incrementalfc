import { clamp, roundTo } from "../../utils/math";
import type { GameState } from "../types/game";
import type { Match, PlayerMatchRating, PlayerMatchStats } from "../types/match";

function isAttacker(position: PlayerMatchStats["position"]): boolean {
  return ["LW", "RW", "AM", "ST"].includes(position);
}

function isMidfielder(position: PlayerMatchStats["position"]): boolean {
  return ["DM", "CM", "AM"].includes(position);
}

function isDefender(position: PlayerMatchStats["position"]): boolean {
  return ["CB", "LB", "RB", "WB", "DM"].includes(position);
}

function summarize(positives: string[], negatives: string[]): string {
  if (positives.length > 0) return positives[0];
  if (negatives.length > 0) return negatives[0];
  return "Kept a steady baseline performance.";
}

export function calculatePlayerMatchRatings(
  playerStats: Record<string, PlayerMatchStats>,
  match: Match,
  gameState: GameState
): Record<string, PlayerMatchRating> {
  const ratings: Record<string, PlayerMatchRating> = {};

  for (const stats of Object.values(playerStats)) {
    const player = gameState.players[stats.playerId];
    if (!player) continue;

    const positives: string[] = [];
    const negatives: string[] = [];
    let rating = 6;

    if (stats.clubId === match.result.winnerClubId) {
      rating += 0.2;
      positives.push("Helped the team secure the result.");
    }
    const teamGoals =
      stats.clubId === match.homeClubId ? match.result.homeGoals : match.result.awayGoals;
    const opponentGoals =
      stats.clubId === match.homeClubId ? match.result.awayGoals : match.result.homeGoals;
    if (opponentGoals - teamGoals >= 3) {
      rating -= 0.3;
      negatives.push("Part of a heavy defeat.");
    }

    if (isAttacker(stats.position)) {
      rating += stats.goals * 1.1;
      rating += stats.assists * 0.7;
      rating += stats.keyPasses * 0.12;
      rating += stats.chanceInvolvements * 0.08;
      if (stats.goals > 0) positives.push(stats.goals === 1 ? "Scored an important goal." : "Scored multiple goals.");
      if (stats.assists > 0) positives.push("Set up a teammate for a goal.");
      if (stats.chanceInvolvements >= 3) positives.push("Created multiple dangerous moments.");
      if (stats.xg >= 0.6 && stats.goals === 0) {
        rating -= Math.min(1.1, stats.xg * 0.55);
        negatives.push("Struggled to convert good chances.");
      }
      if (stats.goals > stats.xg + 0.25) {
        rating += 0.35;
        positives.push("Finished above the chance quality.");
      }
    }

    if (isMidfielder(stats.position)) {
      rating += Math.min(0.45, stats.eventsWon * 0.03);
      rating += stats.keyPasses * 0.14;
      rating += stats.defensiveActions * 0.08;
      if (stats.eventsWon >= 4) positives.push("Helped control midfield phases.");
      if (stats.keyPasses >= 2) positives.push("Found teammates in dangerous areas.");
    }

    if (isDefender(stats.position)) {
      rating += stats.defensiveStops * 0.35;
      rating += stats.defensiveActions * 0.12;
      rating += stats.duelsWon * 0.08;
      rating -= stats.goalsConceded * 0.12;
      if (stats.defensiveStops > 0) positives.push("Protected the box well.");
      if (stats.goalsConceded >= 2) negatives.push("Could not fully limit the opponent's scoring.");
    }

    if (stats.position === "GK") {
      const goalsPrevented = stats.xgFaced - stats.goalsConceded;
      rating += stats.saves * 0.35;
      rating += Math.max(0, goalsPrevented) * 0.75;
      rating -= Math.max(0, -goalsPrevented) * 0.45;
      rating -= stats.reboundsAllowed * 0.2;
      if (stats.saves >= 3 || goalsPrevented >= 0.5) {
        positives.push("Faced heavy pressure and made important saves.");
      } else if (stats.saves > 0) {
        positives.push("Made saves when called upon.");
      }
      if (goalsPrevented <= -0.5) negatives.push("Conceded more than the chance quality suggested.");
      if (stats.reboundsAllowed > 0) negatives.push("Allowed rebounds under pressure.");
    }

    if (stats.errors > 0) {
      rating -= stats.errors * 0.45;
      negatives.push("Made a costly mistake.");
    }
    if (stats.errorsLeadingToGoal > 0) {
      rating -= stats.errorsLeadingToGoal * 0.9;
      negatives.push("An error led directly to a goal.");
    }

    ratings[stats.playerId] = {
      playerId: stats.playerId,
      rating: roundTo(clamp(rating, 3, 10), 1),
      summary: summarize(positives, negatives),
      positives,
      negatives
    };
  }

  return ratings;
}

export function getTopPlayerRatings(
  ratings: Record<string, PlayerMatchRating>,
  limit = 3
): PlayerMatchRating[] {
  return Object.values(ratings)
    .slice()
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}
