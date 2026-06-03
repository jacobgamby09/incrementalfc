import { describe, expect, it } from "vitest";
import { generateGameState } from "../generation/generateGameState";
import { calculateWeeklyFinanceSummary, processWeeklyFinances } from "./clubFinance";
import { calculateStadiumAttendance } from "./stadiumAttendance";

describe("weekly club finances", () => {
  it("awards gate receipts for home fixtures and zero gate receipts away", () => {
    const state = generateGameState();
    const clubId = state.playerClubId;
    const season = state.seasons[state.currentSeasonId];
    const home = season.fixtures.find((fixture) => fixture.homeClubId === clubId)!;
    const away = season.fixtures.find((fixture) => fixture.awayClubId === clubId)!;

    expect(calculateWeeklyFinanceSummary(state, clubId, home).gateReceipts).toBeGreaterThan(0);
    expect(calculateWeeklyFinanceSummary(state, clubId, away).gateReceipts).toBe(0);
  });

  it("processes wages and facility upkeep every week without mutating input state", () => {
    const state = generateGameState();
    const clubId = state.playerClubId;
    const fixture = state.seasons[state.currentSeasonId].fixtures.find((candidate) => candidate.awayClubId === clubId)!;
    const originalCash = state.clubs[clubId].economy.cashBalance;
    const next = processWeeklyFinances(state, fixture, 500);
    const summary = next.clubs[clubId].economy.lastWeeklySummary!;

    expect(state.clubs[clubId].economy.cashBalance).toBe(originalCash);
    expect(summary.gateReceipts).toBe(0);
    expect(summary.playerWages).toBeGreaterThan(0);
    expect(summary.facilityUpkeep).toBeGreaterThan(0);
    expect(next.clubs[clubId].economy.cashBalance).toBe(summary.cashBalanceAfter);
  });
});

describe("stadium attendance", () => {
  it("caps attendance at capacity and exposes lost demand", () => {
    const state = generateGameState();
    const club = state.clubs[state.playerClubId];
    club.fans = 10_000;
    const attendance = calculateStadiumAttendance(club);

    expect(attendance.attendance).toBe(club.facilities.stadium.effects.stadiumCapacity);
    expect(attendance.lostDemand).toBeGreaterThan(0);
    expect(attendance.lostPotentialRevenue).toBeGreaterThan(0);
  });

  it("uses short-term hype to increase demand without treating every fan as an attendee", () => {
    const state = generateGameState();
    const club = state.clubs[state.playerClubId];
    const opponent = Object.values(state.clubs).find((candidate) => candidate.id !== club.id)!;
    const quietDemand = calculateStadiumAttendance(club, opponent);

    club.seasonStats.formLastFive = ["W", "W", "W", "W", "W"];
    const hypedDemand = calculateStadiumAttendance(club, opponent);

    expect(quietDemand.estimatedDemand).toBeLessThan(club.fans);
    expect(hypedDemand.hype).toBeGreaterThan(quietDemand.hype);
    expect(hypedDemand.estimatedDemand).toBeGreaterThan(quietDemand.estimatedDemand);
  });
});
