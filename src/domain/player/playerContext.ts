import { playerContextProfile } from "../../data/constants/playerContextProfiles";
import { clamp } from "../../utils/math";
import type { GameState } from "../types/game";
import type { Match } from "../types/match";
import type { Player, SquadRole } from "../types/player";

export type MoraleBand = "thriving" | "happy" | "content" | "frustrated" | "disengaged";

export const squadRoleLabels: Record<SquadRole, string> = {
  key_player: "Key Player",
  regular_starter: "Regular Starter",
  rotation: "Rotation",
  backup: "Backup",
  prospect: "Prospect"
};

export const moraleBandLabels: Record<MoraleBand, string> = {
  thriving: "Thriving",
  happy: "Happy",
  content: "Content",
  frustrated: "Frustrated",
  disengaged: "Disengaged"
};

export function getMoraleBand(morale: number): MoraleBand {
  if (morale >= 80) return "thriving";
  if (morale >= 65) return "happy";
  if (morale >= 45) return "content";
  if (morale >= 25) return "frustrated";
  return "disengaged";
}

export function calculateInitialMarketReputation(currentAbility: number, potential: number, age: number): number {
  const profile = playerContextProfile.marketReputation;
  const ageBonus = age >= 23 && age <= 29 ? profile.agePeakBonus : 0;
  return Math.round(clamp(
    currentAbility * profile.currentAbilityWeight + potential * profile.potentialWeight + ageBonus,
    1,
    100
  ));
}

export function assignSquadRoles(players: Player[]): Player[] {
  const ranked = players
    .slice()
    .sort((left, right) => right.marketReputation - left.marketReputation);
  const roleByPlayerId = new Map<string, SquadRole>();

  ranked.forEach((player, index) => {
    let role: SquadRole;
    if (index < 2) role = "key_player";
    else if (index < 9) role = "regular_starter";
    else if (player.age <= 20) role = "prospect";
    else if (index < 14) role = "rotation";
    else role = "backup";
    roleByPlayerId.set(player.id, role);
  });

  return players.map((player) => ({
    ...player,
    squadRole: roleByPlayerId.get(player.id) ?? "rotation"
  }));
}

function resultDelta(match: Match, clubId: string): number {
  const goalsFor = clubId === match.homeClubId ? match.result.homeGoals : match.result.awayGoals;
  const goalsAgainst = clubId === match.homeClubId ? match.result.awayGoals : match.result.homeGoals;
  if (goalsFor > goalsAgainst) return playerContextProfile.morale.resultDelta.win;
  if (goalsFor < goalsAgainst) return playerContextProfile.morale.resultDelta.loss;
  return playerContextProfile.morale.resultDelta.draw;
}

export function applyMatchdayPlayerContextUpdates(gameState: GameState, matchesPlayed: Match[]): GameState {
  const nextPlayers = { ...gameState.players };

  for (const match of matchesPlayed) {
    const starterIds = new Set([
      ...match.homeLineup.starters.map((slot) => slot.playerId),
      ...match.awayLineup.starters.map((slot) => slot.playerId)
    ].filter((playerId): playerId is string => Boolean(playerId)));

    for (const clubId of [match.homeClubId, match.awayClubId]) {
      const club = gameState.clubs[clubId];
      if (!club) continue;
      const teamResultDelta = resultDelta(match, clubId);

      for (const playerId of club.squadPlayerIds) {
        const player = nextPlayers[playerId];
        if (!player) continue;
        const roleDelta = playerContextProfile.morale.rolePlayingTimeDelta[player.squadRole][
          starterIds.has(playerId) ? "started" : "omitted"
        ];
        const contractDelta = player.contract.seasonsRemaining <= 1
          ? playerContextProfile.morale.expiringContractDelta
          : 0;

        nextPlayers[playerId] = {
          ...player,
          status: {
            ...player.status,
            morale: Math.round(clamp(player.status.morale + teamResultDelta + roleDelta + contractDelta, 0, 100))
          }
        };
      }
    }

    for (const rating of Object.values(match.report.playerRatings)) {
      const player = nextPlayers[rating.playerId];
      const stats = match.report.playerStats[rating.playerId];
      if (!player || !stats) continue;
      const profile = playerContextProfile.marketReputation;
      const performanceDelta =
        (rating.rating >= profile.strongRatingThreshold ? profile.strongRatingDelta : 0) +
        (rating.rating <= profile.weakRatingThreshold ? profile.weakRatingDelta : 0) +
        stats.goals * profile.goalDelta +
        stats.assists * profile.assistDelta;

      nextPlayers[player.id] = {
        ...player,
        marketReputation: Math.round(clamp(
          player.marketReputation + Math.min(profile.maxMatchdayDelta, performanceDelta),
          1,
          100
        ))
      };
    }
  }

  return {
    ...gameState,
    players: nextPlayers
  };
}
