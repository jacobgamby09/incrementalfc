import type { ChanceType } from "./match";

export type OppositionReport = {
  fixtureId: string;
  opponentClubId: string;
  reportQuality: number;
  summary: string;
  estimatedStrengths: string[];
  estimatedWeaknesses: string[];
  chanceProfile?: Partial<Record<ChanceType, number>>;
  recommendedConsiderations: string[];
};
