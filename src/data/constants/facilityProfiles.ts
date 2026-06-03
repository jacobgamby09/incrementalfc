import type {
  ActiveFacilityType,
  Facility,
  FacilityEffects,
  FacilitySet
} from "../../domain/types/economy";

export type FacilityLevelConfig = {
  level: number;
  upgradeCost: number;
  upkeepPerWeek: number;
  constructionWeeks: number;
  effects: FacilityEffects;
};

export type FacilityProfile = {
  type: ActiveFacilityType;
  name: string;
  description: string;
  assetBaseKey: string;
  levels: FacilityLevelConfig[];
};

const trainingGround: FacilityProfile = {
  type: "trainingGround",
  name: "Training Ground",
  description: "Raises player development caps and improves squad training.",
  assetBaseKey: "training_ground",
  levels: [
    [1, 0, 250, 0, 10, 1, 0],
    [2, 20_000, 300, 1, 10, 1, 5],
    [3, 60_000, 375, 2, 12, 1, 8],
    [4, 70_000, 500, 2, 12, 2, 11],
    [5, 120_000, 700, 3, 15, 2, 15],
    [6, 150_000, 950, 3, 15, 2, 19],
    [7, 240_000, 1_300, 4, 18, 3, 23],
    [8, 360_000, 1_700, 4, 18, 3, 27],
    [9, 525_000, 2_200, 5, 20, 3, 31],
    [10, 750_000, 2_900, 5, 22, 4, 36],
    [11, 1_050_000, 3_800, 6, 22, 4, 41],
    [12, 1_450_000, 4_900, 6, 25, 4, 46],
    [13, 1_950_000, 6_300, 7, 27, 5, 51],
    [14, 2_600_000, 8_000, 8, 29, 5, 56],
    [15, 3_500_000, 10_000, 9, 32, 5, 62]
  ].map(([level, upgradeCost, upkeepPerWeek, constructionWeeks, developmentCapBonus, focusedTrainingSlots, xp]) => ({
    level,
    upgradeCost,
    upkeepPerWeek,
    constructionWeeks,
    effects: { developmentCapBonus, focusedTrainingSlots, trainingXpBonus: xp / 100 }
  }))
};

const stadium: FacilityProfile = {
  type: "stadium",
  name: "Stadium",
  description: "Expands capacity and increases income from home fixtures.",
  assetBaseKey: "stadium",
  levels: [
    [1, 0, 150, 0, 1_000, 1],
    [2, 20_000, 190, 1, 1_400, 1.02],
    [3, 70_000, 250, 2, 2_000, 1.04],
    [4, 90_000, 350, 2, 3_000, 1.07],
    [5, 160_000, 500, 3, 4_500, 1.1],
    [6, 180_000, 750, 4, 6_500, 1.14],
    [7, 320_000, 1_100, 4, 9_000, 1.18],
    [8, 540_000, 1_600, 5, 12_500, 1.23],
    [9, 850_000, 2_300, 6, 17_000, 1.28],
    [10, 1_300_000, 3_200, 7, 23_000, 1.34],
    [11, 2_000_000, 4_500, 8, 31_000, 1.41],
    [12, 3_000_000, 6_200, 9, 42_000, 1.5]
  ].map(([level, upgradeCost, upkeepPerWeek, constructionWeeks, stadiumCapacity, multiplier]) => ({
    level,
    upgradeCost,
    upkeepPerWeek,
    constructionWeeks,
    effects: { stadiumCapacity, matchdayIncomeMultiplier: multiplier }
  }))
};

const medicalCenter: FacilityProfile = {
  type: "medicalCenter",
  name: "Medical Center",
  description: "Improves readiness recovery and supports squad rotation.",
  assetBaseKey: "medical_center",
  levels: [
    [1, 0, 100, 0, 0],
    [2, 35_000, 140, 1, 1],
    [3, 22_000, 200, 2, 2],
    [4, 48_000, 300, 2, 3],
    [5, 90_000, 450, 3, 4],
    [6, 160_000, 650, 4, 5],
    [7, 280_000, 900, 4, 6],
    [8, 460_000, 1_250, 5, 7],
    [9, 750_000, 1_700, 6, 8],
    [10, 1_200_000, 2_400, 7, 10]
  ].map(([level, upgradeCost, upkeepPerWeek, constructionWeeks, readinessRecoveryBonus]) => ({
    level,
    upgradeCost,
    upkeepPerWeek,
    constructionWeeks,
    effects: { readinessRecoveryBonus }
  }))
};

const scoutingNetwork: FacilityProfile = {
  type: "scoutingNetwork",
  name: "Scouting Department",
  description: "Expands the visible market pool and improves recruitment information.",
  assetBaseKey: "scouting_network",
  levels: [
    [1, 0, 100, 0, 8, 0.05],
    [2, 35_000, 140, 1, 10, 0.07],
    [3, 24_000, 210, 2, 12, 0.1],
    [4, 50_000, 320, 2, 14, 0.14],
    [5, 95_000, 480, 3, 16, 0.18],
    [6, 170_000, 700, 4, 18, 0.22],
    [7, 290_000, 1_000, 4, 21, 0.27],
    [8, 480_000, 1_400, 5, 24, 0.32],
    [9, 780_000, 2_000, 6, 27, 0.38],
    [10, 1_250_000, 2_800, 7, 30, 0.45]
  ].map(([level, upgradeCost, upkeepPerWeek, constructionWeeks, marketPoolSize, scoutingAccuracyBonus]) => ({
    level,
    upgradeCost,
    upkeepPerWeek,
    constructionWeeks,
    effects: { marketPoolSize, scoutingAccuracyBonus }
  }))
};

const youthAcademy: FacilityProfile = {
  type: "youthAcademy",
  name: "Youth Academy",
  description: "Generates youth prospects over time for you to review.",
  assetBaseKey: "youth_academy",
  levels: [
    [1, 0, 120, 0, 6, 0],
    [2, 35_000, 170, 1, 7, 0.01],
    [3, 26_000, 240, 2, 8, 0.02],
    [4, 52_000, 340, 2, 9, 0.03],
    [5, 95_000, 500, 3, 10, 0.04],
    [6, 160_000, 720, 3, 11, 0.05],
    [7, 260_000, 1_000, 4, 12, 0.06],
    [8, 400_000, 1_350, 4, 13, 0.07],
    [9, 590_000, 1_800, 5, 14, 0.08],
    [10, 850_000, 2_400, 5, 15, 0.09],
    [11, 1_150_000, 3_100, 6, 16, 0.1],
    [12, 1_550_000, 4_000, 6, 17, 0.11],
    [13, 2_050_000, 5_100, 7, 18, 0.13],
    [14, 2_700_000, 6_500, 8, 19, 0.15],
    [15, 3_600_000, 8_200, 9, 20, 0.18]
  ].map(([level, upgradeCost, upkeepPerWeek, constructionWeeks, intakeProgressPerWeek, youthPotentialBonus]) => ({
    level,
    upgradeCost,
    upkeepPerWeek,
    constructionWeeks,
    effects: { intakeProgressPerWeek, youthPotentialBonus }
  }))
};

export const activeFacilityTypes: ActiveFacilityType[] = [
  "trainingGround",
  "stadium",
  "medicalCenter",
  "scoutingNetwork",
  "youthAcademy"
];

export const facilityProfiles: Record<ActiveFacilityType, FacilityProfile> = {
  trainingGround,
  stadium,
  medicalCenter,
  scoutingNetwork,
  youthAcademy
};

export function getFacilityProfile(type: ActiveFacilityType): FacilityProfile {
  return facilityProfiles[type];
}

export function getFacilityLevelConfig(type: ActiveFacilityType, level: number): FacilityLevelConfig {
  const profile = getFacilityProfile(type);
  return profile.levels[Math.max(0, Math.min(profile.levels.length - 1, level - 1))];
}

export function getNextFacilityLevelConfig(type: ActiveFacilityType, currentLevel: number): FacilityLevelConfig | undefined {
  return getFacilityProfile(type).levels.find((level) => level.level === currentLevel + 1);
}

export function createConfiguredFacility(type: ActiveFacilityType, level = 1): Facility {
  const profile = getFacilityProfile(type);
  const config = getFacilityLevelConfig(type, level);
  return {
    level: config.level,
    upgradeCost: getNextFacilityLevelConfig(type, config.level)?.upgradeCost ?? 0,
    upkeepPerWeek: config.upkeepPerWeek,
    effects: { ...config.effects },
    visualState: {
      visualTier: config.level,
      assetKey: `${profile.assetBaseKey}_tier_${config.level}`,
      upgradeState: "idle"
    },
    construction: null
  };
}

export function applyFacilityLevel(type: ActiveFacilityType, facility: Facility, level: number): Facility {
  const profile = getFacilityProfile(type);
  const config = getFacilityLevelConfig(type, level);
  return {
    ...facility,
    level: config.level,
    upgradeCost: getNextFacilityLevelConfig(type, config.level)?.upgradeCost ?? 0,
    upkeepPerWeek: config.upkeepPerWeek,
    effects: { ...config.effects },
    visualState: {
      visualTier: config.level,
      assetKey: `${profile.assetBaseKey}_tier_${config.level}`,
      upgradeState: "idle"
    },
    construction: null
  };
}

export function getTotalFacilityUpkeep(facilities: FacilitySet): number {
  return activeFacilityTypes.reduce((sum, type) => sum + facilities[type].upkeepPerWeek, 0) +
    facilities.analyticsDepartment.upkeepPerWeek;
}
