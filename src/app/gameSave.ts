import type { GameState } from "../domain/types/game";

export const gameSaveStorageKey = "incremental-fc-save-v5";

type StoredGameSave = {
  version: 5;
  savedAt: string;
  gameState: GameState;
};

type LegacyStoredGameSave = {
  version: number;
};

export type GameSaveInfo = {
  savedAt: string;
};

function getStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

function parseStoredSave(rawSave: string | null): StoredGameSave | undefined {
  if (!rawSave) return undefined;
  try {
    const save = JSON.parse(rawSave) as Partial<StoredGameSave>;
    if (save.version !== 5 || typeof save.savedAt !== "string" || !save.gameState) return undefined;
    const clubs = Object.values(save.gameState.clubs ?? {});
    if (!clubs.every((club) => Array.isArray(club.economy?.transactions))) return undefined;
    return save as StoredGameSave;
  } catch {
    return undefined;
  }
}

function readStoredSave(): StoredGameSave | undefined {
  try {
    return parseStoredSave(getStorage()?.getItem(gameSaveStorageKey) ?? null);
  } catch {
    return undefined;
  }
}

export function saveGameToLocalStorage(gameState: GameState): GameSaveInfo | undefined {
  const storage = getStorage();
  if (!storage) return undefined;
  const save: StoredGameSave = {
    version: 5,
    savedAt: new Date().toISOString(),
    gameState
  };
  try {
    storage.setItem(gameSaveStorageKey, JSON.stringify(save));
    return { savedAt: save.savedAt };
  } catch {
    return undefined;
  }
}

export function loadGameFromLocalStorage(): GameState | undefined {
  return readStoredSave()?.gameState;
}

export function getLocalGameSaveInfo(): GameSaveInfo | undefined {
  const save = readStoredSave();
  return save ? { savedAt: save.savedAt } : undefined;
}
