import type { Club } from "../types/club";
import type { Player } from "../types/player";
import { getFacilityLevelConfig } from "../../data/constants/facilityProfiles";
import { calculatePlayerRealPot } from "../player/playerSummaries";

export type ScoutingConfidence = "Low" | "Medium" | "High";

export type ScoutedPotentialReport = {
  estimatedMin: number;
  estimatedMax: number;
  confidence: ScoutingConfidence;
  accuracy: number;
};

export type ScoutedValueReport = {
  estimatedMin: number;
  estimatedMax: number;
  confidence: ScoutingConfidence;
  accuracy: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getScoutingAccuracy(club: Club): number {
  const facilityBonus = getFacilityLevelConfig(
    "scoutingNetwork",
    club.facilities.scoutingNetwork.level
  ).effects.scoutingAccuracyBonus ?? 0;
  return clamp(club.scouting.reportAccuracy + facilityBonus, 0.35, 0.95);
}

export function getScoutedPotentialReport(player: Player, scoutingClub: Club): ScoutedPotentialReport {
  const accuracy = getScoutingAccuracy(scoutingClub);
  const realPot = calculatePlayerRealPot(player);
  const uncertainty = Math.max(1, Math.round((1 - accuracy) * 10));

  return {
    estimatedMin: Math.max(1, Math.floor(realPot - uncertainty)),
    estimatedMax: Math.min(99, Math.ceil(realPot + uncertainty)),
    confidence: accuracy >= 0.8 ? "High" : accuracy >= 0.6 ? "Medium" : "Low",
    accuracy
  };
}

export function formatScoutedPotential(report: ScoutedPotentialReport): string {
  return `${report.estimatedMin}-${report.estimatedMax}`;
}

export function getScoutedStatReport(value: number, scoutingClub: Club): ScoutedValueReport {
  const accuracy = getScoutingAccuracy(scoutingClub);
  const uncertainty = Math.max(1, Math.round((1 - accuracy) * 8));

  return {
    estimatedMin: Math.max(1, Math.floor(value - uncertainty)),
    estimatedMax: Math.min(99, Math.ceil(value + uncertainty)),
    confidence: accuracy >= 0.8 ? "High" : accuracy >= 0.6 ? "Medium" : "Low",
    accuracy
  };
}

export function formatScoutedValue(report: ScoutedValueReport): string {
  return `${report.estimatedMin}-${report.estimatedMax}`;
}
