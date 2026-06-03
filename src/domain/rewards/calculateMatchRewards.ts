import type { Club } from "../types/club";
import type { Match, MatchRewards, PlayerXpReward } from "../types/match";
import type { Lineup, Tactic } from "../types/tactics";
import type { GameState } from "../types/game";
import { createMatchXpRewards } from "../development/playerDevelopment";
import { getTacticKey } from "../tactics/tacticFamiliarity";
import { economyProfile } from "../../data/constants/economyProfiles";

type CalculateMatchRewardsOptions = {
  club: Club;
  opponentClub: Club;
  lineup: Lineup;
  tactic: Tactic;
  goalsFor: number;
  goalsAgainst: number;
  isHome: boolean;
  match?: Match;
  gameState?: GameState;
};

function resultMultiplier(goalsFor: number, goalsAgainst: number): number {
  if (goalsFor > goalsAgainst) return 1.4;
  if (goalsFor === goalsAgainst) return 1.1;
  return 0.85;
}

export function calculateMatchRewards({
  club,
  opponentClub,
  lineup,
  tactic,
  goalsFor,
  goalsAgainst,
  isHome,
  match,
  gameState
}: CalculateMatchRewardsOptions): MatchRewards {
  const multiplier = resultMultiplier(goalsFor, goalsAgainst);
  const reputationGapBonus = Math.max(opponentClub.reputation - club.reputation, 0) * 20;
  const baseResultBonus = goalsFor > goalsAgainst
    ? economyProfile.resultBonuses.win
    : goalsFor === goalsAgainst
      ? economyProfile.resultBonuses.draw
      : economyProfile.resultBonuses.loss;
  const money = Math.round(baseResultBonus + reputationGapBonus * multiplier);
  const fans = Math.max(5, Math.round((goalsFor > goalsAgainst ? 45 : goalsFor === goalsAgainst ? 18 : 8) * multiplier));
  const reputation = Number((goalsFor > goalsAgainst ? 0.18 : goalsFor === goalsAgainst ? 0.06 : 0.02).toFixed(2));
  const playerXp: Record<string, PlayerXpReward> =
    match && gameState
      ? createMatchXpRewards(match, gameState, club, opponentClub)
      : Object.fromEntries(
          lineup.starters.map((slot) => [
            slot.playerId,
            {
              matchXp: 0,
              reason: "Match XP is calculated after player ratings are available."
            }
          ])
        );

  return {
    money,
    fans,
    reputation,
    playerXp,
    tacticalFamiliarity: {
      [getTacticKey(tactic)]: goalsFor >= goalsAgainst ? 3 : 2
    },
    trainingXp: {},
    statGrowth: []
  };
}
