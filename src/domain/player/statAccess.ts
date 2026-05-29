import { isGoalkeeperStats, type OutfieldStatKey, type OutfieldStats, type Player } from "../types/player";

export function getOutfieldStatValue(stats: Partial<OutfieldStats>, key: OutfieldStatKey): number {
  const value = stats[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (key === "STA") return averageFallback([stats.PHY, stats.MEN]);
  if (key === "DRI") return averageFallback([stats.TEC, stats.ACC]);
  if (key === "POS") return averageFallback([stats.MEN, stats.TAC]);

  return 1;
}

export function getPlayerOutfieldStatValue(player: Player, key: OutfieldStatKey): number {
  if (isGoalkeeperStats(player.currentStats)) return 1;
  return getOutfieldStatValue(player.currentStats, key);
}

function averageFallback(values: Array<number | undefined>): number {
  const validValues = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (validValues.length === 0) return 1;
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}
