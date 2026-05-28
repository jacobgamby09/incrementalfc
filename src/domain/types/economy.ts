export type EconomyState = {
  cashBalance: number;
  weeklyIncome: number;
  weeklyExpenses: number;
  playerWageTotal: number;
  staffWageTotal: number;
  facilityUpkeepTotal: number;
  scoutingUpkeep: number;
  academyUpkeep: number;
  sponsorIncomePerWeek: number;
  matchdayIncomeEstimate: number;
};

export type FacilityEffects = {
  developmentCapBonus?: number;
  trainingXpBonus?: number;
  youthPotentialBonus?: number;
  scoutingAccuracyBonus?: number;
  matchdayIncomeBonus?: number;
  injuryRiskReduction?: number;
  reportDetailBonus?: number;
};

export type FacilityUpgradeState = "idle" | "upgrading" | "complete";

export type FacilityVisualState = {
  visualTier: number;
  assetKey: string;
  upgradeState: FacilityUpgradeState;
};

export type Facility = {
  level: number;
  upgradeCost: number;
  upkeepPerWeek: number;
  effects: FacilityEffects;
  visualState: FacilityVisualState;
};

export type FacilitySet = {
  trainingGround: Facility;
  youthAcademy: Facility;
  scoutingNetwork: Facility;
  stadium: Facility;
  medicalCenter: Facility;
  analyticsDepartment: Facility;
};
