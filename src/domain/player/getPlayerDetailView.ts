import {
  isGoalkeeperStats,
  type GoalkeeperStatKey,
  type OutfieldStatKey,
  type Player,
  type PlayerPosition
} from "../types/player";
import { calculatePositionFit, type PositionFit } from "../lineup/positionFit";
import type { GameState } from "../types/game";
import {
  calculatePlayerOvr,
  calculatePlayerPot,
  getPlayerPerformanceSummary,
  type PlayerMatchContext,
  type PlayerPerformanceSummary
} from "./playerSummaries";
import { getPlayerDevelopmentSummary, type DevelopmentSummary } from "../development/playerDevelopment";

export type PlayerStatDetail = {
  key: OutfieldStatKey | GoalkeeperStatKey;
  current: number;
  potential: number;
};

export type PlayerDetailView = {
  id: string;
  name: string;
  age: number;
  primaryPosition: PlayerPosition;
  secondaryPositions: PlayerPosition[];
  ovr: number;
  estimatedPot: number;
  performance?: PlayerPerformanceSummary;
  matchContext?: PlayerMatchContext;
  developmentSummary?: DevelopmentSummary;
  wagePerWeek: number;
  marketValue: number;
  currentStats: PlayerStatDetail[];
  potentialStats: PlayerStatDetail[];
  selectedPositionFit?: PositionFit;
};

export type GetPlayerDetailViewOptions = {
  selectedSlotPosition?: PlayerPosition;
  gameState?: GameState;
  seasonId?: string;
  matchContext?: PlayerMatchContext;
};

export function getPlayerDetailView(player: Player, options: GetPlayerDetailViewOptions = {}): PlayerDetailView {
  const statKeys = Object.keys(player.currentStats) as Array<OutfieldStatKey | GoalkeeperStatKey>;
  const potentialStats = player.potentialStats;
  const isGoalkeeper = isGoalkeeperStats(potentialStats);
  const statDetails = statKeys.map((key) => ({
    key,
    current: player.currentStats[key as keyof typeof player.currentStats],
    potential: isGoalkeeper
      ? potentialStats[key as keyof typeof potentialStats]
      : potentialStats[key as keyof typeof potentialStats]
  }));

  return {
    id: player.id,
    name: `${player.firstName} ${player.lastName}`,
    age: player.age,
    primaryPosition: player.primaryPosition,
    secondaryPositions: player.secondaryPositions,
    ovr: calculatePlayerOvr(player),
    estimatedPot: calculatePlayerPot(player),
    performance: options.gameState
      ? getPlayerPerformanceSummary(options.gameState, player.id, options.seasonId)
      : undefined,
    developmentSummary: options.gameState && player.clubId
      ? getPlayerDevelopmentSummary(player, options.gameState.clubs[player.clubId])
      : undefined,
    matchContext: options.matchContext,
    wagePerWeek: player.contract.wagePerWeek,
    marketValue: player.contract.marketValue,
    currentStats: statDetails,
    potentialStats: statDetails,
    selectedPositionFit: options.selectedSlotPosition
      ? calculatePositionFit(player, options.selectedSlotPosition)
      : undefined
  };
}
