import type { Club } from "../types/club";
import type { MatchResultCode } from "../types/club";
import type { GameState } from "../types/game";
import type { Fixture, Season } from "../types/league";
import type { Match } from "../types/match";
import type { Lineup, Tactic } from "../types/tactics";
import { autoSelectLineup } from "../lineup/selectLineup";
import { simulateMatch } from "../match-engine/simulateMatch";
import { applyMatchRewards } from "../rewards/applyMatchRewards";
import { runTraining } from "../development/playerDevelopment";
import { getTacticKey } from "../tactics/tacticFamiliarity";
import { updateLeagueTable } from "./updateLeagueTable";
import type { RandomSource } from "../../utils/random";

type PlayMatchdayOptions = {
  gameState: GameState;
  fixtureId: string;
  playerLineup: Lineup;
  playerTactic: Tactic;
  rng?: RandomSource;
};

type PlayMatchdayResult = {
  gameState: GameState;
  playerMatchId: string;
};

function upsertTactic(club: Club, tactic: Tactic): Club {
  const savedTactics = club.tactics.savedTactics.some((savedTactic) => savedTactic.id === tactic.id)
    ? club.tactics.savedTactics.map((savedTactic) => (savedTactic.id === tactic.id ? tactic : savedTactic))
    : [...club.tactics.savedTactics, tactic];

  return {
    ...club,
    tactics: {
      ...club.tactics,
      activeTactic: tactic,
      savedTactics,
      familiarityByTacticId: {
        ...club.tactics.familiarityByTacticId,
        [getTacticKey(tactic)]: club.tactics.familiarityByTacticId[getTacticKey(tactic)] ?? club.tactics.familiarityByTacticId[tactic.id] ?? 50
      }
    }
  };
}

function markFixturePlayed(fixtures: Fixture[], fixtureId: string, matchId: string): Fixture[] {
  return fixtures.map((fixture) =>
    fixture.id === fixtureId
      ? {
          ...fixture,
          matchId,
          status: "played"
        }
      : fixture
  );
}

function updateClubSeasonStats(club: Club, goalsFor: number, goalsAgainst: number): Club {
  const result: MatchResultCode = goalsFor > goalsAgainst ? "W" : goalsFor === goalsAgainst ? "D" : "L";
  return {
    ...club,
    seasonStats: {
      ...club.seasonStats,
      matchesPlayed: club.seasonStats.matchesPlayed + 1,
      wins: club.seasonStats.wins + (result === "W" ? 1 : 0),
      draws: club.seasonStats.draws + (result === "D" ? 1 : 0),
      losses: club.seasonStats.losses + (result === "L" ? 1 : 0),
      goalsFor: club.seasonStats.goalsFor + goalsFor,
      goalsAgainst: club.seasonStats.goalsAgainst + goalsAgainst,
      points: club.seasonStats.points + (result === "W" ? 3 : result === "D" ? 1 : 0),
      formLastFive: [result, ...club.seasonStats.formLastFive].slice(0, 5)
    }
  };
}

function applyMatchToSeason(gameState: GameState, season: Season, match: Match): GameState {
  const nextSeason: Season = {
    ...season,
    fixtures: markFixturePlayed(season.fixtures, match.fixtureId, match.id),
    table: updateLeagueTable(season.table, match)
  };
  const homeClub = updateClubSeasonStats(
    gameState.clubs[match.homeClubId],
    match.result.homeGoals,
    match.result.awayGoals
  );
  const awayClub = updateClubSeasonStats(
    gameState.clubs[match.awayClubId],
    match.result.awayGoals,
    match.result.homeGoals
  );

  return {
    ...gameState,
    clubs: {
      ...gameState.clubs,
      [homeClub.id]: homeClub,
      [awayClub.id]: awayClub
    },
    seasons: {
      ...gameState.seasons,
      [season.id]: nextSeason
    },
    matches: {
      ...gameState.matches,
      [match.id]: match
    }
  };
}

function maybeAdvanceMatchday(gameState: GameState): GameState {
  const season = gameState.seasons[gameState.currentSeasonId];
  const currentMatchdayFixtures = season.fixtures.filter(
    (fixture) => fixture.matchday === season.currentMatchday
  );
  const allPlayed = currentMatchdayFixtures.every((fixture) => fixture.status === "played");
  if (!allPlayed) return gameState;

  const nextMatchday = season.currentMatchday + 1;
  const seasonCompleted = nextMatchday > 18;
  const nextSeason: Season = {
    ...season,
    currentMatchday: seasonCompleted ? season.currentMatchday : nextMatchday,
    status: seasonCompleted ? "completed" : season.status
  };

  return {
    ...gameState,
    currentDate: {
      ...gameState.currentDate,
      week: seasonCompleted ? gameState.currentDate.week : gameState.currentDate.week + 1,
      phase: seasonCompleted ? "postseason" : gameState.currentDate.phase
    },
    seasons: {
      ...gameState.seasons,
      [season.id]: nextSeason
    }
  };
}

function simulateFixture(
  gameState: GameState,
  fixture: Fixture,
  playerLineup: Lineup | undefined,
  playerTactic: Tactic | undefined,
  rng: RandomSource
): Match {
  const homeClub = gameState.clubs[fixture.homeClubId];
  const awayClub = gameState.clubs[fixture.awayClubId];
  const playerClubId = gameState.playerClubId;
  const homeTactic =
    fixture.homeClubId === playerClubId && playerTactic ? playerTactic : homeClub.tactics.activeTactic;
  const awayTactic =
    fixture.awayClubId === playerClubId && playerTactic ? playerTactic : awayClub.tactics.activeTactic;
  const homeLineup =
    fixture.homeClubId === playerClubId && playerLineup
      ? playerLineup
      : autoSelectLineup(homeClub, gameState, homeTactic);
  const awayLineup =
    fixture.awayClubId === playerClubId && playerLineup
      ? playerLineup
      : autoSelectLineup(awayClub, gameState, awayTactic);

  return simulateMatch({
    fixture,
    homeClub,
    awayClub,
    homeLineup,
    awayLineup,
    homeTactic,
    awayTactic,
    gameState,
    reportingClubId:
      fixture.homeClubId === playerClubId || fixture.awayClubId === playerClubId ? playerClubId : fixture.homeClubId,
    rng
  });
}

export function playMatchday({
  gameState,
  fixtureId,
  playerLineup,
  playerTactic,
  rng = Math.random
}: PlayMatchdayOptions): PlayMatchdayResult {
  const season = gameState.seasons[gameState.currentSeasonId];
  const selectedFixture = season.fixtures.find((fixture) => fixture.id === fixtureId);
  if (!selectedFixture) {
    throw new Error(`Fixture ${fixtureId} was not found.`);
  }
  if (selectedFixture.status === "played") {
    throw new Error(`Fixture ${fixtureId} has already been played.`);
  }
  if (selectedFixture.homeClubId !== gameState.playerClubId && selectedFixture.awayClubId !== gameState.playerClubId) {
    throw new Error("Selected fixture must involve the player club.");
  }

  let nextGameState: GameState = {
    ...gameState,
    clubs: {
      ...gameState.clubs,
      [gameState.playerClubId]: upsertTactic(gameState.clubs[gameState.playerClubId], playerTactic)
    }
  };
  const playerMatch = simulateFixture(nextGameState, selectedFixture, playerLineup, playerTactic, rng);
  nextGameState = applyMatchToSeason(nextGameState, nextGameState.seasons[nextGameState.currentSeasonId], playerMatch);
  nextGameState = applyMatchRewards(nextGameState, gameState.playerClubId, playerMatch);

  const currentSeason = nextGameState.seasons[nextGameState.currentSeasonId];
  const remainingMatchdayFixtures = currentSeason.fixtures.filter(
    (fixture) => fixture.matchday === selectedFixture.matchday && fixture.status === "scheduled"
  );

  for (const fixture of remainingMatchdayFixtures) {
    const match = simulateFixture(nextGameState, fixture, undefined, undefined, rng);
    nextGameState = applyMatchToSeason(nextGameState, nextGameState.seasons[nextGameState.currentSeasonId], match);
  }

  const trainingClub = nextGameState.clubs[nextGameState.playerClubId];
  const trainingResult = runTraining(nextGameState, trainingClub);
  const playerMatchWithDevelopment = nextGameState.matches[playerMatch.id];
  const developmentSummaries = Object.entries(trainingResult.trainingXpByPlayerId)
    .map(([playerId, trainingXp]) => {
      const player = trainingResult.players[playerId];
      if (!player) return undefined;
      return {
        playerId,
        playerName: `${player.firstName} ${player.lastName}`,
        matchXp: playerMatchWithDevelopment.rewards.playerXp[playerId]?.matchXp ?? 0,
        trainingXp,
        statGrowth: player.development.recentStatGrowth.filter((growth) => growth.matchId === playerMatch.id || growth.source === "training").slice(0, 3),
        notes: player.development.recentDevelopmentNotes
      };
    })
    .filter((summary): summary is NonNullable<typeof summary> => Boolean(summary));

  nextGameState = {
    ...nextGameState,
    players: trainingResult.players,
    matches: {
      ...nextGameState.matches,
      [playerMatch.id]: {
        ...playerMatchWithDevelopment,
        rewards: {
          ...playerMatchWithDevelopment.rewards,
          trainingXp: trainingResult.trainingXpByPlayerId,
          statGrowth: developmentSummaries
        }
      }
    }
  };

  nextGameState = maybeAdvanceMatchday(nextGameState);

  return {
    gameState: nextGameState,
    playerMatchId: playerMatch.id
  };
}
