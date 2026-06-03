import type { Player } from "../types/player";

export function getAgeCurveStageForAge(age: number): Player["development"]["ageCurveStage"] {
  if (age <= 20) return "youth";
  if (age <= 24) return "developing";
  if (age <= 29) return "prime";
  return "declining";
}

export function getEffectivePotentialValue(player: Player, key: string): number {
  const current = Number((player.currentStats as unknown as Record<string, number>)[key]);
  const storedPotential = Number((player.potentialStats as unknown as Record<string, number>)[key]);
  return player.age >= 30 ? current : storedPotential;
}

export function getRealPotentialStats(player: Player): Player["potentialStats"] {
  return player.potentialStats;
}
