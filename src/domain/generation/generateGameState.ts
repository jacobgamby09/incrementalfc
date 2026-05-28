import type { GameState } from "../types/game";
import type { Club } from "../types/club";
import type { Player } from "../types/player";
import type { Season } from "../types/league";
import { createId, type RandomSource } from "../../utils/random";
import { generateClub } from "./generateClub";
import { generateFixtures } from "./generateFixtures";
import { createEmptyTable, generateLeague } from "./generateLeague";

const clubNames = [
  ["Incremental FC", "IFC"],
  ["Ashford Borough", "ASH"],
  ["Brindle Town", "BRI"],
  ["Cedar Athletic", "CED"],
  ["Dunmere Rovers", "DUN"],
  ["Eastvale United", "EAS"],
  ["Fellbridge Albion", "FEL"],
  ["Greyford City", "GRE"],
  ["Holloway Rangers", "HOL"],
  ["Kingsport Wanderers", "KIN"]
] as const;

export function generateGameState(rng: RandomSource = Math.random): GameState {
  const provisionalClubIds = clubNames.map((_, index) => `club_seed_${index + 1}`);
  const league = generateLeague(provisionalClubIds);
  const clubs: Record<string, Club> = {};
  const players: Record<string, Player> = {};
  let playerClubId = "";

  for (const [index, [name, shortName]] of clubNames.entries()) {
    const generated = generateClub({
      name,
      shortName,
      league,
      isPlayerClub: index === 0,
      rng
    });

    clubs[generated.club.id] = generated.club;
    Object.assign(players, generated.players);

    if (index === 0) {
      playerClubId = generated.club.id;
    }
  }

  const realClubIds = Object.keys(clubs);
  const activeLeague = {
    ...league,
    clubIds: realClubIds
  };
  const seasonId = createId("season", rng);
  const season: Season = {
    id: seasonId,
    seasonNumber: 1,
    leagueId: activeLeague.id,
    clubIds: realClubIds,
    fixtures: generateFixtures(realClubIds, seasonId),
    table: createEmptyTable(realClubIds),
    currentMatchday: 1,
    status: "active",
    rewardsPaid: false
  };

  for (const club of Object.values(clubs)) {
    club.leagueId = activeLeague.id;
  }

  return {
    gameId: createId("game", rng),
    createdAt: new Date().toISOString(),
    currentDate: {
      seasonNumber: 1,
      week: 1,
      phase: "regularSeason"
    },
    currentSeasonId: season.id,
    playerClubId,
    clubs,
    leagues: {
      [activeLeague.id]: activeLeague
    },
    seasons: {
      [season.id]: season
    },
    players,
    matches: {},
    settings: {
      currency: "GBP",
      autosave: false
    },
    history: {
      seasonsCompleted: 0,
      notes: ["Generated Milestone 1 world."]
    }
  };
}
