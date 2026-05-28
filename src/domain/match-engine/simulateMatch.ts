import { chanceTypeBaseWeights } from "../../data/constants/formations";
import { createId, pickOne, randomInt, type RandomSource } from "../../utils/random";
import { clamp, roundTo } from "../../utils/math";
import type { Club } from "../types/club";
import type { Fixture } from "../types/league";
import type {
  ChanceType,
  Match,
  MatchEvent,
  MatchRewards,
  MatchTeamStats
} from "../types/match";
import { isGoalkeeperStats, type OutfieldStats, type Player } from "../types/player";
import type { Lineup, Tactic } from "../types/tactics";
import type { GameState } from "../types/game";
import { calculatePhaseStrengths, type PhaseStrengths } from "./calculatePhaseStrengths";
import { goalProbability } from "./goalProbability";
import { generateMatchReport } from "./generateMatchReport";
import { calculateMatchRewards } from "../rewards/calculateMatchRewards";
import { aggregatePlayerMatchStats } from "./playerMatchStats";
import { calculatePlayerMatchRatings } from "./playerMatchRatings";

type SimulateMatchOptions = {
  fixture: Fixture;
  homeClub: Club;
  awayClub: Club;
  homeLineup: Lineup;
  awayLineup: Lineup;
  homeTactic: Tactic;
  awayTactic: Tactic;
  gameState: GameState;
  reportingClubId?: string;
  rng?: RandomSource;
};

type MutableMatchStats = MatchTeamStats;

const chanceTypeDescriptions: Record<ChanceType, string> = {
  fast_breakaway: "fast breakaway",
  wide_cross: "wide cross",
  sustained_pressure: "spell of sustained pressure",
  rebound_big_chance: "rebound chance"
};

function createEmptyStats(): MatchTeamStats {
  return {
    eventsWon: 0,
    chancesCreated: 0,
    shots: 0,
    goals: 0,
    xg: 0,
    savesForced: 0,
    reboundsWon: 0,
    redCards: 0,
    chanceTypeBreakdown: {
      fast_breakaway: 0,
      wide_cross: 0,
      sustained_pressure: 0,
      rebound_big_chance: 0
    }
  };
}

function riskEventModifier(tactic: Tactic): number {
  if (tactic.riskLevel === "aggressive") return 4;
  if (tactic.riskLevel === "conservative") return -2;
  return 0;
}

function chanceCreationModifier(tactic: Tactic): number {
  if (tactic.riskLevel === "aggressive") return 0.05;
  if (tactic.riskLevel === "conservative") return -0.03;
  return 0;
}

function getOutfieldStarters(lineup: Lineup, gameState: GameState): Player[] {
  return lineup.starters
    .map((slot) => gameState.players[slot.playerId])
    .filter((player) => player && !isGoalkeeperStats(player.currentStats));
}

function average(values: number[]): number {
  if (values.length === 0) return 1;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function chanceTypeSkill(player: Player, chanceType: ChanceType): number {
  if (isGoalkeeperStats(player.currentStats)) return 1;
  const stats = player.currentStats;

  if (chanceType === "fast_breakaway") return average([stats.ACC, stats.TEC, stats.SHO]);
  if (chanceType === "wide_cross") return average([stats.CRO, stats.HEA, stats.PHY]);
  if (chanceType === "rebound_big_chance") return average([stats.SHO, stats.ACC, stats.MEN]);
  return average([stats.PAS, stats.TEC, stats.SHO]);
}

function pickAttacker(
  lineup: Lineup,
  gameState: GameState,
  chanceType: ChanceType,
  rng: RandomSource
): Player {
  const candidates = getOutfieldStarters(lineup, gameState).sort(
    (a, b) => chanceTypeSkill(b, chanceType) - chanceTypeSkill(a, chanceType)
  );
  const topCandidates = candidates.slice(0, Math.min(4, candidates.length));
  return pickOne(topCandidates, rng);
}

function pickChanceCreator(
  lineup: Lineup,
  shooter: Player | undefined,
  gameState: GameState,
  chanceType: ChanceType
): Player | undefined {
  const outfieldPlayers = getOutfieldStarters(lineup, gameState).filter((player) => player.id !== shooter?.id);
  if (outfieldPlayers.length === 0) return shooter;

  const candidates = outfieldPlayers.sort((a, b) => {
    if (isGoalkeeperStats(a.currentStats) || isGoalkeeperStats(b.currentStats)) return 0;
    const scoreA =
      chanceType === "wide_cross"
        ? average([a.currentStats.CRO, a.currentStats.PAS, a.currentStats.TEC])
        : chanceType === "fast_breakaway"
          ? average([a.currentStats.ACC, a.currentStats.PAS, a.currentStats.TEC])
          : average([a.currentStats.PAS, a.currentStats.TEC, a.currentStats.MEN]);
    const scoreB =
      chanceType === "wide_cross"
        ? average([b.currentStats.CRO, b.currentStats.PAS, b.currentStats.TEC])
        : chanceType === "fast_breakaway"
          ? average([b.currentStats.ACC, b.currentStats.PAS, b.currentStats.TEC])
          : average([b.currentStats.PAS, b.currentStats.TEC, b.currentStats.MEN]);
    return scoreB - scoreA;
  });

  return candidates[0];
}

function pickGoalkeeper(lineup: Lineup, gameState: GameState): Player | undefined {
  return lineup.starters
    .map((slot) => gameState.players[slot.playerId])
    .find((player) => player && isGoalkeeperStats(player.currentStats));
}

function pickDefensivePlayer(lineup: Lineup, gameState: GameState, rng: RandomSource): Player | undefined {
  const candidates = lineup.starters
    .filter((slot) => ["CB", "LB", "RB", "WB", "DM", "CM"].includes(slot.position))
    .map((slot) => gameState.players[slot.playerId])
    .filter(Boolean);

  if (candidates.length === 0) return undefined;
  return pickOne(candidates, rng);
}

function goalkeeperStrengthWithPressure(strength: number, pressure: number): number {
  return strength * (1 - Math.min(pressure * 0.02, 0.15));
}

function weightedPickChanceType(tactic: Tactic, rng: RandomSource): ChanceType {
  const weights = { ...chanceTypeBaseWeights };

  if (tactic.formation === "4-4-2") {
    weights.wide_cross += 0.35;
    weights.rebound_big_chance += 0.08;
  }
  if (tactic.formation === "4-3-3") {
    weights.wide_cross += 0.35;
    weights.sustained_pressure += 0.2;
    weights.fast_breakaway += 0.1;
  }
  if (tactic.formation === "4-2-3-1") {
    weights.sustained_pressure += 0.35;
  }
  if (tactic.formation === "3-5-2") {
    weights.sustained_pressure += 0.35;
    weights.wide_cross += 0.15;
  }
  if (tactic.formation === "5-4-1") {
    weights.fast_breakaway += 0.35;
    weights.sustained_pressure -= 0.15;
  }

  if (tactic.focus === "wide_play") weights.wide_cross += 0.6;
  if (tactic.focus === "fast_breaks") weights.fast_breakaway += 0.6;
  if (tactic.focus === "sustained_pressure") weights.sustained_pressure += 0.6;
  if (tactic.focus === "defensive_shape") weights.fast_breakaway += 0.2;

  const entries = Object.entries(weights).map(([chanceType, weight]) => ({
    chanceType: chanceType as ChanceType,
    weight: Math.max(weight, 0.05)
  }));
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * totalWeight;

  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.chanceType;
  }

  return "sustained_pressure";
}

function baseXgForChanceType(chanceType: ChanceType, rng: RandomSource): number {
  if (chanceType === "fast_breakaway") return 0.2 + rng() * 0.15;
  if (chanceType === "wide_cross") return 0.08 + rng() * 0.1;
  if (chanceType === "rebound_big_chance") return 0.35 + rng() * 0.25;
  return 0.1 + rng() * 0.15;
}

function chanceCreationChance(
  attackingPhase: PhaseStrengths,
  defendingPhase: PhaseStrengths,
  tactic: Tactic
): number {
  return clamp(
    0.22 + (attackingPhase.attack - defendingPhase.defence) * 0.025 + chanceCreationModifier(tactic),
    0.08,
    0.5
  );
}

function addShotOutcome(options: {
  events: MatchEvent[];
  stats: MutableMatchStats;
  opponentStats: MutableMatchStats;
  attackingClub: Club;
  attackingLineup: Lineup;
  defendingClub: Club;
  defendingLineup: Lineup;
  defendingGoalkeeperStrength: number;
  goalkeeperPressure: number;
  minute: number;
  chanceType: ChanceType;
  gameState: GameState;
  rng: RandomSource;
}): boolean {
  const {
    events,
    stats,
    opponentStats,
    attackingClub,
    attackingLineup,
    defendingClub,
    defendingLineup,
    defendingGoalkeeperStrength,
    goalkeeperPressure,
    minute,
    chanceType,
    gameState,
    rng
  } = options;
  const attacker = pickAttacker(attackingLineup, gameState, chanceType, rng);
  const creator = pickChanceCreator(attackingLineup, attacker, gameState, chanceType) ?? attacker;
  const defendingGoalkeeper = pickGoalkeeper(defendingLineup, gameState);
  const baseXg = baseXgForChanceType(chanceType, rng);
  const attackerSkill = chanceTypeSkill(attacker, chanceType);
  const effectiveGoalkeeper = goalkeeperStrengthWithPressure(defendingGoalkeeperStrength, goalkeeperPressure);
  const goalChance = goalProbability(baseXg, attackerSkill, effectiveGoalkeeper);
  const scored = rng() < goalChance;

  stats.shots += 1;
  stats.xg = roundTo(stats.xg + goalChance, 2);
  events.push({
    minute,
    type: "chance",
    clubId: attackingClub.id,
    playerId: creator.id,
    secondaryPlayerId: attacker.id,
    description: `${creator.firstName} ${creator.lastName} opens up a ${chanceTypeDescriptions[chanceType]} for ${attackingClub.name}.`,
    chanceType,
    outcome: "created"
  });
  if (scored) {
    stats.goals += 1;
    events.push({
      minute,
      type: "shot",
      clubId: attackingClub.id,
      playerId: attacker.id,
      description: `${attacker.firstName} ${attacker.lastName} gets the shot away.`,
      xg: roundTo(goalChance, 2),
      chanceType,
      outcome: "scored"
    });
    events.push({
      minute,
      type: "goal",
      clubId: attackingClub.id,
      playerId: attacker.id,
      secondaryPlayerId: creator.id !== attacker.id ? creator.id : undefined,
      description: `${attacker.firstName} ${attacker.lastName} scores for ${attackingClub.name}.`,
      xg: roundTo(goalChance, 2),
      chanceType,
      outcome: "scored"
    });
    return true;
  }

  opponentStats.savesForced += 1;
  events.push({
    minute,
    type: "shot",
    clubId: attackingClub.id,
    playerId: attacker.id,
    description: `${attacker.firstName} ${attacker.lastName} tests the goalkeeper.`,
    xg: roundTo(goalChance, 2),
    chanceType,
    outcome: "saved"
  });
  events.push({
    minute,
    type: "save",
    clubId: defendingClub.id,
    playerId: defendingGoalkeeper?.id,
    secondaryPlayerId: attacker.id,
    description: `${defendingGoalkeeper ? `${defendingGoalkeeper.firstName} ${defendingGoalkeeper.lastName}` : defendingClub.name} saves from a ${chanceTypeDescriptions[chanceType]}.`,
    xg: roundTo(goalChance, 2),
    chanceType,
    outcome: "saved"
  });
  return false;
}

function getTacticForLineup(club: Club, lineup: Lineup): Tactic {
  return club.tactics.savedTactics.find((tactic) => tactic.id === lineup.tacticId) ?? club.tactics.activeTactic;
}

export function simulateMatch({
  fixture,
  homeClub,
  awayClub,
  homeLineup,
  awayLineup,
  homeTactic,
  awayTactic,
  gameState,
  reportingClubId = homeClub.id,
  rng = Math.random
}: SimulateMatchOptions): Match {
  const events: MatchEvent[] = [];
  const homeStats = createEmptyStats();
  const awayStats = createEmptyStats();
  const homePhase = calculatePhaseStrengths(homeClub, gameState, homeLineup, homeTactic, true);
  const awayPhase = calculatePhaseStrengths(awayClub, gameState, awayLineup, awayTactic, false);
  let homeGoalkeeperPressure = 0;
  let awayGoalkeeperPressure = 0;
  const totalEvents = clamp(
    randomInt(20, 40, rng) + riskEventModifier(homeTactic) + riskEventModifier(awayTactic),
    16,
    48
  );

  for (let eventIndex = 0; eventIndex < totalEvents; eventIndex += 1) {
    const minute = clamp(Math.round(((eventIndex + 1) / totalEvents) * 90 + randomInt(-2, 2, rng)), 1, 90);
    const homeControlChance = clamp(
      homePhase.midfield / Math.max(homePhase.midfield + awayPhase.midfield, 1) + 0.03,
      0.25,
      0.75
    );
    const homeControls = rng() < homeControlChance;
    const attackingClub = homeControls ? homeClub : awayClub;
    const defendingClub = homeControls ? awayClub : homeClub;
    const attackingStats = homeControls ? homeStats : awayStats;
    const defendingStats = homeControls ? awayStats : homeStats;
    const attackingPhase = homeControls ? homePhase : awayPhase;
    const defendingPhase = homeControls ? awayPhase : homePhase;
    const attackingLineup = homeControls ? homeLineup : awayLineup;
    const defendingLineup = homeControls ? awayLineup : homeLineup;
    const defendingGoalkeeperStrength = homeControls ? awayPhase.goalkeeper : homePhase.goalkeeper;
    const attackingTactic = homeControls ? homeTactic : awayTactic;
    const goalkeeperPressure = homeControls ? awayGoalkeeperPressure : homeGoalkeeperPressure;

    attackingStats.eventsWon += 1;
    const controlPlayer = pickChanceCreator(attackingLineup, undefined, gameState, "sustained_pressure");
    events.push({
      minute,
      type: "event_control",
      clubId: attackingClub.id,
      playerId: controlPlayer?.id,
      description: `${attackingClub.name} gain control in midfield.`
    });

    const chanceCreated = rng() <= chanceCreationChance(attackingPhase, defendingPhase, attackingTactic);
    if (!chanceCreated) {
      if (rng() < 0.35) {
        const defender = pickDefensivePlayer(defendingLineup, gameState, rng);
        if (defender) {
          events.push({
            minute,
            type: "defensive_stop",
            clubId: defendingClub.id,
            playerId: defender.id,
            description: `${defender.firstName} ${defender.lastName} shuts down the attack for ${defendingClub.name}.`,
            outcome: "cleared"
          });
        }
      }
      continue;
    }

    const chanceType = weightedPickChanceType(attackingTactic, rng);
    attackingStats.chancesCreated += 1;
    attackingStats.chanceTypeBreakdown[chanceType] += 1;

    const scored = addShotOutcome({
      events,
      stats: attackingStats,
      opponentStats: defendingStats,
      attackingClub,
      attackingLineup,
      defendingClub,
      defendingLineup,
      defendingGoalkeeperStrength,
      goalkeeperPressure,
      minute,
      chanceType,
      gameState,
      rng
    });

    if (!scored) {
      if (homeControls) awayGoalkeeperPressure += 1;
      else homeGoalkeeperPressure += 1;
    }

    if (!scored && chanceType !== "rebound_big_chance" && rng() < 0.12) {
      attackingStats.reboundsWon += 1;
      attackingStats.chanceTypeBreakdown.rebound_big_chance += 1;
      events.push({
        minute: clamp(minute + 1, 1, 90),
        type: "rebound",
        clubId: attackingClub.id,
        playerId: pickAttacker(attackingLineup, gameState, "rebound_big_chance", rng).id,
        description: `${attackingClub.name} win the rebound inside the box.`,
        chanceType: "rebound_big_chance",
        outcome: "created"
      });
      addShotOutcome({
        events,
        stats: attackingStats,
        opponentStats: defendingStats,
        attackingClub,
        attackingLineup,
        defendingClub,
        defendingLineup,
        defendingGoalkeeperStrength,
        goalkeeperPressure: goalkeeperPressure + 2,
        minute: clamp(minute + 1, 1, 90),
        chanceType: "rebound_big_chance",
        gameState,
        rng
      });
    }

    if (eventIndex % 6 === 0) {
      homeGoalkeeperPressure = Math.max(homeGoalkeeperPressure - 1, 0);
      awayGoalkeeperPressure = Math.max(awayGoalkeeperPressure - 1, 0);
    }
  }

  const reportingIsHome = reportingClubId === homeClub.id;
  const reportingStats = reportingIsHome ? homeStats : awayStats;
  const opponentStats = reportingIsHome ? awayStats : homeStats;
  const reportingGoals = reportingIsHome ? homeStats.goals : awayStats.goals;
  const opponentGoals = reportingIsHome ? awayStats.goals : homeStats.goals;
  const reportFeedback = generateMatchReport({
    reportingClubName: reportingIsHome ? homeClub.name : awayClub.name,
    opponentClubName: reportingIsHome ? awayClub.name : homeClub.name,
    reportingStats,
    opponentStats,
    reportingGoals,
    opponentGoals
  });
  const sortedEvents = events.sort((a, b) => a.minute - b.minute);
  const matchShell: Match = {
    id: createId("match", rng),
    fixtureId: fixture.id,
    homeClubId: homeClub.id,
    awayClubId: awayClub.id,
    homeLineup,
    awayLineup,
    result: {
      homeGoals: homeStats.goals,
      awayGoals: awayStats.goals,
      winnerClubId:
        homeStats.goals > awayStats.goals ? homeClub.id : awayStats.goals > homeStats.goals ? awayClub.id : null
    },
    events: sortedEvents,
    report: {
      ...reportFeedback,
      homeStats,
      awayStats,
      playerStats: {},
      playerRatings: {}
    },
    rewards: {
      money: 0,
      fans: 0,
      reputation: 0,
      playerXp: {},
      tacticalFamiliarity: {},
      trainingXp: {},
      statGrowth: []
    }
  };
  const playerStats = aggregatePlayerMatchStats(matchShell, gameState);
  const playerRatings = calculatePlayerMatchRatings(playerStats, matchShell, gameState);
  const matchWithRatings: Match = {
    ...matchShell,
    report: {
      ...matchShell.report,
      playerStats,
      playerRatings
    }
  };
  const rewards: MatchRewards = calculateMatchRewards({
    club: reportingIsHome ? homeClub : awayClub,
    opponentClub: reportingIsHome ? awayClub : homeClub,
    lineup: reportingIsHome ? homeLineup : awayLineup,
    tactic: reportingIsHome ? homeTactic : awayTactic,
    goalsFor: reportingGoals,
    goalsAgainst: opponentGoals,
    isHome: reportingIsHome,
    match: matchWithRatings,
    gameState
  });

  return {
    ...matchWithRatings,
    rewards
  };
}

export function getClubTacticForLineup(club: Club, lineup: Lineup): Tactic {
  return getTacticForLineup(club, lineup);
}
