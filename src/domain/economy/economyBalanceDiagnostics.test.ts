import { describe, expect, it } from "vitest";
import { economyProfile } from "../../data/constants/economyProfiles";
import { activeFacilityTypes, type FacilityProfile } from "../../data/constants/facilityProfiles";
import { getFacilityProfile } from "../../data/constants/facilityProfiles";
import { autoSelectLineup } from "../lineup/selectLineup";
import { sortTableCanonically } from "../league/leagueTableView";
import { generateGameState } from "../generation/generateGameState";
import { canStartFacilityUpgrade, getOperatingReserveWarning, startFacilityUpgrade } from "../facilities/facilityUpgrades";
import { playMatchday } from "../season/playMatchday";
import { calculateStadiumAttendance } from "./stadiumAttendance";
import type { ActiveFacilityType } from "../types/economy";
import type { GameState } from "../types/game";
import type { RandomSource } from "../../utils/random";

type UpgradeTarget = {
  type: ActiveFacilityType;
  level: number;
};

type Strategy = {
  name: string;
  targets: UpgradeTarget[];
  respectReserveWarning?: boolean;
};

type SeasonDiagnostic = {
  strategy: string;
  cashAfter: number;
  facilitySpend: number;
  upgradesStarted: number;
  lowestCashReserve: number;
  reserveWarnings: number;
  weeklyNet: number;
  gateReceipts: number;
  resultBonuses: number;
  playerWages: number;
  facilityUpkeep: number;
  points: number;
  rank: number;
  academyProgress: number;
  pendingProspect: boolean;
  levels: string;
};

const strategies: Strategy[] = [
  { name: "no upgrades", targets: [] },
  { name: "training first", targets: [{ type: "trainingGround", level: 5 }] },
  { name: "stadium first", targets: [{ type: "stadium", level: 5 }] },
  {
    name: "broad foundation (aggressive)",
    targets: [
      { type: "stadium", level: 3 },
      { type: "trainingGround", level: 3 },
      { type: "medicalCenter", level: 2 },
      { type: "youthAcademy", level: 2 },
      { type: "scoutingNetwork", level: 2 }
    ]
  },
  {
    name: "broad foundation (cautious)",
    respectReserveWarning: true,
    targets: [
      { type: "stadium", level: 3 },
      { type: "trainingGround", level: 3 },
      { type: "medicalCenter", level: 2 },
      { type: "youthAcademy", level: 2 },
      { type: "scoutingNetwork", level: 2 }
    ]
  }
];

function seededRandom(seed: number): RandomSource {
  let value = seed >>> 0;
  return () => {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0;
    return value / 4_294_967_296;
  };
}

function facilityLevels(gameState: GameState): string {
  const facilities = gameState.clubs[gameState.playerClubId].facilities;
  return activeFacilityTypes
    .map((type) => `${type.replace(/[A-Z]/g, (letter) => letter.toLowerCase())}:${facilities[type].level}`)
    .join(" ");
}

function tryStartNextUpgrade(gameState: GameState, strategy: Strategy): {
  gameState: GameState;
  spent: number;
  reserveWarning: boolean;
} {
  const club = gameState.clubs[gameState.playerClubId];
  for (const target of strategy.targets) {
    const facility = club.facilities[target.type];
    if (facility.level >= target.level || facility.construction) continue;
    if (!canStartFacilityUpgrade(gameState, club.id, target.type).allowed) continue;
    const reserveWarning = Boolean(getOperatingReserveWarning(gameState, club.id, target.type));
    if (reserveWarning && strategy.respectReserveWarning) continue;
    const before = club.economy.cashBalance;
    const next = startFacilityUpgrade(gameState, club.id, target.type);
    return {
      gameState: next,
      spent: before - next.clubs[club.id].economy.cashBalance,
      reserveWarning
    };
  }
  return { gameState, spent: 0, reserveWarning: false };
}

function simulateSeason(strategy: Strategy, seed: number): SeasonDiagnostic {
  const rng = seededRandom(seed);
  let gameState = generateGameState(rng);
  let facilitySpend = 0;
  let upgradesStarted = 0;
  let lowestCashReserve = gameState.clubs[gameState.playerClubId].economy.cashBalance;
  let reserveWarnings = 0;
  let weeklyNet = 0;
  let gateReceipts = 0;
  let resultBonuses = 0;
  let playerWages = 0;
  let facilityUpkeep = 0;

  while (gameState.seasons[gameState.currentSeasonId].status === "active") {
    const upgrade = tryStartNextUpgrade(gameState, strategy);
    gameState = upgrade.gameState;
    facilitySpend += upgrade.spent;
    if (upgrade.spent > 0) upgradesStarted += 1;
    if (upgrade.reserveWarning) reserveWarnings += 1;
    lowestCashReserve = Math.min(lowestCashReserve, gameState.clubs[gameState.playerClubId].economy.cashBalance);

    const season = gameState.seasons[gameState.currentSeasonId];
    const fixture = season.fixtures.find(
      (candidate) =>
        candidate.matchday === season.currentMatchday &&
        candidate.status === "scheduled" &&
        (candidate.homeClubId === gameState.playerClubId || candidate.awayClubId === gameState.playerClubId)
    );
    if (!fixture) throw new Error("Player fixture was not found for the active matchday.");

    const club = gameState.clubs[gameState.playerClubId];
    const tactic = club.tactics.activeTactic;
    const lineup = autoSelectLineup(club, gameState, tactic);
    gameState = playMatchday({
      gameState,
      fixtureId: fixture.id,
      playerLineup: lineup,
      playerTactic: tactic,
      rng
    }).gameState;

    const summary = gameState.clubs[gameState.playerClubId].economy.lastWeeklySummary!;
    weeklyNet += summary.netChange;
    gateReceipts += summary.gateReceipts;
    resultBonuses += summary.resultBonus;
    playerWages += summary.playerWages;
    facilityUpkeep += summary.facilityUpkeep;
    reserveWarnings += summary.warnings.length;
    lowestCashReserve = Math.min(lowestCashReserve, summary.cashBalanceAfter);
  }

  const club = gameState.clubs[gameState.playerClubId];
  const table = sortTableCanonically(gameState.seasons[gameState.currentSeasonId].table);
  return {
    strategy: strategy.name,
    cashAfter: club.economy.cashBalance,
    facilitySpend,
    upgradesStarted,
    lowestCashReserve,
    reserveWarnings,
    weeklyNet,
    gateReceipts,
    resultBonuses,
    playerWages,
    facilityUpkeep,
    points: table.find((entry) => entry.clubId === club.id)!.points,
    rank: table.findIndex((entry) => entry.clubId === club.id) + 1,
    academyProgress: club.academy.prospectGenerationProgress,
    pendingProspect: Boolean(club.academy.pendingProspect),
    levels: facilityLevels(gameState)
  };
}

function average(values: number[]): number {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function aggregate(rows: SeasonDiagnostic[]) {
  return {
    strategy: rows[0].strategy,
    cashAfter: average(rows.map((row) => row.cashAfter)),
    facilitySpend: average(rows.map((row) => row.facilitySpend)),
    upgradesStarted: average(rows.map((row) => row.upgradesStarted)),
    lowestCashReserve: average(rows.map((row) => row.lowestCashReserve)),
    reserveWarnings: average(rows.map((row) => row.reserveWarnings)),
    weeklyNet: average(rows.map((row) => row.weeklyNet)),
    gateReceipts: average(rows.map((row) => row.gateReceipts)),
    resultBonuses: average(rows.map((row) => row.resultBonuses)),
    playerWages: average(rows.map((row) => row.playerWages)),
    facilityUpkeep: average(rows.map((row) => row.facilityUpkeep)),
    points: average(rows.map((row) => row.points)),
    rank: Number((rows.reduce((sum, row) => sum + row.rank, 0) / rows.length).toFixed(1)),
    prospectRate: `${Math.round((rows.filter((row) => row.pendingProspect).length / rows.length) * 100)}%`,
    levels: rows[0].levels
  };
}

function upgradePaybackWeeks(profile: FacilityProfile): Array<{ facility: string; level: number; paybackWeeks: number | string }> {
  return profile.levels.slice(1).map((level, index) => {
    const previous = profile.levels[index];
    if (profile.type !== "stadium") {
      return { facility: profile.name, level: level.level, paybackWeeks: "utility" };
    }
    const oldCapacity = previous.effects.stadiumCapacity ?? 0;
    const newCapacity = level.effects.stadiumCapacity ?? 0;
    const oldMultiplier = previous.effects.matchdayIncomeMultiplier ?? 1;
    const newMultiplier = level.effects.matchdayIncomeMultiplier ?? 1;
    const incrementalGate = newCapacity * 12 * newMultiplier - oldCapacity * 12 * oldMultiplier;
    const incrementalUpkeep = level.upkeepPerWeek - previous.upkeepPerWeek;
    const netHomeFixtureGain = incrementalGate - incrementalUpkeep * 2;
    return {
      facility: profile.name,
      level: level.level,
      paybackWeeks: netHomeFixtureGain > 0 ? Number((level.upgradeCost / netHomeFixtureGain * 2).toFixed(1)) : "never"
    };
  });
}

describe("economy balance diagnostics", () => {
  it("prints comparable Local League season pacing across common upgrade strategies", () => {
    const rows = strategies.map((strategy) =>
      aggregate(Array.from({ length: 12 }, (_, index) => simulateSeason(strategy, 100 + index)))
    );

    console.table(rows);

    const baseline = rows.find((row) => row.strategy === "no upgrades")!;
    expect(baseline.cashAfter).toBeGreaterThan(economyProfile.startingPlayerCash);
    expect(baseline.gateReceipts).toBeGreaterThan(0);
    expect(rows.every((row) => row.cashAfter >= 0)).toBe(true);
  });

  it("prints rough stadium payback timing for config tuning", () => {
    const rows = upgradePaybackWeeks(getFacilityProfile("stadium"));
    console.table(rows);

    expect(rows).toHaveLength(getFacilityProfile("stadium").levels.length - 1);
    expect(rows.every((row) => row.paybackWeeks !== "never")).toBe(true);
  });

  it("prints opening and winning-streak stadium demand", () => {
    const gameState = generateGameState(seededRandom(77));
    const club = gameState.clubs[gameState.playerClubId];
    const opponent = Object.values(gameState.clubs).find((candidate) => candidate.id !== club.id)!;
    const opening = calculateStadiumAttendance(club, opponent);
    club.seasonStats.formLastFive = ["W", "W", "W", "W", "W"];
    const winningStreak = calculateStadiumAttendance(club, opponent);

    console.table([
      { scenario: "opening day", ...opening },
      { scenario: "five-win streak", ...winningStreak }
    ]);

    expect(opening.estimatedDemand).toBeLessThan(club.facilities.stadium.effects.stadiumCapacity!);
    expect(winningStreak.estimatedDemand).toBeGreaterThan(opening.estimatedDemand);
  });
});
