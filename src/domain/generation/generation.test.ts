import { describe, expect, it } from "vitest";
import { generateFixtures } from "./generateFixtures";
import { generateGameState } from "./generateGameState";
import { generatePlayer } from "./generatePlayer";
import { lowestLeagueStatRange } from "../../data/constants/leagueProfiles";
import { nationalityProfiles } from "../../data/constants/worldProfiles";
import { playerFullName } from "./playerNameRegistry";

describe("generated world", () => {
  it("creates a persistent five-division pyramid with 10 clubs per league", () => {
    const gameState = generateGameState();

    expect(Object.values(gameState.leagues)).toHaveLength(5);
    expect(Object.values(gameState.clubs)).toHaveLength(50);
    for (const league of Object.values(gameState.leagues)) {
      expect(league.clubIds).toHaveLength(10);
    }
  });

  it("creates at least 16 players for each club", () => {
    const gameState = generateGameState();

    for (const club of Object.values(gameState.clubs)) {
      expect(club.squadPlayerIds.length).toBeGreaterThanOrEqual(16);
    }
  });

  it("generates 18 fixtures for each club", () => {
    const clubIds = Array.from({ length: 10 }, (_, index) => `club_${index + 1}`);
    const fixtures = generateFixtures(clubIds, "season_test");

    for (const clubId of clubIds) {
      const matches = fixtures.filter(
        (fixture) => fixture.homeClubId === clubId || fixture.awayClubId === clubId
      );
      expect(matches).toHaveLength(18);
    }
  });

  it("creates home and away matches for each club pair", () => {
    const clubIds = Array.from({ length: 10 }, (_, index) => `club_${index + 1}`);
    const fixtures = generateFixtures(clubIds, "season_test");
    const pairDirections = new Map<string, Set<string>>();

    for (const fixture of fixtures) {
      const pairKey = [fixture.homeClubId, fixture.awayClubId].sort().join("|");
      const direction = `${fixture.homeClubId}->${fixture.awayClubId}`;
      const directions = pairDirections.get(pairKey) ?? new Set<string>();

      directions.add(direction);
      pairDirections.set(pairKey, directions);
    }

    expect(pairDirections.size).toBe(45);
    for (const directions of pairDirections.values()) {
      expect(directions.size).toBe(2);
    }
  });

  it("avoids long home and away streaks in the fixture schedule", () => {
    const clubIds = Array.from({ length: 10 }, (_, index) => `club_${index + 1}`);
    const fixtures = generateFixtures(clubIds, "season_test");

    for (const clubId of clubIds) {
      const venues = fixtures
        .filter((fixture) => fixture.homeClubId === clubId || fixture.awayClubId === clubId)
        .sort((left, right) => left.matchday - right.matchday)
        .map((fixture) => fixture.homeClubId === clubId ? "home" : "away");
      let longestStreak = 1;
      let currentStreak = 1;
      for (let index = 1; index < venues.length; index += 1) {
        currentStreak = venues[index] === venues[index - 1] ? currentStreak + 1 : 1;
        longestStreak = Math.max(longestStreak, currentStreak);
      }

      expect(longestStreak).toBeLessThanOrEqual(2);
    }
  });

  it("generates low-league player stats in the expected range", () => {
    const player = generatePlayer({
      clubId: "club_test",
      position: "CM",
      statRange: lowestLeagueStatRange
    });

    for (const stat of Object.values(player.currentStats)) {
      expect(stat).toBeGreaterThanOrEqual(lowestLeagueStatRange.typicalCurrentMin);
      expect(stat).toBeLessThanOrEqual(lowestLeagueStatRange.typicalCurrentMax);
    }

    for (const [key, potential] of Object.entries(player.potentialStats)) {
      const current = player.currentStats[key as keyof typeof player.currentStats];
      expect(potential).toBeGreaterThanOrEqual(current);
      expect(potential).toBeLessThanOrEqual(lowestLeagueStatRange.rarePotentialMax);
    }
  });

  it("generates stamina, dribbling, and positioning for outfield players only", () => {
    const winger = generatePlayer({
      clubId: "club_test",
      position: "LW",
      statRange: lowestLeagueStatRange
    });
    const goalkeeper = generatePlayer({
      clubId: "club_test",
      position: "GK",
      statRange: lowestLeagueStatRange
    });

    expect(winger.currentStats).toMatchObject({
      STA: expect.any(Number),
      DRI: expect.any(Number),
      POS: expect.any(Number)
    });
    expect(winger.potentialStats).toMatchObject({
      STA: expect.any(Number),
      DRI: expect.any(Number),
      POS: expect.any(Number)
    });
    expect("STA" in goalkeeper.currentStats).toBe(false);
    expect("DRI" in goalkeeper.currentStats).toBe(false);
    expect("POS" in goalkeeper.currentStats).toBe(false);
  });

  it("preserves unrestricted personal potential rolls regardless of player age", () => {
    const veteran = generatePlayer({
      clubId: "club_test",
      position: "CM",
      statRange: lowestLeagueStatRange,
      age: 32,
      rng: () => 0.5
    });

    let hasRemainingUpside = false;
    for (const [key, potential] of Object.entries(veteran.potentialStats)) {
      const current = veteran.currentStats[key as keyof typeof veteran.currentStats];
      expect(potential).toBeGreaterThanOrEqual(current);
      if (potential > current) hasRemainingUpside = true;
    }
    expect(hasRemainingUpside).toBe(true);
  });

  it("adds visual identity to every generated club", () => {
    const gameState = generateGameState();

    for (const club of Object.values(gameState.clubs)) {
      expect(club.visualIdentity.primaryColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(club.visualIdentity.secondaryColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(club.visualIdentity.accentColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(club.visualIdentity.badgeSeed).toContain("badge");
      expect(club.visualIdentity.kitStyle).toBeTruthy();
      expect(club.visualIdentity.hubTheme).toBeTruthy();
    }
  });

  it("adds visual identity to every generated player", () => {
    const gameState = generateGameState();

    for (const player of Object.values(gameState.players)) {
      expect(player.visualIdentity.portraitSeed).toContain(player.id);
      expect(player.visualIdentity.appearanceProfile).toBeTruthy();
      expect(player.visualIdentity.kitNumber).toBeGreaterThanOrEqual(1);
      expect(player.visualIdentity.kitNumber).toBeLessThanOrEqual(99);
    }
  });

  it("adds visual state to every generated facility", () => {
    const gameState = generateGameState();

    for (const club of Object.values(gameState.clubs)) {
      for (const facility of Object.values(club.facilities)) {
        expect(facility.visualState.visualTier).toBeGreaterThanOrEqual(1);
        expect(facility.visualState.assetKey).toMatch(/_tier_\d+$/);
        expect(facility.visualState.upgradeState).toBe("idle");
      }
    }
  });

  it("keeps visual metadata stable inside a generated game state", () => {
    const gameState = generateGameState();
    const visualSnapshot = JSON.stringify({
      clubs: Object.fromEntries(
        Object.values(gameState.clubs).map((club) => [club.id, club.visualIdentity])
      ),
      players: Object.fromEntries(
        Object.values(gameState.players).map((player) => [player.id, player.visualIdentity])
      ),
      facilities: Object.fromEntries(
        Object.values(gameState.clubs).map((club) => [
          club.id,
          Object.fromEntries(
            Object.entries(club.facilities).map(([facilityKey, facility]) => [
              facilityKey,
              facility.visualState
            ])
          )
        ])
      )
    });

    expect(Object.values(gameState.clubs).length).toBe(50);
    expect(gameState.seasons[gameState.currentSeasonId].fixtures.length).toBe(90);
    expect(Object.values(gameState.players).length).toBeGreaterThanOrEqual(800);

    const nextVisualSnapshot = JSON.stringify({
      clubs: Object.fromEntries(
        Object.values(gameState.clubs).map((club) => [club.id, club.visualIdentity])
      ),
      players: Object.fromEntries(
        Object.values(gameState.players).map((player) => [player.id, player.visualIdentity])
      ),
      facilities: Object.fromEntries(
        Object.values(gameState.clubs).map((club) => [
          club.id,
          Object.fromEntries(
            Object.entries(club.facilities).map(([facilityKey, facility]) => [
              facilityKey,
              facility.visualState
            ])
          )
        ])
      )
    });

    expect(nextVisualSnapshot).toBe(visualSnapshot);
  });

  it("keeps facility gameplay level separate from visual tier", () => {
    const gameState = generateGameState();
    const club = Object.values(gameState.clubs)[0];
    const facility = club.facilities.trainingGround;
    const originalVisualTier = facility.visualState.visualTier;

    facility.level += 1;

    expect(facility.level).not.toBe(originalVisualTier);
    expect(facility.visualState.visualTier).toBe(originalVisualTier);
  });

  it("generates nationality-aware player names with an English majority in the Local League", () => {
    const gameState = generateGameState();
    const localLeague = gameState.leagues.league_local_1;
    const localPlayers = localLeague.clubIds.flatMap((clubId) =>
      gameState.clubs[clubId].squadPlayerIds.map((playerId) => gameState.players[playerId])
    );
    const englishPlayers = localPlayers.filter((player) => player.nationality === "England");

    expect(englishPlayers.length / localPlayers.length).toBeGreaterThan(0.6);
    expect(localPlayers.every((player) => player.nationality && player.nationality !== "Fictional")).toBe(true);
  });

  it("uses broad nationality name pools to reduce repeated generated names", () => {
    expect(nationalityProfiles.England.firstNames.length).toBeGreaterThanOrEqual(50);
    expect(nationalityProfiles.England.lastNames.length).toBeGreaterThanOrEqual(80);
    for (const profile of Object.values(nationalityProfiles)) {
      expect(profile.firstNames.length).toBeGreaterThanOrEqual(12);
      expect(profile.lastNames.length).toBeGreaterThanOrEqual(12);
    }

    const gameState = generateGameState();
    const fullNames = Object.values(gameState.players).map((player) => `${player.firstName} ${player.lastName}`);
    const uniqueNameRatio = new Set(fullNames).size / fullNames.length;

    expect(uniqueNameRatio).toBeGreaterThan(0.9);
  });

  it("does not generate duplicate full player names across the persistent world", () => {
    const gameState = generateGameState();
    const fullNames = Object.values(gameState.players).map(playerFullName);
    const uniqueFullNames = new Set(fullNames);
    const highestSurnameCount = Math.max(...Object.values(gameState.nameRegistry?.surnameCounts ?? {}));

    expect(uniqueFullNames.size).toBe(fullNames.length);
    expect(gameState.nameRegistry?.usedFullNames.length).toBe(fullNames.length);
    expect(highestSurnameCount).toBeLessThanOrEqual(12);
  });
});
