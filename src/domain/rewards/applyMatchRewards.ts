import type { GameState } from "../types/game";
import type { Match } from "../types/match";
import { applyMatchXpToPlayers } from "../development/playerDevelopment";

export function applyMatchRewards(gameState: GameState, clubId: string, match: Match): GameState {
  const club = gameState.clubs[clubId];
  const nextPlayers = applyMatchXpToPlayers(gameState, club, match);

  return {
    ...gameState,
    players: nextPlayers,
    clubs: {
      ...gameState.clubs,
      [clubId]: {
        ...club,
        reputation: Number((club.reputation + match.rewards.reputation).toFixed(2)),
        fans: club.fans + match.rewards.fans,
        tactics: {
          ...club.tactics,
          familiarityByTacticId: Object.entries(match.rewards.tacticalFamiliarity).reduce(
            (nextFamiliarity, [tacticId, gain]) => ({
              ...nextFamiliarity,
              [tacticId]: Math.min((nextFamiliarity[tacticId] ?? 0) + gain, 100)
            }),
            { ...club.tactics.familiarityByTacticId }
          )
        }
      }
    }
  };
}
