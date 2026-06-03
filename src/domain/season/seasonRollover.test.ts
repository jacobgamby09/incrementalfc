import { describe, it, expect } from "vitest";
import { generateGameState } from "../generation/generateGameState";
import { createEmptyTable, generateLeague } from "../generation/generateLeague";
import { generateClub } from "../generation/generateClub";
import { generatePlayer } from "../generation/generatePlayer";
import { rollOverSeason } from "./seasonRollover";
import { calculatePlayerOvr } from "../player/playerSummaries";
import { lowestLeagueStatRange, normalizeLeagueLevel } from "../../data/constants/leagueProfiles";

describe("Milestone 3.4: League Ecosystem & Season Rollover Foundation", () => {
  it("generates division strength bands with leagues", () => {
    const dummyLeague1 = generateLeague([], 1);
    expect(dummyLeague1.targetOvrRange).toEqual([1, 10]);
    expect(dummyLeague1.targetPotentialRange).toEqual([6, 10]);
    expect(dummyLeague1.facilityCap).toBe(10);
    expect(dummyLeague1.typicalWageRange).toBeDefined();
    expect(dummyLeague1.typicalValueRange).toBeDefined();

    const dummyLeague2 = generateLeague([], 2);
    expect(dummyLeague2.targetOvrRange).toEqual([8, 18]);
    expect(dummyLeague2.targetPotentialRange).toEqual([12, 18]);
    expect(dummyLeague2.facilityCap).toBe(15);
  });

  it("assigns archetypes and ecosystem state to AI clubs on generation", () => {
    const dummyLeague = generateLeague([], 1);
    const generated = generateClub({
      name: "AI Test Club",
      shortName: "ATC",
      league: dummyLeague,
      isPlayerClub: false
    });

    expect(generated.club.ecosystem).toBeDefined();
    expect(generated.club.ecosystem.archetype).toBeDefined();
    expect(["ambitious", "stable", "youth_development", "veteran", "financially_cautious"]).toContain(
      generated.club.ecosystem.archetype
    );
    expect(generated.club.ecosystem.financialPressure).toBe(0);
    expect(generated.club.ecosystem.squadNeedProfile).toBeDefined();
  });

  it("rolls over season and ages players by 1 year", () => {
    const gameState = generateGameState();
    const currentSeason = gameState.seasons[gameState.currentSeasonId];
    
    // Fake the season status as completed
    currentSeason.status = "completed";

    const testPlayerId = Object.keys(gameState.players)[0];
    const originalAge = gameState.players[testPlayerId].age;

    const nextState = rollOverSeason(gameState);
    
    expect(nextState.currentDate.seasonNumber).toBe(2);
    expect(nextState.players[testPlayerId].age).toBe(originalAge + 1);
  });

  it("restores active squad readiness to 100 during the offseason", () => {
    const gameState = generateGameState();
    const currentSeason = gameState.seasons[gameState.currentSeasonId];
    currentSeason.status = "completed";
    const playerId = gameState.clubs[gameState.playerClubId].squadPlayerIds[0];
    gameState.players[playerId].status.fitness = 41;

    const nextState = rollOverSeason(gameState);

    expect(nextState.players[playerId].status.fitness).toBe(100);
  });

  it("declines older players physical stats lightly at rollover", () => {
    const gameState = generateGameState();
    const currentSeason = gameState.seasons[gameState.currentSeasonId];
    currentSeason.status = "completed";

    // Setup an older player (age 31) in player club
    const playerClub = gameState.clubs[gameState.playerClubId];
    const oldPlayer = generatePlayer({
      clubId: playerClub.id,
      position: "ST",
      statRange: lowestLeagueStatRange
    });
    oldPlayer.age = 31;
    oldPlayer.currentStats = {
      PAS: 5, SHO: 5, TAC: 5, CRO: 5, HEA: 5,
      ACC: 8, STA: 8, DRI: 5, POS: 5, TEC: 5, PHY: 8, MEN: 5
    };
    gameState.players[oldPlayer.id] = oldPlayer;
    playerClub.squadPlayerIds.push(oldPlayer.id);

    const nextState = rollOverSeason(gameState);
    const rolledPlayer = nextState.players[oldPlayer.id];
    const stats = rolledPlayer.currentStats as import("../types/player").OutfieldStats;

    expect(rolledPlayer.age).toBe(32);
    expect(stats.ACC).toBeLessThan(8);
    expect(stats.STA).toBeLessThan(8);
    expect(stats.PHY).toBeLessThan(8);
    expect(rolledPlayer.development.recentStatGrowth.some((g) => g.statKey === "ACC" && g.from === 8)).toBe(true);
  });

  it("does not explode squad size during AI squad refresh (maintains a baseline of players)", () => {
    const gameState = generateGameState();
    const currentSeason = gameState.seasons[gameState.currentSeasonId];
    currentSeason.status = "completed";

    const nextState = rollOverSeason(gameState);
    
    // Verify each active AI club has exactly 16 or more players
    const activeLeague = nextState.leagues[nextState.seasons[nextState.currentSeasonId].leagueId];
    activeLeague.clubIds.forEach((clubId) => {
      const club = nextState.clubs[clubId];
      expect(club.squadPlayerIds.length).toBeGreaterThanOrEqual(16);
    });
  });

  it("handles promoted and relegated club hooks without breaking league state", () => {
    const gameState = generateGameState();
    const currentSeason = gameState.seasons[gameState.currentSeasonId];
    currentSeason.status = "completed";

    // Fake standings to put player first
    currentSeason.table.forEach((entry) => {
      if (entry.clubId === gameState.playerClubId) {
        entry.points = 50;
      } else {
        entry.points = 10;
      }
    });

    const nextState = rollOverSeason(gameState);
    
    // Player was level 1, should promote to level 2
    const nextSeason = nextState.seasons[nextState.currentSeasonId];
    const nextLeague = nextState.leagues[nextSeason.leagueId];
    
    expect(nextLeague.level).toBe(2);
    expect(nextLeague.clubIds).toContain(gameState.playerClubId);
    expect(nextLeague.clubIds.length).toBe(10);
  });

  it("generates transfer candidates with realistic reason codes", () => {
    const gameState = generateGameState();
    const currentSeason = gameState.seasons[gameState.currentSeasonId];
    currentSeason.status = "completed";

    const nextState = rollOverSeason(gameState);
    expect(nextState.transferMarket).toBeDefined();
    expect(nextState.transferMarket.listedPlayerIds.length + nextState.transferMarket.freeAgentPlayerIds.length).toBeGreaterThan(0);

    // Verify listed players have reasons and asking prices
    nextState.transferMarket.listedPlayerIds.forEach((pid) => {
      const player = nextState.players[pid];
      expect(player.transferIntent.isListed).toBe(true);
      expect(player.transferIntent.listingReason).toBeDefined();
      expect(["financial_pressure", "too_good_for_division", "excess_squad"]).toContain(
        player.transferIntent.listingReason
      );
      expect(player.transferIntent.askingPrice).toBeGreaterThan(0);
    });
  });

  it("ensures lower-division strength bands do not inflate over seasons", () => {
    let state = generateGameState();
    
    // Run season rollover 3 times staying in level 1
    for (let s = 0; s < 3; s++) {
      const currentSeason = state.seasons[state.currentSeasonId];
      currentSeason.status = "completed";
      
      // Fake standings to make player finish at the bottom (no promotion)
      currentSeason.table.forEach((entry) => {
        if (entry.clubId === state.playerClubId) {
          entry.points = 5;
        } else {
          entry.points = 35;
        }
      });
      
      state = rollOverSeason(state);
    }

    const currentSeason = state.seasons[state.currentSeasonId];
    const activeLeague = state.leagues[currentSeason.leagueId];
    
    expect(activeLeague.level).toBe(1);
    
    // Average stat OVR of AI players in the league should stay within the division band (1-10)
    let totalOvr = 0;
    let count = 0;
    activeLeague.clubIds.forEach((clubId) => {
      if (clubId === state.playerClubId) return;
      const club = state.clubs[clubId];
      club.squadPlayerIds.forEach((pid) => {
        const player = state.players[pid];
        totalOvr += calculatePlayerOvr(player);
        count += 1;
      });
    });

    const averageOvr = totalOvr / count;
    // Lowland target OVR range is [1, 10]
    expect(averageOvr).toBeLessThanOrEqual(13); // Allowance for slight archetype pushes and outlier prospects
  });

  it("allows outlier players to exist but identifies them as transfer candidates", () => {
    const gameState = generateGameState();
    const currentSeason = gameState.seasons[gameState.currentSeasonId];
    currentSeason.status = "completed";

    // Setup standings so the player and the chosen AI club do not promote
    const aiClubId = Object.keys(gameState.clubs).find((id) => id !== gameState.playerClubId)!;
    currentSeason.table.forEach((entry) => {
      if (entry.clubId === gameState.playerClubId || entry.clubId === aiClubId) {
        entry.points = 5;
      } else {
        entry.points = 35;
      }
    });

    const aiClub = gameState.clubs[aiClubId];
    const outlier = generatePlayer({
      clubId: aiClubId,
      position: "ST",
      statRange: lowestLeagueStatRange
    });
    // Set current attributes very high
    outlier.currentStats = {
      PAS: 18, SHO: 18, TAC: 18, CRO: 18, HEA: 18,
      ACC: 18, STA: 18, DRI: 18, POS: 18, TEC: 18, PHY: 18, MEN: 18
    };
    gameState.players[outlier.id] = outlier;
    aiClub.squadPlayerIds.push(outlier.id);

    const nextState = rollOverSeason(gameState);
    
    // The player should either have churned (left club entirely / deleted) or be listed with "too_good_for_division"
    const nextPlayer = nextState.players[outlier.id];
    if (nextPlayer) {
      if (nextPlayer.clubId === aiClubId) {
        expect(nextPlayer.transferIntent.isListed).toBe(true);
        expect(nextPlayer.transferIntent.listingReason).toBe("too_good_for_division");
      } else {
        // Must be a free agent or removed
        expect(nextPlayer.clubId).toBeNull();
      }
    }
  });

  it("Premier League has 0 promotion spots, and champion remains in active league after rollover", () => {
    const gameState = generateGameState();
    const currentSeason = gameState.seasons[gameState.currentSeasonId];
    currentSeason.status = "completed";
    const localLeague = gameState.leagues.league_local_1;
    const premierLeague = gameState.leagues.league_level_5;
    const displacedClubId = premierLeague.clubIds[0];
    localLeague.clubIds = localLeague.clubIds.filter((id) => id !== gameState.playerClubId).concat(displacedClubId);
    premierLeague.clubIds = premierLeague.clubIds.filter((id) => id !== displacedClubId).concat(gameState.playerClubId);
    gameState.clubs[gameState.playerClubId].leagueId = premierLeague.id;
    gameState.clubs[displacedClubId].leagueId = localLeague.id;
    currentSeason.leagueId = premierLeague.id;
    currentSeason.clubIds = [...premierLeague.clubIds];
    currentSeason.table = createEmptyTable(currentSeason.clubIds);
    expect(premierLeague.promotionSpots).toBe(0);
    expect(premierLeague.relegationSpots).toBe(2);

    // Fake standings to put player first
    currentSeason.table.forEach((entry) => {
      if (entry.clubId === gameState.playerClubId) {
        entry.points = 50;
      } else {
        entry.points = 10;
      }
    });

    const nextState = rollOverSeason(gameState);
    const nextSeason = nextState.seasons[nextState.currentSeasonId];
    const nextLeague = nextState.leagues[nextSeason.leagueId];

    expect(nextLeague.level).toBe(5); // Stays at level 5
    expect(nextLeague.clubIds).toContain(gameState.playerClubId); // Player club remains
    expect(nextLeague.clubIds.length).toBe(10);
  });

  it("Local League has 0 relegation spots, player club cannot be relegated below level 1, and active league id matches clubs' leagueId", () => {
    const gameState = generateGameState();
    const currentSeason = gameState.seasons[gameState.currentSeasonId];
    currentSeason.status = "completed";
    
    const dummyLeague1 = generateLeague([], 1);
    expect(dummyLeague1.relegationSpots).toBe(0);

    // Fake standings to put player last
    currentSeason.table.forEach((entry, idx) => {
      if (entry.clubId === gameState.playerClubId) {
        entry.points = 0;
      } else {
        entry.points = idx + 10;
      }
    });

    const nextState = rollOverSeason(gameState);
    const nextSeason = nextState.seasons[nextState.currentSeasonId];
    const nextLeague = nextState.leagues[nextSeason.leagueId];

    expect(nextLeague.level).toBe(1); // Stays at level 1
    expect(nextLeague.clubIds).toContain(gameState.playerClubId);
    
    // Check that every active club's leagueId matches the next active league ID
    nextLeague.clubIds.forEach((clubId) => {
      const club = nextState.clubs[clubId];
      expect(club.leagueId).toBe(nextLeague.id);
    });
  });

  it("relegation from level 2 to level 1 sets correct league id for all active clubs including new replacements", () => {
    const gameState = generateGameState();
    const currentSeason = gameState.seasons[gameState.currentSeasonId];
    currentSeason.status = "completed";
    const localLeague = gameState.leagues.league_local_1;
    const regionalLeague = gameState.leagues.league_level_2;
    const displacedClubId = regionalLeague.clubIds[0];
    localLeague.clubIds = localLeague.clubIds.filter((id) => id !== gameState.playerClubId).concat(displacedClubId);
    regionalLeague.clubIds = regionalLeague.clubIds.filter((id) => id !== displacedClubId).concat(gameState.playerClubId);
    gameState.clubs[gameState.playerClubId].leagueId = regionalLeague.id;
    gameState.clubs[displacedClubId].leagueId = localLeague.id;
    currentSeason.leagueId = regionalLeague.id;
    currentSeason.clubIds = [...regionalLeague.clubIds];
    currentSeason.table = createEmptyTable(currentSeason.clubIds);

    // Relegate the player club (finish last)
    currentSeason.table.forEach((entry, idx) => {
      if (entry.clubId === gameState.playerClubId) {
        entry.points = 0;
      } else {
        entry.points = idx + 10;
      }
    });

    const nextState = rollOverSeason(gameState);
    const nextSeason = nextState.seasons[nextState.currentSeasonId];
    const nextLeague = nextState.leagues[nextSeason.leagueId];

    expect(nextLeague.level).toBe(1);
    expect(nextLeague.id).toBe("league_local_1");

    nextLeague.clubIds.forEach((clubId) => {
      const club = nextState.clubs[clubId];
      expect(club.leagueId).toBe("league_local_1");
    });
  });

  it("sorts table canonically and handles unsorted array correctly for champions, promotion and relegation", () => {
    const gameState = generateGameState();
    const currentSeason = gameState.seasons[gameState.currentSeasonId];
    currentSeason.status = "completed";

    // Mock table where the player is first in array but has lowest points
    // and another team is last in array but has highest points.
    const table = currentSeason.table;
    const playerEntry = table.find(e => e.clubId === gameState.playerClubId)!;
    playerEntry.points = 2; // player has 2 points
    playerEntry.goalDifference = -10;

    // Set other teams points
    table.forEach(entry => {
      if (entry.clubId !== gameState.playerClubId) {
        entry.points = 30; // others have 30 points
        entry.goalDifference = 10;
      }
    });

    // Make one team the clear champion (highest points, but last in the array)
    const lastEntry = table[table.length - 1];
    lastEntry.points = 45;
    lastEntry.goalDifference = 20;

    const nextState = rollOverSeason(gameState);
    
    // The champion should be the lastEntry club, which was paid the champion reward.
    // Check that player (relegated or stays) did not get champion payout.
    // Payout participation prize = 15000, champion prize = 80000, promotion bonus = 50000.
    // Champion (lastEntry) should have got cash: initial cash + participation + champion.
    const initialChampionCash = gameState.clubs[lastEntry.clubId].economy.cashBalance;
    const initialPlayerCash = gameState.clubs[gameState.playerClubId].economy.cashBalance;

    const championClub = nextState.clubs[lastEntry.clubId];
    const playerClub = nextState.clubs[gameState.playerClubId];

    expect(championClub.economy.cashBalance).toBe(initialChampionCash + 15000 + 80000 + 50000);
    expect(playerClub.economy.cashBalance).toBe(
      initialPlayerCash + 15000 + playerClub.economy.lastWeeklySummary!.netChange * 2
    ); // player got participation only, then paid two offseason finance ticks
  });

  it("keeps the input gameState completely pure and unmodified", () => {
    const gameState = generateGameState();
    const currentSeason = gameState.seasons[gameState.currentSeasonId];
    currentSeason.status = "completed";

    // Take deep copy of important input fields to check for changes
    const originalPlayerClubCash = gameState.clubs[gameState.playerClubId].economy.cashBalance;
    const originalSquadIds = [...gameState.clubs[gameState.playerClubId].squadPlayerIds];
    const firstPlayerId = originalSquadIds[0];
    const originalPlayerAge = gameState.players[firstPlayerId].age;
    const originalPlayerStats = { ...gameState.players[firstPlayerId].currentStats };

    rollOverSeason(gameState);

    // Assert original inputs remain unchanged
    expect(gameState.clubs[gameState.playerClubId].economy.cashBalance).toBe(originalPlayerClubCash);
    expect(gameState.clubs[gameState.playerClubId].squadPlayerIds).toEqual(originalSquadIds);
    expect(gameState.players[firstPlayerId].age).toBe(originalPlayerAge);
    expect(gameState.players[firstPlayerId].currentStats).toEqual(originalPlayerStats);
  });

  it("keeps the 50 persistent clubs and exempts offseason replacement players from immediate aging", () => {
    const gameState = generateGameState();
    const currentSeason = gameState.seasons[gameState.currentSeasonId];
    currentSeason.status = "completed";
    const aiClubId = currentSeason.clubIds.find((id) => id !== gameState.playerClubId)!;
    const originalPlayerIds = new Set(gameState.clubs[aiClubId].squadPlayerIds);
    gameState.clubs[aiClubId].squadPlayerIds.forEach((playerId) => {
      gameState.players[playerId].age = 34;
    });

    // We pass a constant RNG so we can predict generated replacement player ages exactly
    const constantRng = () => 0;
    const nextState = rollOverSeason(gameState, constantRng);

    expect(Object.keys(nextState.clubs)).toHaveLength(50);
    expect(Object.keys(nextState.clubs).sort()).toEqual(Object.keys(gameState.clubs).sort());
    const replacementIds = nextState.clubs[aiClubId].squadPlayerIds.filter((id) => !originalPlayerIds.has(id));
    expect(replacementIds.length).toBeGreaterThan(0);
    replacementIds.forEach((playerId) => {
      expect(nextState.players[playerId].age).toBe(17);
      expect(nextState.players[playerId].development.recentDevelopmentNotes).toEqual([]);
    });
  });

  it("clears stale notes and preserves physical decline notes for veteran players", () => {
    const gameState = generateGameState();
    const currentSeason = gameState.seasons[gameState.currentSeasonId];
    currentSeason.status = "completed";

    // Setup an older player (age 31) in player club with stale development notes
    const playerClub = gameState.clubs[gameState.playerClubId];
    const oldPlayer = generatePlayer({
      clubId: playerClub.id,
      position: "ST",
      statRange: lowestLeagueStatRange
    });
    oldPlayer.age = 31;
    oldPlayer.development.recentDevelopmentNotes = ["Old stale training note"];
    gameState.players[oldPlayer.id] = oldPlayer;
    playerClub.squadPlayerIds.push(oldPlayer.id);

    // Setup a young player with stale development notes
    const youngPlayer = generatePlayer({
      clubId: playerClub.id,
      position: "ST",
      statRange: lowestLeagueStatRange
    });
    youngPlayer.age = 22;
    youngPlayer.development.recentDevelopmentNotes = ["Young stale note"];
    gameState.players[youngPlayer.id] = youngPlayer;
    playerClub.squadPlayerIds.push(youngPlayer.id);

    const nextState = rollOverSeason(gameState);

    const nextOldPlayer = nextState.players[oldPlayer.id];
    const nextYoungPlayer = nextState.players[youngPlayer.id];

    // Old player should have physical decline note preserved
    expect(nextOldPlayer.development.recentDevelopmentNotes).toContain("Physical decline due to age.");
    expect(nextOldPlayer.development.recentDevelopmentNotes).not.toContain("Old stale training note");

    // Young player should have stale note cleared
    expect(nextYoungPlayer.development.recentDevelopmentNotes).toEqual([]);
  });

  it("normalizes invalid league levels into valid ranges", () => {
    const highNormalized = normalizeLeagueLevel(99);
    expect(highNormalized).toBe(5);

    const lowNormalized = normalizeLeagueLevel(-10);
    expect(lowNormalized).toBe(1);

    const nanNormalized = normalizeLeagueLevel(Number.NaN);
    expect(nanNormalized).toBe(1);

    const infiniteNormalized = normalizeLeagueLevel(Number.POSITIVE_INFINITY);
    expect(infiniteNormalized).toBe(1);

    const normalLevel = normalizeLeagueLevel(3);
    expect(normalLevel).toBe(3);
  });
});
