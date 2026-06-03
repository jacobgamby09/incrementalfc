import type { GameState } from "../types/game";
import type { DevelopmentRewardSummary, Match } from "../types/match";
import type { Player } from "../types/player";
import { getPlayerCapStatus, getPlayerDevelopmentSummary } from "./playerDevelopment";

export type DevelopmentXpGainer = {
  playerId: string;
  playerName: string;
  matchXp: number;
  trainingXp: number;
  totalXp: number;
  progressPercent: number;
  reasonText: string;
  statIncreaseBadges: string[];
};

export type MatchDevelopmentSummary = {
  totalMatchXp: number;
  totalTrainingXp: number;
  tacticalFamiliarityGained: number;
  bankedProgressLabel: string;
  topXpGainers: DevelopmentXpGainer[];
  bankedProgressPlayers: DevelopmentXpGainer[];
  improvedPlayers: DevelopmentRewardSummary[];
  capSummaries: string[];
  capWarningExamples: Array<{
    playerId: string;
    playerName: string;
    status: "Facility limited" | "Potential reached";
  }>;
  capWarnings: Array<{
    playerId: string;
    playerName: string;
    status: "Facility limited" | "Potential reached";
  }>;
  noGrowthMessage?: string;
};

function playerName(player: Player): string {
  return `${player.firstName} ${player.lastName}`;
}

function xpReasonText(player: Player, matchReward: Match["rewards"]["playerXp"][string] | undefined, trainingXp: number): string {
  const reasons: string[] = [];
  if ((matchReward?.matchXp ?? 0) > 0) reasons.push(matchReward?.reason.includes("90 minutes") ? "90 mins" : "squad credit");
  if (matchReward?.rating !== undefined) reasons.push(`${matchReward.rating.toFixed(1)} rating`);
  if (player.development.ageCurveStage === "youth") reasons.push("youth bonus");
  if (player.development.ageCurveStage === "developing") reasons.push("development curve");
  if (matchReward?.reason.includes("opponent difficulty")) reasons.push("opponent difficulty");
  if (trainingXp > 0) reasons.push("training XP");
  return reasons.join(", ") || "Development XP";
}

function capPriority(status: "Facility limited" | "Potential reached"): number {
  if (status === "Facility limited") return 0;
  return 1;
}

function capSummaryText(status: "Facility limited" | "Potential reached", count: number): string {
  if (status === "Facility limited") {
    return `${count} ${count === 1 ? "player is" : "players are"} limited by the current Training Ground.`;
  }
  return `${count} ${count === 1 ? "player has" : "players have"} reached personal potential for role-relevant stats.`;
}

export function getMatchDevelopmentSummary(gameState: GameState, match: Match): MatchDevelopmentSummary {
  const playerClub = gameState.clubs[gameState.playerClubId];
  const trainingXp = match.rewards.trainingXp ?? {};
  const statGrowth = match.rewards.statGrowth ?? [];
  const totalMatchXp = Object.values(match.rewards.playerXp).reduce((sum, reward) => sum + reward.matchXp, 0);
  const totalTrainingXp = Object.values(trainingXp).reduce((sum, xp) => sum + xp, 0);
  const tacticalFamiliarityGained = Object.values(match.rewards.tacticalFamiliarity).reduce((sum, gain) => sum + gain, 0);
  const statGrowthByPlayerId = statGrowth.reduce<Record<string, string[]>>((map, summary) => {
    map[summary.playerId] = summary.statGrowth.map((growth) => {
      const delta = growth.to - growth.from;
      return `${delta > 0 ? "+" : ""}${delta} ${growth.statKey}`;
    });
    return map;
  }, {});
  const xpGainers = playerClub.squadPlayerIds
    .map((playerId) => {
      const player = gameState.players[playerId];
      if (!player) return undefined;
      const matchXp = match.rewards.playerXp[playerId]?.matchXp ?? 0;
      const matchReward = match.rewards.playerXp[playerId];
      const playerTrainingXp = trainingXp[playerId] ?? 0;
      const totalXp = matchXp + playerTrainingXp;
      const progressPercent = getPlayerDevelopmentSummary(player, playerClub).nextProgressPercent;
      const developmentPointsGained = player.development.lastDevelopmentPointsGained ?? 0;
      return {
        playerId,
        playerName: playerName(player),
        matchXp,
        trainingXp: playerTrainingXp,
        totalXp,
        progressPercent,
        reasonText: xpReasonText(player, matchReward, playerTrainingXp),
        statIncreaseBadges: [
          ...(developmentPointsGained > 0 ? [`+${developmentPointsGained} Development Point${developmentPointsGained === 1 ? "" : "s"}`] : []),
          ...(statGrowthByPlayerId[playerId] ?? [])
        ]
      };
    })
    .filter((entry): entry is DevelopmentXpGainer => Boolean(entry));
  const topXpGainers = xpGainers.slice().sort((a, b) => b.totalXp - a.totalXp).slice(0, 5);
  const improvedPlayers = statGrowth.filter((summary) => summary.statGrowth.length > 0);
  const improvedPlayerIds = new Set(improvedPlayers.map((summary) => summary.playerId));
  const bankedProgressPlayers = xpGainers
    .filter((entry) => entry.totalXp > 0 && !improvedPlayerIds.has(entry.playerId))
    .sort((a, b) => b.totalXp - a.totalXp)
    .slice(0, 5);
  const capWarnings = playerClub.squadPlayerIds
    .map((playerId) => {
      const player = gameState.players[playerId];
      if (!player) return undefined;
      const status = getPlayerCapStatus(player, playerClub);
      if (status === "Developing" || status === "Declining") return undefined;
      return { playerId, playerName: playerName(player), status };
    })
    .filter((entry): entry is MatchDevelopmentSummary["capWarnings"][number] => Boolean(entry))
    .sort((a, b) => capPriority(a.status) - capPriority(b.status));
  const capCounts = capWarnings.reduce<Record<"Facility limited" | "Potential reached", number>>((counts, warning) => {
    counts[warning.status] += 1;
    return counts;
  }, {
    "Facility limited": 0,
    "Potential reached": 0
  });
  const capSummaries = (Object.entries(capCounts) as Array<[keyof typeof capCounts, number]>)
    .filter(([, count]) => count > 0)
    .sort(([left], [right]) => capPriority(left) - capPriority(right))
    .map(([status, count]) => capSummaryText(status, count));
  const capWarningExamples = capWarnings.slice(0, 4);

  return {
    totalMatchXp,
    totalTrainingXp,
    tacticalFamiliarityGained,
    bankedProgressLabel: "Progress Banked Toward Next Development Point",
    topXpGainers,
    bankedProgressPlayers,
    improvedPlayers,
    capSummaries,
    capWarningExamples,
    capWarnings,
    noGrowthMessage: improvedPlayers.length === 0
      ? "Progress was banked. Assign earned development points from Training, Squad, or the player sheet."
      : undefined
  };
}
