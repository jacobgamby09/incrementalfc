export type FinanceTransactionCategory =
  | "baseline_income"
  | "gate_receipts"
  | "result_bonus"
  | "participation_prize"
  | "champion_prize"
  | "promotion_bonus"
  | "player_wages"
  | "staff_wages"
  | "facility_upkeep"
  | "facility_construction"
  | "transfer_purchase"
  | "transfer_sale";

export type FinanceTransaction = {
  id: string;
  seasonNumber: number;
  week: number;
  category: FinanceTransactionCategory;
  amount: number; // positive = income, negative = expense
  description: string;
};

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
  lastWeeklySummary?: WeeklyFinanceSummary;
  financeWarnings: string[];
  transactions: FinanceTransaction[];
};

export type FacilityEffects = {
  developmentCapBonus?: number;
  trainingXpBonus?: number;
  focusedTrainingSlots?: number;
  youthPotentialBonus?: number;
  intakeProgressPerWeek?: number;
  scoutingAccuracyBonus?: number;
  marketPoolSize?: number;
  matchdayIncomeBonus?: number;
  stadiumCapacity?: number;
  matchdayIncomeMultiplier?: number;
  injuryRiskReduction?: number;
  readinessRecoveryBonus?: number;
  reportDetailBonus?: number;
};

export type FacilityUpgradeState = "idle" | "upgrading" | "complete";

export type FacilityVisualState = {
  visualTier: number;
  assetKey: string;
  upgradeState: FacilityUpgradeState;
};

export type FacilityConstruction = {
  targetLevel: number;
  remainingWeeks: number;
  totalWeeks: number;
  startedAtSeason: number;
  startedAtMatchday: number;
};

export type Facility = {
  level: number;
  upgradeCost: number;
  upkeepPerWeek: number;
  effects: FacilityEffects;
  visualState: FacilityVisualState;
  construction: FacilityConstruction | null;
};

export type FacilitySet = {
  trainingGround: Facility;
  youthAcademy: Facility;
  scoutingNetwork: Facility;
  stadium: Facility;
  medicalCenter: Facility;
  analyticsDepartment: Facility;
};

export type ActiveFacilityType =
  | "trainingGround"
  | "youthAcademy"
  | "scoutingNetwork"
  | "stadium"
  | "medicalCenter";

export type WeeklyFinanceSummary = {
  baselineIncome: number;
  gateReceipts: number;
  resultBonus: number;
  playerWages: number;
  staffWages: number;
  facilityUpkeep: number;
  netChange: number;
  cashBalanceAfter: number;
  fixtureVenue: "home" | "away" | "offseason";
  warnings: string[];
};

export type StadiumAttendanceSummary = {
  estimatedDemand: number;
  attendance: number;
  lostDemand: number;
  hype: number;
  attendanceRate: number;
  occupancyRate: number;
  ticketBase: number;
  stadiumMultiplier: number;
  gateReceipts: number;
  lostPotentialRevenue: number;
};
