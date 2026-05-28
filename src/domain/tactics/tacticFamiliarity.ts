import type { Club } from "../types/club";
import type { GameState } from "../types/game";
import type { Tactic } from "../types/tactics";

export function getTacticKey(tactic: Tactic): string {
  return `${tactic.formation}_${tactic.focus}_${tactic.riskLevel}`;
}

export function getTacticFamiliarity(club: Club, tactic: Tactic): number {
  const tacticKey = getTacticKey(tactic);
  return club.tactics.familiarityByTacticId[tacticKey] ?? club.tactics.familiarityByTacticId[tactic.id] ?? 50;
}

export function getTacticFamiliarityModifier(familiarity: number): number {
  if (familiarity <= 50) return 0.92 + (familiarity / 50) * 0.08;
  return 1 + ((familiarity - 50) / 50) * 0.05;
}

export function getTacticFamiliarityEffectText(familiarity: number): string {
  const modifier = getTacticFamiliarityModifier(familiarity);
  const percent = Math.round((modifier - 1) * 100);
  if (percent > 0) return `High familiarity: roughly +${percent}% tactical effectiveness.`;
  if (percent < 0) return `Low familiarity: roughly ${percent}% tactical effectiveness.`;
  return "Neutral familiarity: no tactical effectiveness modifier.";
}

export function increaseTacticFamiliarity(club: Club, tactic: Tactic, gain: number): Club {
  const tacticKey = getTacticKey(tactic);
  const current = getTacticFamiliarity(club, tactic);

  return {
    ...club,
    tactics: {
      ...club.tactics,
      familiarityByTacticId: {
        ...club.tactics.familiarityByTacticId,
        [tacticKey]: Math.min(100, current + gain)
      }
    }
  };
}

export function getClubTacticFamiliarity(gameState: GameState, clubId: string, tactic: Tactic): number {
  return getTacticFamiliarity(gameState.clubs[clubId], tactic);
}

export function getLastTacticFamiliarityGain(gameState: GameState, tactic: Tactic): number | undefined {
  const tacticKey = getTacticKey(tactic);
  const playerMatches = Object.values(gameState.matches).filter(
    (match) => match.homeClubId === gameState.playerClubId || match.awayClubId === gameState.playerClubId
  );
  const latestMatch = playerMatches[playerMatches.length - 1];
  const gain = latestMatch?.rewards.tacticalFamiliarity[tacticKey];
  return gain && gain > 0 ? gain : undefined;
}
