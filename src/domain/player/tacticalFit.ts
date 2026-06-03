import { tacticalFocuses } from "../../data/constants/formations";
import type { Player, PlayerPosition, OutfieldStatKey, GoalkeeperStatKey } from "../types/player";
import { isGoalkeeperStats } from "../types/player";
import type { Lineup, TacticalFocus } from "../types/tactics";
import { getOutfieldStatValue } from "./statAccess";

type WeightedStats<T extends string> = Partial<Record<T, number>>;

export type TacticalFit = {
  focus: TacticalFocus;
  label: string;
  score: number;
  primaryStats: string[];
};

const focusLabels: Record<TacticalFocus, string> = {
  balanced: "Balanced",
  wide_play: "Wide Play",
  fast_breaks: "Fast Breaks",
  sustained_pressure: "Sustained Pressure",
  defensive_shape: "Defensive Shape",
  control: "Control",
  tiki_taka: "Tiki-taka"
};

const outfieldFocusWeights: Record<TacticalFocus, WeightedStats<OutfieldStatKey>> = {
  balanced: { PAS: 1, TAC: 1, POS: 1, MEN: 1, TEC: 0.8, STA: 0.6 },
  wide_play: { CRO: 1.4, DRI: 1.1, ACC: 1, HEA: 0.8, STA: 0.5, POS: 0.5 },
  fast_breaks: { ACC: 1.4, DRI: 1.1, SHO: 1, POS: 0.8, TEC: 0.7, MEN: 0.5 },
  sustained_pressure: { PAS: 1.2, TEC: 1, POS: 1, STA: 0.9, MEN: 0.8, SHO: 0.6 },
  defensive_shape: { POS: 1.3, TAC: 1.2, MEN: 1, PHY: 0.9, HEA: 0.8, STA: 0.6 },
  control: { PAS: 1.3, POS: 1.2, TEC: 1.1, MEN: 0.9, DRI: 0.5, STA: 0.4 },
  tiki_taka: { PAS: 1.3, TEC: 1.3, DRI: 0.9, POS: 0.9, MEN: 0.8, STA: 0.4 }
};

const goalkeeperFocusWeights: Record<TacticalFocus, WeightedStats<GoalkeeperStatKey>> = {
  balanced: { REF: 1, HAN: 1, DIS: 0.8, TEC: 0.5, MEN: 0.7 },
  wide_play: { DIS: 1.2, HAN: 1, TEC: 0.7, MEN: 0.5 },
  fast_breaks: { DIS: 1.3, REF: 0.8, TEC: 0.7, MEN: 0.6 },
  sustained_pressure: { DIS: 1.2, TEC: 1, MEN: 0.8, HAN: 0.6 },
  defensive_shape: { HAN: 1.3, REF: 1.2, MEN: 0.9, PHY: 0.7 },
  control: { DIS: 1.4, TEC: 1.1, MEN: 0.8, HAN: 0.5 },
  tiki_taka: { DIS: 1.4, TEC: 1.2, MEN: 0.8, HAN: 0.4 }
};

const positionFocusBias: Record<PlayerPosition, Partial<Record<TacticalFocus, number>>> = {
  GK: { defensive_shape: 1.08, control: 1.06, tiki_taka: 1.05, wide_play: 0.94, fast_breaks: 0.96 },
  CB: { defensive_shape: 1.14, control: 1.05, sustained_pressure: 0.98, wide_play: 0.92, fast_breaks: 0.92, tiki_taka: 1.02 },
  LB: { wide_play: 1.12, defensive_shape: 1.05, sustained_pressure: 1.02, fast_breaks: 1, control: 0.98 },
  RB: { wide_play: 1.12, defensive_shape: 1.05, sustained_pressure: 1.02, fast_breaks: 1, control: 0.98 },
  WB: { wide_play: 1.16, sustained_pressure: 1.08, fast_breaks: 1.04, defensive_shape: 1.02, control: 0.96 },
  DM: { control: 1.12, defensive_shape: 1.12, sustained_pressure: 1.06, tiki_taka: 1.04, fast_breaks: 0.92 },
  CM: { control: 1.12, sustained_pressure: 1.1, tiki_taka: 1.08, balanced: 1.03, defensive_shape: 0.98 },
  AM: { tiki_taka: 1.12, sustained_pressure: 1.1, control: 1.07, fast_breaks: 1.04, defensive_shape: 0.88 },
  LW: { wide_play: 1.16, fast_breaks: 1.12, tiki_taka: 1.03, sustained_pressure: 1, defensive_shape: 0.88 },
  RW: { wide_play: 1.16, fast_breaks: 1.12, tiki_taka: 1.03, sustained_pressure: 1, defensive_shape: 0.88 },
  ST: { fast_breaks: 1.12, sustained_pressure: 1.04, wide_play: 0.98, tiki_taka: 0.98, defensive_shape: 0.86, control: 0.92 }
};

export function tacticalFocusLabel(focus: TacticalFocus): string {
  return focusLabels[focus];
}

export function getPlayerTacticalFits(player: Player, limit = 3): TacticalFit[] {
  const fits = tacticalFocuses.map((focus) => scoreFocus(player, focus));
  return fits
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
    .slice(0, limit);
}

export function getPlayerTacticalFitForFocus(player: Player, focus: TacticalFocus): TacticalFit {
  return scoreFocus(player, focus);
}

export function getBestPlayerTacticalFit(player: Player): TacticalFit {
  return getPlayerTacticalFits(player, 1)[0];
}

export function getLineupTacticalFits(lineup: Lineup, playersById: Record<string, Player>, limit = 3): TacticalFit[] {
  const starters = lineup.starters
    .map((slot) => playersById[slot.playerId])
    .filter((player): player is Player => Boolean(player));
  const coverageModifier = starters.length >= 11 ? 1 : Math.max(0.4, starters.length / 11);

  const fits = tacticalFocuses.map((focus) => {
    const playerFits = starters.map((player) => getPlayerTacticalFitForFocus(player, focus));
    const averageScore = playerFits.length > 0
      ? playerFits.reduce((sum, fit) => sum + fit.score, 0) / playerFits.length
      : 0;
    return {
      focus,
      label: focusLabels[focus],
      score: clamp(Math.round(averageScore * coverageModifier), 1, 99),
      primaryStats: topLineupStats(playerFits)
    };
  });

  return fits
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
    .slice(0, limit);
}

function scoreFocus(player: Player, focus: TacticalFocus): TacticalFit {
  const stats = player.currentStats;
  const weights = isGoalkeeperStats(stats)
    ? goalkeeperFocusWeights[focus]
    : outfieldFocusWeights[focus];
  const baseline = averageCurrentStats(player);
  const weighted = weightedAverage(player, weights);
  const positionalBias = positionFocusBias[player.primaryPosition][focus] ?? 1;
  const relativeFit = 70 + ((weighted - baseline) / Math.max(baseline, 15)) * 100;
  const abilityTiebreak = (weighted - 50) * 0.08;
  const score = clamp(Math.round((relativeFit + abilityTiebreak) * positionalBias), 1, 99);

  return {
    focus,
    label: focusLabels[focus],
    score,
    primaryStats: topWeightedStats(weights)
  };
}

function weightedAverage(player: Player, weights: WeightedStats<OutfieldStatKey | GoalkeeperStatKey>): number {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(weights) as Array<[OutfieldStatKey | GoalkeeperStatKey, number]>) {
    weightedSum += getCurrentStat(player, key) * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : averageCurrentStats(player);
}

function averageCurrentStats(player: Player): number {
  const values = Object.values(player.currentStats).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (values.length === 0) return 1;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getCurrentStat(player: Player, key: OutfieldStatKey | GoalkeeperStatKey): number {
  if (isGoalkeeperStats(player.currentStats)) {
    const value = player.currentStats[key as keyof typeof player.currentStats];
    return typeof value === "number" ? value : 1;
  }
  if (key === "REF" || key === "HAN" || key === "DIS") return 1;
  return getOutfieldStatValue(player.currentStats, key);
}

function topWeightedStats(weights: WeightedStats<OutfieldStatKey | GoalkeeperStatKey>): string[] {
  return Object.entries(weights)
    .sort(([, left], [, right]) => (right ?? 0) - (left ?? 0))
    .slice(0, 3)
    .map(([key]) => key);
}

function topLineupStats(fits: TacticalFit[]): string[] {
  const counts = fits.reduce<Record<string, number>>((map, fit) => {
    for (const stat of fit.primaryStats) map[stat] = (map[stat] ?? 0) + 1;
    return map;
  }, {});
  return Object.entries(counts)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 3)
    .map(([stat]) => stat);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
