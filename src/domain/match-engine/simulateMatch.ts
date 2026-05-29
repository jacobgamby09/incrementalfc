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
import { isGoalkeeperStats, type Player, type PlayerPosition } from "../types/player";
import type { Lineup, Tactic } from "../types/tactics";
import type { GameState } from "../types/game";
import { calculatePhaseStrengths } from "./calculatePhaseStrengths";
import { goalProbability } from "./goalProbability";
import { generateMatchReport } from "./generateMatchReport";
import { calculateMatchRewards } from "../rewards/calculateMatchRewards";
import { aggregatePlayerMatchStats } from "./playerMatchStats";
import { calculatePlayerMatchRatings } from "./playerMatchRatings";
import {
  calculateChanceCreationChance,
  calculateChanceQualityMultiplier,
  getEventVolumeModifier,
  getTacticVolatility,
  pickWeightedChanceType
} from "./tacticalMatchEffects";
import {
  duelModifier,
  recipesForChanceType,
  scorePlayerDuel,
  scoreTeamDuel
} from "./contextualDuels";

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
type StarterCandidate = {
  player: Player;
  slotPosition: PlayerPosition;
};

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

function getOutfieldStarters(lineup: Lineup, gameState: GameState): Player[] {
  return lineup.starters
    .map((slot) => gameState.players[slot.playerId])
    .filter((player) => player && !isGoalkeeperStats(player.currentStats));
}

function getOutfieldStarterCandidates(lineup: Lineup, gameState: GameState): StarterCandidate[] {
  return lineup.starters
    .map((slot) => ({ player: gameState.players[slot.playerId], slotPosition: slot.position }))
    .filter(({ player }) => player && !isGoalkeeperStats(player.currentStats));
}

function chanceTypeSkill(
  player: Player,
  chanceType: ChanceType,
  tactic?: Tactic,
  minute = 1,
  slotPosition?: PlayerPosition
): number {
  if (isGoalkeeperStats(player.currentStats)) return 1;
  const recipe = recipesForChanceType(chanceType).attack;

  return scorePlayerDuel({
    player,
    recipe,
    tactic: tactic ?? { id: "fallback", name: "Fallback", formation: "4-4-2", focus: "balanced", riskLevel: "balanced", instructions: [] },
    minute,
    slotPosition
  });
}

function pickAttacker(
  lineup: Lineup,
  gameState: GameState,
  chanceType: ChanceType,
  tactic: Tactic,
  minute: number,
  rng: RandomSource
): Player {
  const candidates = getOutfieldStarterCandidates(lineup, gameState).sort(
    (a, b) =>
      chanceTypeSkill(b.player, chanceType, tactic, minute, b.slotPosition) -
      chanceTypeSkill(a.player, chanceType, tactic, minute, a.slotPosition)
  );
  const topCandidates = candidates.slice(0, Math.min(4, candidates.length));
  return pickOne(topCandidates, rng).player;
}

function pickChanceCreator(
  lineup: Lineup,
  shooter: Player | undefined,
  gameState: GameState,
  chanceType: ChanceType,
  tactic: Tactic,
  minute: number
): Player | undefined {
  const recipe =
    chanceType === "fast_breakaway"
      ? recipesForChanceType(chanceType).attack
      : chanceType === "wide_cross"
        ? recipesForChanceType(chanceType).attack
        : { PAS: 1.25, TEC: 1.1, POS: 1, DRI: 0.7, MEN: 0.8 };
  const candidates = getOutfieldStarterCandidates(lineup, gameState)
    .filter(({ player }) => player.id !== shooter?.id)
    .sort((a, b) =>
      scorePlayerDuel({ player: b.player, recipe, tactic, minute, slotPosition: b.slotPosition }) -
      scorePlayerDuel({ player: a.player, recipe, tactic, minute, slotPosition: a.slotPosition })
    );
  if (candidates.length === 0) return shooter;

  return candidates[0].player;
}

function pickGoalkeeper(lineup: Lineup, gameState: GameState): Player | undefined {
  return lineup.starters
    .map((slot) => gameState.players[slot.playerId])
    .find((player) => player && isGoalkeeperStats(player.currentStats));
}

function pickDefensivePlayer(
  lineup: Lineup,
  gameState: GameState,
  rng: RandomSource,
  tactic?: Tactic,
  minute = 1,
  chanceType: ChanceType = "sustained_pressure"
): Player | undefined {
  const recipe = recipesForChanceType(chanceType).defence;
  const candidates = lineup.starters
    .filter((slot) => ["CB", "LB", "RB", "WB", "DM", "CM"].includes(slot.position))
    .map((slot) => ({ player: gameState.players[slot.playerId], slotPosition: slot.position }))
    .filter(({ player }) => player && !isGoalkeeperStats(player.currentStats))
    .sort((a, b) =>
      scorePlayerDuel({
        player: b.player,
        recipe,
        tactic: tactic ?? { id: "fallback", name: "Fallback", formation: "4-4-2", focus: "balanced", riskLevel: "balanced", instructions: [] },
        minute,
        slotPosition: b.slotPosition
      }) -
      scorePlayerDuel({
        player: a.player,
        recipe,
        tactic: tactic ?? { id: "fallback", name: "Fallback", formation: "4-4-2", focus: "balanced", riskLevel: "balanced", instructions: [] },
        minute,
        slotPosition: a.slotPosition
      })
    );

  if (candidates.length === 0) return undefined;
  return pickOne(candidates.slice(0, Math.min(4, candidates.length)), rng).player;
}

function goalkeeperStrengthWithPressure(strength: number, pressure: number): number {
  return strength * (1 - Math.min(pressure * 0.02, 0.15));
}

function baseXgForChanceType(chanceType: ChanceType, rng: RandomSource): number {
  if (chanceType === "fast_breakaway") return 0.2 + rng() * 0.15;
  if (chanceType === "wide_cross") return 0.08 + rng() * 0.1;
  if (chanceType === "rebound_big_chance") return 0.35 + rng() * 0.25;
  return 0.1 + rng() * 0.15;
}

function addShotOutcome(options: {
  events: MatchEvent[];
  stats: MutableMatchStats;
  opponentStats: MutableMatchStats;
  attackingClub: Club;
  attackingLineup: Lineup;
  attackingTactic: Tactic;
  defendingClub: Club;
  defendingLineup: Lineup;
  defendingTactic: Tactic;
  defendingGoalkeeperStrength: number;
  goalkeeperPressure: number;
  minute: number;
  chanceType: ChanceType;
  duelQualityModifier: number;
  gameState: GameState;
  rng: RandomSource;
}): boolean {
  const {
    events,
    stats,
    opponentStats,
    attackingClub,
    attackingLineup,
    attackingTactic,
    defendingClub,
    defendingLineup,
    defendingTactic,
    defendingGoalkeeperStrength,
    goalkeeperPressure,
    minute,
    chanceType,
    duelQualityModifier,
    gameState,
    rng
  } = options;
  const attacker = pickAttacker(attackingLineup, gameState, chanceType, attackingTactic, minute, rng);
  const creator = pickChanceCreator(attackingLineup, attacker, gameState, chanceType, attackingTactic, minute) ?? attacker;
  const defendingGoalkeeper = pickGoalkeeper(defendingLineup, gameState);
  const attackerSlot = attackingLineup.starters.find((slot) => slot.playerId === attacker.id)?.position;
  const creatorSlot = attackingLineup.starters.find((slot) => slot.playerId === creator.id)?.position;
  const attackerSkill = chanceTypeSkill(attacker, chanceType, attackingTactic, minute, attackerSlot);
  const creatorSkill = chanceTypeSkill(creator, chanceType, attackingTactic, minute, creatorSlot);
  const qualityMultiplier = calculateChanceQualityMultiplier({
    chanceType,
    attackingTactic,
    defendingTactic,
    attackerSkill,
    creatorSkill,
    duelQualityModifier
  });
  const baseXg = baseXgForChanceType(chanceType, rng) * qualityMultiplier;
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
  const volatilitySwing = Math.round(
    Math.abs(getTacticVolatility(homeTactic) + getTacticVolatility(awayTactic)) * 35
  );
  const totalEvents = clamp(
    randomInt(20, 40, rng) +
      getEventVolumeModifier(homeTactic) +
      getEventVolumeModifier(awayTactic) +
      (volatilitySwing > 0 ? randomInt(-volatilitySwing, volatilitySwing, rng) : 0),
    14,
    52
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
    const defendingTactic = homeControls ? awayTactic : homeTactic;
    const goalkeeperPressure = homeControls ? awayGoalkeeperPressure : homeGoalkeeperPressure;

    attackingStats.eventsWon += 1;
    const controlPlayer = pickChanceCreator(
      attackingLineup,
      undefined,
      gameState,
      "sustained_pressure",
      attackingTactic,
      minute
    );
    events.push({
      minute,
      type: "event_control",
      clubId: attackingClub.id,
      playerId: controlPlayer?.id,
      description: `${attackingClub.name} gain control in midfield.`
    });

    const chanceType = pickWeightedChanceType(attackingTactic, defendingTactic, rng);
    const recipes = recipesForChanceType(chanceType);
    const attackingDuelScore = scoreTeamDuel({
      lineup: attackingLineup,
      gameState,
      recipe: recipes.attack,
      tactic: attackingTactic,
      minute,
      preferredSlots: chanceType === "wide_cross" ? ["WB", "LW", "RW", "LB", "RB"] : chanceType === "fast_breakaway" ? ["ST", "LW", "RW", "AM"] : undefined
    });
    const defendingDuelScore = scoreTeamDuel({
      lineup: defendingLineup,
      gameState,
      recipe: recipes.defence,
      tactic: defendingTactic,
      minute,
      preferredSlots: chanceType === "wide_cross" ? ["WB", "LB", "RB", "CB"] : chanceType === "fast_breakaway" ? ["CB", "LB", "RB", "DM"] : undefined
    });
    const chanceDuelModifier = duelModifier(attackingDuelScore, defendingDuelScore);
    const chanceCreated =
      rng() <= calculateChanceCreationChance(
        attackingPhase,
        defendingPhase,
        attackingTactic,
        defendingTactic,
        chanceDuelModifier
      );
    if (!chanceCreated) {
      if (rng() < 0.35) {
        const defender = pickDefensivePlayer(defendingLineup, gameState, rng, defendingTactic, minute, chanceType);
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

    attackingStats.chancesCreated += 1;
    attackingStats.chanceTypeBreakdown[chanceType] += 1;

    const scored = addShotOutcome({
      events,
      stats: attackingStats,
      opponentStats: defendingStats,
      attackingClub,
      attackingLineup,
      attackingTactic,
      defendingClub,
      defendingLineup,
      defendingTactic,
      defendingGoalkeeperStrength,
      goalkeeperPressure,
      minute,
      chanceType,
      duelQualityModifier: chanceDuelModifier,
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
        playerId: pickAttacker(attackingLineup, gameState, "rebound_big_chance", attackingTactic, clamp(minute + 1, 1, 90), rng).id,
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
        attackingTactic,
        defendingClub,
        defendingLineup,
        defendingTactic,
        defendingGoalkeeperStrength,
        goalkeeperPressure: goalkeeperPressure + 2,
        minute: clamp(minute + 1, 1, 90),
        chanceType: "rebound_big_chance",
        duelQualityModifier: duelModifier(
          scoreTeamDuel({
            lineup: attackingLineup,
            gameState,
            recipe: recipesForChanceType("rebound_big_chance").attack,
            tactic: attackingTactic,
            minute: clamp(minute + 1, 1, 90),
            preferredSlots: ["ST", "AM", "LW", "RW"]
          }),
          scoreTeamDuel({
            lineup: defendingLineup,
            gameState,
            recipe: recipesForChanceType("rebound_big_chance").defence,
            tactic: defendingTactic,
            minute: clamp(minute + 1, 1, 90),
            preferredSlots: ["CB", "LB", "RB", "DM"]
          })
        ),
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
