import { calculatePlayerOvr, calculatePlayerPot, getPlayerPerformanceSummary } from "./playerSummaries";
import { getPlayerCapStatus } from "../development/playerDevelopment";
import type { GameState } from "../types/game";
import type { Player, PlayerPosition } from "../types/player";
import { isGoalkeeperStats } from "../types/player";
import { getStatDefinition } from "./statDefinitions";

export type SortDirection = "asc" | "desc";
export type SquadAgeFilter = "all" | "youth" | "developing" | "prime" | "veteran";

export type SquadFilters = {
  position: "all" | PlayerPosition;
  capStatus: "all" | ReturnType<typeof getPlayerCapStatus>;
  ageGroup: SquadAgeFilter;
};

export type SquadSort = {
  column: string;
  direction: SortDirection;
};

export type MissingStatValue = "-";
export type SquadTableCellSortValue = string | number | MissingStatValue;

const positionOrder: PlayerPosition[] = ["GK", "CB", "LB", "RB", "WB", "DM", "CM", "AM", "LW", "RW", "ST"];

function playerName(player: Player): string {
  return `${player.lastName}, ${player.firstName}`;
}

export function getAgeGroup(player: Player): Exclude<SquadAgeFilter, "all"> {
  if (player.age <= 20) return "youth";
  if (player.age <= 24) return "developing";
  if (player.age <= 30) return "prime";
  return "veteran";
}

export function getSquadStatValue(player: Player, column: string): number | MissingStatValue {
  const stats = player.currentStats;
  const isGoalkeeper = isGoalkeeperStats(stats);
  if (!getStatDefinition(column)) return "-";
  if (isGoalkeeper) {
    if (column === "REF" || column === "HAN" || column === "DIS" || column === "TEC" || column === "PHY" || column === "MEN") {
      return Number(stats[column as keyof typeof stats]);
    }
    return "-";
  }

  if (column === "REF" || column === "HAN" || column === "DIS") return "-";
  return Number(stats[column as keyof typeof stats]);
}

export function squadSortValue(player: Player, column: string, gameState?: GameState): SquadTableCellSortValue {
  const performance = gameState ? getPlayerPerformanceSummary(gameState, player.id) : undefined;
  const club = gameState && player.clubId ? gameState.clubs[player.clubId] : undefined;

  if (column === "Player") return playerName(player);
  if (column === "Age") return player.age;
  if (column === "Position") return positionOrder.indexOf(player.primaryPosition);
  if (column === "OVR") return calculatePlayerOvr(player);
  if (column === "Est. POT") return calculatePlayerPot(player);
  if (column === "Form") return performance?.lastRating ?? -1;
  if (column === "Avg Rating") return performance?.avgRating ?? -1;
  if (column === "Last Rating") return performance?.lastRating ?? -1;
  if (column === "Wage") return player.contract.wagePerWeek;
  if (column === "Value") return player.contract.marketValue;
  if (column === "Match XP") return player.development.matchXp;
  if (column === "Training XP") return player.development.trainingXp;
  if (column === "Last XP") return player.development.lastMatchXpGained + player.development.lastTrainingXpGained;
  if (column === "Cap Status") return club ? getPlayerCapStatus(player, club) : "Developing";
  if (column === "Apps") return performance?.apps ?? 0;
  if (column === "Goals") return performance?.goals ?? 0;
  if (column === "Assists/Key Passes") return (performance?.assists ?? 0) + (performance?.keyPasses ?? 0);
  if (column === "Contract Remaining") return player.contract.weeksRemaining;
  if (getStatDefinition(column)) return getSquadStatValue(player, column);
  return String(player.primaryPosition);
}

export function filterSquadPlayers(players: Player[], gameState: GameState | undefined, filters: SquadFilters): Player[] {
  return players.filter((player) => {
    if (filters.position !== "all" && player.primaryPosition !== filters.position) return false;
    if (filters.ageGroup !== "all" && getAgeGroup(player) !== filters.ageGroup) return false;
    if (filters.capStatus !== "all") {
      const club = gameState && player.clubId ? gameState.clubs[player.clubId] : undefined;
      if (!club || getPlayerCapStatus(player, club) !== filters.capStatus) return false;
    }
    return true;
  });
}

export function sortSquadPlayers(players: Player[], sort: SquadSort, gameState?: GameState): Player[] {
  const direction = sort.direction === "asc" ? 1 : -1;
  return players.slice().sort((left, right) => {
    const leftValue = squadSortValue(left, sort.column, gameState);
    const rightValue = squadSortValue(right, sort.column, gameState);
    if (leftValue === "-" && rightValue !== "-") return 1;
    if (rightValue === "-" && leftValue !== "-") return -1;
    const result = typeof leftValue === "number" && typeof rightValue === "number"
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue));
    if (result !== 0) return result * direction;
    return playerName(left).localeCompare(playerName(right));
  });
}
