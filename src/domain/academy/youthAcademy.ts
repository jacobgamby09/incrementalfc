import { getFacilityLevelConfig } from "../../data/constants/facilityProfiles";
import type { GameState } from "../types/game";
import type { Player, PlayerPosition } from "../types/player";
import { pickOne, randomInt, type RandomSource } from "../../utils/random";
import { ensurePlayerNameRegistry, generateUniquelyNamedPlayer } from "../generation/playerNameRegistry";

const prospectPositions: PlayerPosition[] = ["GK", "CB", "LB", "RB", "DM", "CM", "AM", "LW", "RW", "ST"];

export function applyYouthPotentialBias(player: Player, bias: number, rarePotentialMax: number, rng: RandomSource): Player {
  const potentialStats = { ...player.potentialStats };
  for (const key of Object.keys(potentialStats) as Array<keyof typeof potentialStats>) {
    if (rng() < bias) {
      potentialStats[key] = Math.min(rarePotentialMax, Number(potentialStats[key]) + 1) as never;
    }
  }
  return { ...player, potentialStats };
}

export function advanceYouthAcademy(gameState: GameState, weeks = 1, rng: RandomSource = Math.random): GameState {
  const club = gameState.clubs[gameState.playerClubId];
  if (club.academy.pendingProspect) return gameState;
  const config = getFacilityLevelConfig("youthAcademy", club.facilities.youthAcademy.level);
  const gained = (config.effects.intakeProgressPerWeek ?? 0) * weeks;
  const nextProgress = club.academy.prospectGenerationProgress + gained;
  if (nextProgress < 100) {
    return {
      ...gameState,
      clubs: {
        ...gameState.clubs,
        [club.id]: { ...club, academy: { ...club.academy, prospectGenerationProgress: nextProgress } }
      }
    };
  }

  const league = gameState.leagues[club.leagueId];
  const prospectAge = randomInt(16, 18, rng);
  const nameRegistry = ensurePlayerNameRegistry(gameState.nameRegistry, gameState.players);
  let prospect = generateUniquelyNamedPlayer({
    clubId: "academy_preview",
    position: pickOne(prospectPositions, rng),
    statRange: league.playerStatRange,
    age: prospectAge,
    leagueLevel: league.level,
    rng
  }, nameRegistry);
  prospect = applyYouthPotentialBias(prospect, config.effects.youthPotentialBonus ?? 0, league.rarePotentialMax, rng);
  prospect.clubId = null;
  prospect.contract = {
    ...prospect.contract,
    wagePerWeek: Math.max(80, Math.round(prospect.contract.wagePerWeek * 0.65))
  };

  return {
    ...gameState,
    clubs: {
      ...gameState.clubs,
      [club.id]: {
        ...club,
        academy: {
          ...club.academy,
          prospectGenerationProgress: nextProgress - 100,
          pendingProspect: prospect
        }
      }
    },
    nameRegistry
  };
}

export function resolveYouthProspect(gameState: GameState, sign: boolean): GameState {
  const club = gameState.clubs[gameState.playerClubId];
  const prospect = club.academy.pendingProspect;
  if (!prospect) return gameState;
  if (!sign) {
    return {
      ...gameState,
      clubs: {
        ...gameState.clubs,
        [club.id]: { ...club, academy: { ...club.academy, pendingProspect: null } }
      }
    };
  }
  const signedProspect = { ...prospect, clubId: club.id };
  return {
    ...gameState,
    players: { ...gameState.players, [signedProspect.id]: signedProspect },
    clubs: {
      ...gameState.clubs,
      [club.id]: {
        ...club,
        squadPlayerIds: [...club.squadPlayerIds, signedProspect.id],
        academy: { ...club.academy, pendingProspect: null }
      }
    }
  };
}
