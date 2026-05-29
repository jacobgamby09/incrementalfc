import type { RandomSource } from "../../utils/random";
import type { Match } from "../types/match";

export type MatchBalanceDiagnostics = {
  matches: number;
  averageGoals: number;
  homeWinRate: number;
  awayWinRate: number;
  drawRate: number;
  averageHomeGoals: number;
  averageAwayGoals: number;
  highScoreRate: number;
};

export function createSeededRandomSource(seed: number): RandomSource {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function runMatchBalanceDiagnostics(options: {
  matches: number;
  seed?: number;
  simulate: (rng: RandomSource, matchIndex: number) => Match;
}): MatchBalanceDiagnostics {
  const rng = createSeededRandomSource(options.seed ?? 1);
  let totalGoals = 0;
  let homeGoals = 0;
  let awayGoals = 0;
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  let highScores = 0;

  for (let matchIndex = 0; matchIndex < options.matches; matchIndex += 1) {
    const match = options.simulate(rng, matchIndex);
    totalGoals += match.result.homeGoals + match.result.awayGoals;
    homeGoals += match.result.homeGoals;
    awayGoals += match.result.awayGoals;
    if (match.result.homeGoals > match.result.awayGoals) homeWins += 1;
    else if (match.result.awayGoals > match.result.homeGoals) awayWins += 1;
    else draws += 1;
    if (match.result.homeGoals >= 5 || match.result.awayGoals >= 5) highScores += 1;
  }

  return {
    matches: options.matches,
    averageGoals: totalGoals / options.matches,
    homeWinRate: homeWins / options.matches,
    awayWinRate: awayWins / options.matches,
    drawRate: draws / options.matches,
    averageHomeGoals: homeGoals / options.matches,
    averageAwayGoals: awayGoals / options.matches,
    highScoreRate: highScores / options.matches
  };
}
