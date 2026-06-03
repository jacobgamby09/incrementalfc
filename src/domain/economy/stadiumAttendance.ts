import { economyProfile } from "../../data/constants/economyProfiles";
import { getFacilityLevelConfig } from "../../data/constants/facilityProfiles";
import { clamp } from "../../utils/math";
import type { Club } from "../types/club";
import type { StadiumAttendanceSummary } from "../types/economy";

const resultHype = {
  W: 15,
  D: 5,
  L: -10
} as const;

const recencyWeights = [1, 0.85, 0.7, 0.55, 0.4];

export function calculateClubHype(club: Club): number {
  const formHype = club.seasonStats.formLastFive.reduce(
    (sum, result, index) => sum + resultHype[result] * (recencyWeights[index] ?? 0),
    0
  );
  const promotionHype = Math.min(club.history.promotions * 8, 16);
  return Math.round(clamp(formHype + promotionHype, 0, 100));
}

export function calculateStadiumAttendance(homeClub: Club, opponentClub?: Club): StadiumAttendanceSummary {
  const stadium = getFacilityLevelConfig("stadium", homeClub.facilities.stadium.level);
  const capacity = stadium.effects.stadiumCapacity ?? 1_000;
  const multiplier = stadium.effects.matchdayIncomeMultiplier ?? 1;
  const hype = calculateClubHype(homeClub);
  const attendanceProfile = economyProfile.attendance;
  const reputationModifier = (homeClub.reputation - 10) * attendanceProfile.reputationRatePerPointAboveTen;
  const hypeModifier = (hype / 100) * attendanceProfile.hypeRateAtMaximum;
  const opponentModifier = (opponentClub?.reputation ?? 0) * attendanceProfile.opponentRatePerReputation;
  const attendanceRate = clamp(
    attendanceProfile.baseRate + reputationModifier + hypeModifier + opponentModifier,
    attendanceProfile.minimumRate,
    attendanceProfile.maximumRate
  );
  const estimatedDemand = Math.max(250, Math.round(homeClub.fans * attendanceRate));
  const attendance = Math.min(capacity, estimatedDemand);
  const lostDemand = Math.max(0, estimatedDemand - attendance);
  const ticketBase = economyProfile.ticketBasePrice;
  return {
    estimatedDemand,
    attendance,
    lostDemand,
    hype,
    attendanceRate,
    occupancyRate: attendance / capacity,
    ticketBase,
    stadiumMultiplier: multiplier,
    gateReceipts: Math.round(attendance * ticketBase * multiplier),
    lostPotentialRevenue: Math.round(lostDemand * ticketBase * multiplier)
  };
}
