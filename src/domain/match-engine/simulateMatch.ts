import { createId, pickOne, randomInt, type RandomSource } from "../../utils/random";
import { clamp, roundTo } from "../../utils/math";
import type { Club } from "../types/club";
import type { Fixture } from "../types/league";
import type {
  ChanceType,
  Match,
  MatchEvent,
  MatchRewards,
  MatchTeamStats,
  SetPieceChanceType
} from "../types/match";
import { isGoalkeeperStats, type GoalkeeperStats, type Player } from "../types/player";
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
import { creatorSkill, finisherSkill, pickCreator, pickFinisher } from "./chanceParticipants";
import { createsDangerousCornerAfterSave, pickSetPieceAfterFailedAttack } from "./setPieces";

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
  rebound_big_chance: "rebound chance",
  corner: "corner",
  indirect_free_kick: "free kick delivery",
  direct_free_kick: "direct free kick",
  penalty: "penalty"
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
      rebound_big_chance: 0,
      corner: 0,
      indirect_free_kick: 0,
      direct_free_kick: 0,
      penalty: 0
    }
  };
}

function pickChanceCreator(
  lineup: Lineup,
  shooter: Player | undefined,
  gameState: GameState,
  chanceType: ChanceType,
  tactic: Tactic,
  minute: number,
  rng: RandomSource
): Player | undefined {
  return pickCreator(lineup, shooter, gameState, chanceType, tactic, minute, rng);
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

function goalkeeperStrengthForChanceType(
  fallbackStrength: number,
  goalkeeper: Player | undefined,
  chanceType: ChanceType
): number {
  if (!goalkeeper || !isGoalkeeperStats(goalkeeper.currentStats)) return fallbackStrength;
  const stats: GoalkeeperStats = goalkeeper.currentStats;
  if (chanceType === "corner" || chanceType === "indirect_free_kick") {
    return stats.HAN * 0.5 + stats.MEN * 0.3 + stats.REF * 0.2;
  }
  if (chanceType === "direct_free_kick") {
    return stats.REF * 0.55 + stats.MEN * 0.25 + stats.HAN * 0.2;
  }
  if (chanceType === "penalty") {
    return stats.REF * 0.55 + stats.MEN * 0.45;
  }
  return fallbackStrength;
}

function baseXgForChanceType(chanceType: ChanceType, rng: RandomSource): number {
  if (chanceType === "fast_breakaway") return 0.2 + rng() * 0.15;
  if (chanceType === "wide_cross") return 0.08 + rng() * 0.1;
  if (chanceType === "rebound_big_chance") return 0.35 + rng() * 0.25;
  if (chanceType === "corner") return 0.06 + rng() * 0.07;
  if (chanceType === "indirect_free_kick") return 0.05 + rng() * 0.07;
  if (chanceType === "direct_free_kick") return 0.06 + rng() * 0.09;
  if (chanceType === "penalty") return 0.72 + rng() * 0.1;
  return 0.1 + rng() * 0.15;
}

function chanceDescription(chanceType: ChanceType, creator: Player, attackingClub: Club): string {
  const creatorName = `${creator.firstName} ${creator.lastName}`;
  if (chanceType === "corner") return `${creatorName} delivers a corner for ${attackingClub.name}.`;
  if (chanceType === "indirect_free_kick") return `${creatorName} delivers an indirect free kick for ${attackingClub.name}.`;
  if (chanceType === "direct_free_kick") return `${creatorName} lines up a direct free kick for ${attackingClub.name}.`;
  if (chanceType === "penalty") return `${creatorName} steps up to take a penalty for ${attackingClub.name}.`;
  return `${creatorName} opens up a ${chanceTypeDescriptions[chanceType]} for ${attackingClub.name}.`;
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
  const attacker = pickFinisher(attackingLineup, gameState, chanceType, attackingTactic, minute, rng);
  const creator = pickChanceCreator(attackingLineup, attacker, gameState, chanceType, attackingTactic, minute, rng) ?? attacker;
  const defendingGoalkeeper = pickGoalkeeper(defendingLineup, gameState);
  const attackerSlot = attackingLineup.starters.find((slot) => slot.playerId === attacker.id)?.position;
  const creatorSlot = attackingLineup.starters.find((slot) => slot.playerId === creator.id)?.position;
  const attackerSkill = finisherSkill(attacker, attackerSlot ?? attacker.primaryPosition, chanceType, attackingTactic, minute);
  const chanceCreatorSkill = creatorSkill(creator, creatorSlot ?? creator.primaryPosition, chanceType, attackingTactic, minute);
  const qualityMultiplier = calculateChanceQualityMultiplier({
    chanceType,
    attackingTactic,
    defendingTactic,
    attackerSkill,
    creatorSkill: chanceCreatorSkill,
    duelQualityModifier
  });
  const baseXg = baseXgForChanceType(chanceType, rng) * qualityMultiplier;
  const effectiveGoalkeeper = goalkeeperStrengthWithPressure(
    goalkeeperStrengthForChanceType(defendingGoalkeeperStrength, defendingGoalkeeper, chanceType),
    goalkeeperPressure
  );
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
    description: chanceDescription(chanceType, creator, attackingClub),
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
      secondaryPlayerId:
        creator.id !== attacker.id && chanceType !== "penalty" && chanceType !== "direct_free_kick"
          ? creator.id
          : undefined,
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

function addSetPieceOutcome(options: {
  chanceType: SetPieceChanceType;
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
  gameState: GameState;
  rng: RandomSource;
}): boolean {
  options.stats.chancesCreated += 1;
  options.stats.chanceTypeBreakdown[options.chanceType] += 1;

  return addShotOutcome({
    ...options,
    duelQualityModifier: duelModifier(
      scoreTeamDuel({
        lineup: options.attackingLineup,
        gameState: options.gameState,
        recipe: recipesForChanceType(options.chanceType).attack,
        tactic: options.attackingTactic,
        minute: options.minute,
        preferredSlots:
          options.chanceType === "corner" || options.chanceType === "indirect_free_kick"
            ? ["CB", "ST", "DM"]
            : ["ST", "AM", "LW", "RW", "CM"]
      }),
      scoreTeamDuel({
        lineup: options.defendingLineup,
        gameState: options.gameState,
        recipe: recipesForChanceType(options.chanceType).defence,
        tactic: options.defendingTactic,
        minute: options.minute,
        preferredSlots: ["CB", "DM", "LB", "RB"]
      })
    )
  });
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
      minute,
      rng
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
      const setPieceType = pickSetPieceAfterFailedAttack(defendingTactic, rng);
      if (setPieceType) {
        const scoredSetPiece = addSetPieceOutcome({
          chanceType: setPieceType,
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
          gameState,
          rng
        });
        if (!scoredSetPiece) {
          if (homeControls) awayGoalkeeperPressure += 1;
          else homeGoalkeeperPressure += 1;
        }
        continue;
      }
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
        playerId: pickFinisher(attackingLineup, gameState, "rebound_big_chance", attackingTactic, clamp(minute + 1, 1, 90), rng).id,
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
    } else if (!scored && createsDangerousCornerAfterSave(rng)) {
      addSetPieceOutcome({
        chanceType: "corner",
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
        goalkeeperPressure: goalkeeperPressure + 1,
        minute: clamp(minute + 1, 1, 90),
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
