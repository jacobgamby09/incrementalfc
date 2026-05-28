import { describe, expect, it } from "vitest";
import { generateGameState } from "../generation/generateGameState";
import { autoSelectLineup } from "../lineup/selectLineup";
import { calculatePhaseStrengths } from "../match-engine/calculatePhaseStrengths";
import type { Match } from "../types/match";
import type { Lineup } from "../types/tactics";
import {
  getLastTacticFamiliarityGain,
  getTacticFamiliarityModifier,
  getTacticKey,
  increaseTacticFamiliarity
} from "./tacticFamiliarity";

describe("tactical familiarity", () => {
  it("uses stable tactic keys and increases familiarity", () => {
    const gameState = generateGameState();
    const club = gameState.clubs[gameState.playerClubId];
    const tactic = club.tactics.activeTactic;
    const key = getTacticKey(tactic);
    const updatedClub = increaseTacticFamiliarity(club, tactic, 7);

    expect(key).toContain(tactic.formation);
    expect(updatedClub.tactics.familiarityByTacticId[key]).toBeGreaterThan(club.tactics.familiarityByTacticId[key] ?? 50);
  });

  it("applies a small phase strength modifier from low to high familiarity", () => {
    expect(getTacticFamiliarityModifier(0)).toBeCloseTo(0.92);
    expect(getTacticFamiliarityModifier(50)).toBeCloseTo(1);
    expect(getTacticFamiliarityModifier(100)).toBeCloseTo(1.05);

    const gameState = generateGameState();
    const club = gameState.clubs[gameState.playerClubId];
    const tactic = club.tactics.activeTactic;
    const lineup = autoSelectLineup(club, gameState, tactic);
    const key = getTacticKey(tactic);
    const lowClub = { ...club, tactics: { ...club.tactics, familiarityByTacticId: { [key]: 0 } } };
    const highClub = { ...club, tactics: { ...club.tactics, familiarityByTacticId: { [key]: 100 } } };

    expect(calculatePhaseStrengths(highClub, gameState, lineup, tactic).attack)
      .toBeGreaterThan(calculatePhaseStrengths(lowClub, gameState, lineup, tactic).attack);
  });

  it("derives latest player-club familiarity gain for a tactic", () => {
    const gameState = generateGameState();
    const club = gameState.clubs[gameState.playerClubId];
    const tactic = club.tactics.activeTactic;
    const key = getTacticKey(tactic);
    const match = {
      id: "match_fam",
      fixtureId: "fixture_fam",
      homeClubId: club.id,
      awayClubId: "away",
      homeLineup: {} as Lineup,
      awayLineup: {} as Lineup,
      result: { homeGoals: 1, awayGoals: 0, winnerClubId: club.id },
      events: [],
      report: {
        summary: "",
        homeStats: {} as Match["report"]["homeStats"],
        awayStats: {} as Match["report"]["awayStats"],
        playerStats: {},
        playerRatings: {},
        keyProblems: [],
        recommendations: []
      },
      rewards: {
        money: 0,
        fans: 0,
        reputation: 0,
        playerXp: {},
        tacticalFamiliarity: { [key]: 3 },
        trainingXp: {},
        statGrowth: []
      }
    } satisfies Match;

    expect(getLastTacticFamiliarityGain({ ...gameState, matches: { [match.id]: match } }, tactic)).toBe(3);
  });
});
