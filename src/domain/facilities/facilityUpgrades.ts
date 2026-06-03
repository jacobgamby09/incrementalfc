import {
  activeFacilityTypes,
  applyFacilityLevel,
  getFacilityLevelConfig,
  getNextFacilityLevelConfig,
  getTotalFacilityUpkeep
} from "../../data/constants/facilityProfiles";
import { economyProfile } from "../../data/constants/economyProfiles";
import type { ActiveFacilityType, Facility, FacilitySet } from "../types/economy";
import type { GameState } from "../types/game";
import { appendFinanceTransaction } from "../economy/financeLedger";

function cloneFacility(facility: Facility): Facility {
  return {
    ...facility,
    effects: { ...facility.effects },
    visualState: { ...facility.visualState },
    construction: facility.construction ? { ...facility.construction } : null
  };
}

export function cloneFacilities(facilities: FacilitySet): FacilitySet {
  return {
    trainingGround: cloneFacility(facilities.trainingGround),
    youthAcademy: cloneFacility(facilities.youthAcademy),
    scoutingNetwork: cloneFacility(facilities.scoutingNetwork),
    stadium: cloneFacility(facilities.stadium),
    medicalCenter: cloneFacility(facilities.medicalCenter),
    analyticsDepartment: cloneFacility(facilities.analyticsDepartment)
  };
}

export function getFacilityUpgradePreview(gameState: GameState, clubId: string, type: ActiveFacilityType) {
  const club = gameState.clubs[clubId];
  const facility = club.facilities[type];
  return {
    facility,
    current: getFacilityLevelConfig(type, facility.level),
    next: getNextFacilityLevelConfig(type, facility.level)
  };
}

export function canStartFacilityUpgrade(gameState: GameState, clubId: string, type: ActiveFacilityType): {
  allowed: boolean;
  reason?: string;
} {
  const club = gameState.clubs[clubId];
  const facility = club.facilities[type];
  const next = getNextFacilityLevelConfig(type, facility.level);
  if (!next) return { allowed: false, reason: "Maximum level reached." };
  if (facility.construction) return { allowed: false, reason: "Construction is already active." };
  if (club.economy.cashBalance < next.upgradeCost) return { allowed: false, reason: "Insufficient cash." };
  return { allowed: true };
}

export function getOperatingReserveWarning(gameState: GameState, clubId: string, type: ActiveFacilityType): string | undefined {
  const club = gameState.clubs[clubId];
  const next = getNextFacilityLevelConfig(type, club.facilities[type].level);
  if (!next) return undefined;
  const projectedCommitments = club.economy.playerWageTotal + club.economy.staffWageTotal +
    getTotalFacilityUpkeep(club.facilities) - club.facilities[type].upkeepPerWeek + next.upkeepPerWeek;
  const reserve = club.economy.cashBalance - next.upgradeCost;
  if (reserve < projectedCommitments * economyProfile.reserveWarningWeeks) {
    return `This upgrade leaves less than ${economyProfile.reserveWarningWeeks} weeks of operating costs in reserve.`;
  }
  return undefined;
}

export function startFacilityUpgrade(gameState: GameState, clubId: string, type: ActiveFacilityType): GameState {
  const eligibility = canStartFacilityUpgrade(gameState, clubId, type);
  if (!eligibility.allowed) throw new Error(eligibility.reason);

  const club = gameState.clubs[clubId];
  const next = getNextFacilityLevelConfig(type, club.facilities[type].level)!;
  const facilities = cloneFacilities(club.facilities);
  facilities[type] = {
    ...facilities[type],
    construction: {
      targetLevel: next.level,
      remainingWeeks: next.constructionWeeks,
      totalWeeks: next.constructionWeeks,
      startedAtSeason: gameState.currentDate.seasonNumber,
      startedAtMatchday: gameState.seasons[gameState.currentSeasonId].currentMatchday
    },
    visualState: {
      ...facilities[type].visualState,
      upgradeState: "upgrading"
    }
  };

  const facilityNames: Record<ActiveFacilityType, string> = {
    trainingGround: "Training Ground",
    youthAcademy: "Youth Academy",
    scoutingNetwork: "Scouting Network",
    stadium: "Stadium",
    medicalCenter: "Medical Center"
  };
  const facilityName = facilityNames[type] ?? type;

  const updatedEconomy = appendFinanceTransaction(club.economy, {
    seasonNumber: gameState.currentDate.seasonNumber,
    week: gameState.currentDate.week,
    category: "facility_construction",
    amount: -next.upgradeCost,
    description: `${facilityName} upgrade to level ${next.level}`
  });

  return {
    ...gameState,
    clubs: {
      ...gameState.clubs,
      [clubId]: {
        ...club,
        facilities,
        economy: {
          ...updatedEconomy,
          cashBalance: club.economy.cashBalance - next.upgradeCost
        }
      }
    }
  };
}

export function advanceFacilityConstruction(gameState: GameState, weeks: number, clubIds = Object.keys(gameState.clubs)): GameState {
  const nextClubs = { ...gameState.clubs };
  for (const clubId of clubIds) {
    const club = nextClubs[clubId];
    if (!club) continue;
    const facilities = cloneFacilities(club.facilities);
    let changed = false;
    for (const type of activeFacilityTypes) {
      const construction = facilities[type].construction;
      if (!construction) continue;
      changed = true;
      const remainingWeeks = Math.max(0, construction.remainingWeeks - weeks);
      facilities[type] = remainingWeeks === 0
        ? applyFacilityLevel(type, facilities[type], construction.targetLevel)
        : { ...facilities[type], construction: { ...construction, remainingWeeks } };
    }
    if (!changed) continue;
    nextClubs[clubId] = {
      ...club,
      facilities,
      economy: {
        ...club.economy,
        facilityUpkeepTotal: getTotalFacilityUpkeep(facilities)
      }
    };
  }
  return { ...gameState, clubs: nextClubs };
}
