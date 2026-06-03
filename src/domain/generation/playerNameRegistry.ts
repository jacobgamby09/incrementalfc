import type { Player } from "../types/player";
import type { PlayerNameRegistry } from "../types/game";
import type { GeneratePlayerOptions } from "./generatePlayer";
import { generatePlayer } from "./generatePlayer";
import { getNationalityProfile } from "../../data/constants/worldProfiles";

const surnameSoftCap = 12;
const surnameRetryLimit = 80;
const fullNameRetryLimit = 250;

export function playerFullName(player: Pick<Player, "firstName" | "lastName">): string {
  return `${player.firstName} ${player.lastName}`.trim().toLowerCase();
}

function cloneRegistry(registry: PlayerNameRegistry): PlayerNameRegistry {
  return {
    usedFullNames: [...registry.usedFullNames],
    surnameCounts: { ...registry.surnameCounts }
  };
}

export function createPlayerNameRegistry(players: Record<string, Player>): PlayerNameRegistry {
  const registry: PlayerNameRegistry = { usedFullNames: [], surnameCounts: {} };
  for (const player of Object.values(players)) {
    reservePlayerName(registry, player);
  }
  return registry;
}

export function ensurePlayerNameRegistry(
  registry: PlayerNameRegistry | undefined,
  players: Record<string, Player>
): PlayerNameRegistry {
  return registry ? cloneRegistry(registry) : createPlayerNameRegistry(players);
}

export function reservePlayerName(registry: PlayerNameRegistry, player: Pick<Player, "firstName" | "lastName">): void {
  const fullName = playerFullName(player);
  if (!registry.usedFullNames.includes(fullName)) {
    registry.usedFullNames.push(fullName);
  }
  registry.surnameCounts[player.lastName] = (registry.surnameCounts[player.lastName] ?? 0) + 1;
}

export function isPlayerNameAvailable(
  registry: PlayerNameRegistry,
  player: Pick<Player, "firstName" | "lastName">,
  enforceSurnameSoftCap = true
): boolean {
  if (registry.usedFullNames.includes(playerFullName(player))) return false;
  if (enforceSurnameSoftCap && (registry.surnameCounts[player.lastName] ?? 0) >= surnameSoftCap) return false;
  return true;
}

export function addNamedPlayerToRegistry<T extends Player>(registry: PlayerNameRegistry, player: T): T {
  reservePlayerName(registry, player);
  return player;
}

function findAvailableName(
  registry: PlayerNameRegistry,
  nationality: string,
  enforceSurnameSoftCap: boolean
): { firstName: string; lastName: string } | undefined {
  const profile = getNationalityProfile(nationality);
  for (const lastName of profile.lastNames) {
    if (enforceSurnameSoftCap && (registry.surnameCounts[lastName] ?? 0) >= surnameSoftCap) continue;
    for (const firstName of profile.firstNames) {
      if (!registry.usedFullNames.includes(`${firstName} ${lastName}`.trim().toLowerCase())) {
        return { firstName, lastName };
      }
    }
  }
  return undefined;
}

function renamePlayer(player: Player, firstName: string, lastName: string): Player {
  return {
    ...player,
    firstName,
    lastName,
    visualIdentity: {
      ...player.visualIdentity,
      portraitSeed: `${player.clubId ?? "unattached"}_${player.id}_${firstName}_${lastName}_${player.primaryPosition}`
    }
  };
}

export function generateUniquelyNamedPlayer(
  options: GeneratePlayerOptions,
  registry: PlayerNameRegistry
): Player {
  let basePlayer: Player | undefined;
  for (let attempt = 0; attempt < fullNameRetryLimit; attempt += 1) {
    const player = generatePlayer(options);
    basePlayer ??= player;
    const enforceSurnameSoftCap = attempt < surnameRetryLimit;
    if (isPlayerNameAvailable(registry, player, enforceSurnameSoftCap)) {
      reservePlayerName(registry, player);
      return player;
    }
  }

  const player = basePlayer ?? generatePlayer(options);
  const nationality = player.nationality ?? "England";
  const softCappedName = findAvailableName(registry, nationality, true);
  const availableName = softCappedName ?? findAvailableName(registry, nationality, false);
  if (availableName) {
    const renamedPlayer = renamePlayer(player, availableName.firstName, availableName.lastName);
    reservePlayerName(registry, renamedPlayer);
    return renamedPlayer;
  }

  throw new Error("Unable to generate a unique player name from the available nationality pools.");
}
