import type { GameState } from "../types/game";
import type { Club } from "../types/club";
import type { Player } from "../types/player";
import type { Season } from "../types/league";
import { createId, type RandomSource } from "../../utils/random";
import { generateClub } from "./generateClub";
import { generateFixtures } from "./generateFixtures";
import { createEmptyTable, generateLeague } from "./generateLeague";
import { createClosedTransferMarket } from "../transfers/transferWindow";
import { clubIdentitiesByLeagueLevel } from "../../data/constants/worldProfiles";
import { MAX_LEAGUE_LEVEL, MIN_LEAGUE_LEVEL, getLeagueIdForLevel } from "../../data/constants/leagueProfiles";
import type { PlayerNameRegistry } from "../types/game";

export function generateGameState(rng: RandomSource = Math.random): GameState {
  const clubs: Record<string, Club> = {};
  const players: Record<string, Player> = {};
  const leagues = {} as GameState["leagues"];
  const nameRegistry: PlayerNameRegistry = { usedFullNames: [], surnameCounts: {} };
  let playerClubId = "";

  for (let level = MIN_LEAGUE_LEVEL; level <= MAX_LEAGUE_LEVEL; level += 1) {
    const league = generateLeague([], level);
    const leagueClubIds: string[] = [];
    for (const [index, identity] of clubIdentitiesByLeagueLevel[level].entries()) {
      const isPlayerClub = level === MIN_LEAGUE_LEVEL && index === 0;
      const generated = generateClub({
        name: identity.name,
        shortName: identity.shortName,
        league,
        isPlayerClub,
        nameRegistry,
        rng
      });

      clubs[generated.club.id] = generated.club;
      Object.assign(players, generated.players);
      leagueClubIds.push(generated.club.id);

      if (isPlayerClub) playerClubId = generated.club.id;
    }
    leagues[league.id] = generateLeague(leagueClubIds, level);
  }

  const activeLeague = leagues[getLeagueIdForLevel(MIN_LEAGUE_LEVEL)];
  const seasonId = createId("season", rng);
  const season: Season = {
    id: seasonId,
    seasonNumber: 1,
    leagueId: activeLeague.id,
    clubIds: activeLeague.clubIds,
    fixtures: generateFixtures(activeLeague.clubIds, seasonId),
    table: createEmptyTable(activeLeague.clubIds),
    currentMatchday: 1,
    status: "active",
    rewardsPaid: false
  };

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
    leagues,
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
    },
    transferMarket: createClosedTransferMarket(),
    nameRegistry
  };
}
