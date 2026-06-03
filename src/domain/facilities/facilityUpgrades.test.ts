import { describe, expect, it } from "vitest";
import { activeFacilityTypes, facilityProfiles } from "../../data/constants/facilityProfiles";
import { generateGameState } from "../generation/generateGameState";
import {
  advanceFacilityConstruction,
  canStartFacilityUpgrade,
  getOperatingReserveWarning,
  startFacilityUpgrade
} from "./facilityUpgrades";

describe("facility profiles", () => {
  it("keeps all active ladders sequential and balance values non-negative", () => {
    for (const type of activeFacilityTypes) {
      const levels = facilityProfiles[type].levels;
      expect(levels.map((level) => level.level)).toEqual(
        Array.from({ length: levels.length }, (_, index) => index + 1)
      );
      for (const level of levels) {
        expect(level.upgradeCost).toBeGreaterThanOrEqual(0);
        expect(level.upkeepPerWeek).toBeGreaterThanOrEqual(0);
        expect(level.constructionWeeks).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("facility upgrades", () => {
  it("deducts cash immediately and applies effects only after construction completes", () => {
    const state = generateGameState();
    const club = state.clubs[state.playerClubId];
    const originalCash = club.economy.cashBalance;
    const next = startFacilityUpgrade(state, club.id, "trainingGround");

    expect(next).not.toBe(state);
    expect(state.clubs[club.id].facilities.trainingGround.construction).toBeNull();
    expect(next.clubs[club.id].economy.cashBalance).toBe(originalCash - 20_000);
    expect(next.clubs[club.id].facilities.trainingGround.level).toBe(1);

    const completed = advanceFacilityConstruction(next, 1, [club.id]);
    expect(completed.clubs[club.id].facilities.trainingGround.level).toBe(2);
    expect(completed.clubs[club.id].facilities.trainingGround.effects.trainingXpBonus).toBe(0.05);
    expect(completed.clubs[club.id].facilities.trainingGround.construction).toBeNull();
  });

  it("allows different facilities to build together but blocks a duplicate construction", () => {
    const state = generateGameState();
    const clubId = state.playerClubId;
    const training = startFacilityUpgrade(state, clubId, "trainingGround");
    const trainingAndMedical = startFacilityUpgrade(training, clubId, "medicalCenter");

    expect(trainingAndMedical.clubs[clubId].facilities.trainingGround.construction).toBeTruthy();
    expect(trainingAndMedical.clubs[clubId].facilities.medicalCenter.construction).toBeTruthy();
    expect(canStartFacilityUpgrade(trainingAndMedical, clubId, "trainingGround")).toMatchObject({
      allowed: false,
      reason: "Construction is already active."
    });
  });

  it("surfaces a reserve warning without blocking an otherwise affordable upgrade", () => {
    const state = generateGameState();
    const club = state.clubs[state.playerClubId];
    club.economy.cashBalance = 21_000;

    expect(getOperatingReserveWarning(state, club.id, "trainingGround")).toContain("3 weeks");
    expect(canStartFacilityUpgrade(state, club.id, "trainingGround").allowed).toBe(true);
  });
});
