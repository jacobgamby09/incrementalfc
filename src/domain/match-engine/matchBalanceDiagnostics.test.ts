import { describe, expect, it } from "vitest";
import { generateGameState } from "../generation/generateGameState";
import { autoSelectLineup } from "../lineup/selectLineup";
import { isGoalkeeperStats, type Player } from "../types/player";
import type { Tactic } from "../types/tactics";
import { runMatchBalanceDiagnostics } from "./matchBalanceDiagnostics";
import { simulateMatch } from "./simulateMatch";

function balancedTactic(tactic: Tactic): Tactic {
  return {
    ...tactic,
    formation: "4-4-2",
    focus: "balanced",
    riskLevel: "balanced"
  };
}

function setPlayerAbility(player: Player, ability: number): void {
  player.currentStats = isGoalkeeperStats(player.currentStats)
    ? { REF: ability, HAN: ability, DIS: ability, TEC: ability, PHY: ability, MEN: ability }
    : { PAS: ability, SHO: ability, TAC: ability, CRO: ability, HEA: ability, ACC: ability, STA: ability, DRI: ability, POS: ability, TEC: ability, PHY: ability, MEN: ability };
}

function scenarioTactic(tactic: Tactic, overrides: Partial<Tactic>): Tactic {
  return {
    ...tactic,
    ...overrides
  };
}

function runScenario(homeTacticOverrides: Partial<Tactic>, awayTacticOverrides: Partial<Tactic>, seed: number) {
  const gameState = generateGameState();
  const fixture = gameState.seasons[gameState.currentSeasonId].fixtures[0];
  const homeClub = gameState.clubs[fixture.homeClubId];
  const awayClub = gameState.clubs[fixture.awayClubId];
  const homeTactic = scenarioTactic(homeClub.tactics.activeTactic, homeTacticOverrides);
  const awayTactic = scenarioTactic(awayClub.tactics.activeTactic, awayTacticOverrides);
  const homeLineup = autoSelectLineup(homeClub, gameState, homeTactic);
  const awayLineup = autoSelectLineup(awayClub, gameState, awayTactic);
  let homeChances = 0;
  let awayChances = 0;

  const diagnostics = runMatchBalanceDiagnostics({
    matches: 60,
    seed,
    simulate: (rng) => {
      const match = simulateMatch({
        fixture,
        homeClub,
        awayClub,
        homeLineup,
        awayLineup,
        homeTactic,
        awayTactic,
        gameState,
        reportingClubId: homeClub.id,
        rng
      });

      homeChances += match.report.homeStats.chancesCreated;
      awayChances += match.report.awayStats.chancesCreated;
      return match;
    }
  });

  return {
    ...diagnostics,
    averageHomeChances: homeChances / diagnostics.matches,
    averageAwayChances: awayChances / diagnostics.matches
  };
}

describe("match balance diagnostics", () => {
  it("keeps common score distribution broadly football-like", () => {
    const gameState = generateGameState();
    const fixture = gameState.seasons[gameState.currentSeasonId].fixtures[0];
    const homeClub = gameState.clubs[fixture.homeClubId];
    const awayClub = gameState.clubs[fixture.awayClubId];
    const homeTactic = balancedTactic(homeClub.tactics.activeTactic);
    const awayTactic = balancedTactic(awayClub.tactics.activeTactic);
    const homeLineup = autoSelectLineup(homeClub, gameState, homeTactic);
    const awayLineup = autoSelectLineup(awayClub, gameState, awayTactic);

    const diagnostics = runMatchBalanceDiagnostics({
      matches: 80,
      seed: 32,
      simulate: (rng) => simulateMatch({
        fixture,
        homeClub,
        awayClub,
        homeLineup,
        awayLineup,
        homeTactic,
        awayTactic,
        gameState,
        reportingClubId: homeClub.id,
        rng
      })
    });

    expect(diagnostics.averageGoals).toBeGreaterThan(0.7);
    expect(diagnostics.averageGoals).toBeLessThan(4.2);
    expect(diagnostics.highScoreRate).toBeLessThan(0.3);
  });

  it("lets a clearly stronger team win more often across a batch", () => {
    const gameState = generateGameState();
    const fixture = gameState.seasons[gameState.currentSeasonId].fixtures[0];
    const homeClub = gameState.clubs[fixture.homeClubId];
    const awayClub = gameState.clubs[fixture.awayClubId];
    homeClub.squadPlayerIds.forEach((playerId) => setPlayerAbility(gameState.players[playerId], 9));
    awayClub.squadPlayerIds.forEach((playerId) => setPlayerAbility(gameState.players[playerId], 4));
    const homeTactic = balancedTactic(homeClub.tactics.activeTactic);
    const awayTactic = balancedTactic(awayClub.tactics.activeTactic);
    const homeLineup = autoSelectLineup(homeClub, gameState, homeTactic);
    const awayLineup = autoSelectLineup(awayClub, gameState, awayTactic);

    const diagnostics = runMatchBalanceDiagnostics({
      matches: 80,
      seed: 75,
      simulate: (rng) => simulateMatch({
        fixture,
        homeClub,
        awayClub,
        homeLineup,
        awayLineup,
        homeTactic,
        awayTactic,
        gameState,
        reportingClubId: homeClub.id,
        rng
      })
    });

    expect(diagnostics.homeWinRate).toBeGreaterThan(diagnostics.awayWinRate);
    expect(diagnostics.homeWinRate).toBeGreaterThan(0.45);
  });

  it("shows aggressive tactics create more danger for both teams than conservative shape", () => {
    const aggressive = runScenario(
      { formation: "3-4-3", focus: "fast_breaks", riskLevel: "aggressive" },
      { formation: "4-4-2", focus: "balanced", riskLevel: "balanced" },
      91
    );
    const conservative = runScenario(
      { formation: "5-4-1", focus: "defensive_shape", riskLevel: "conservative" },
      { formation: "4-4-2", focus: "balanced", riskLevel: "balanced" },
      91
    );

    expect(aggressive.averageHomeChances).toBeGreaterThan(conservative.averageHomeChances);
    expect(aggressive.averageAwayChances).toBeGreaterThan(conservative.averageAwayChances);
  });

  it("shows defensive setups reduce total goals compared with open aggressive setups", () => {
    const defensive = runScenario(
      { formation: "5-4-1", focus: "defensive_shape", riskLevel: "conservative" },
      { formation: "5-4-1", focus: "defensive_shape", riskLevel: "conservative" },
      118
    );
    const open = runScenario(
      { formation: "3-4-3", focus: "fast_breaks", riskLevel: "aggressive" },
      { formation: "3-4-3", focus: "sustained_pressure", riskLevel: "aggressive" },
      118
    );

    expect(defensive.averageGoals).toBeLessThan(open.averageGoals);
    expect(defensive.drawRate).toBeGreaterThanOrEqual(open.drawRate * 0.8);
  });
});
