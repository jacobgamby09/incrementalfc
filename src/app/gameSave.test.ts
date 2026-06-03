import { beforeEach, describe, expect, it } from "vitest";
import { generateGameState } from "../domain/generation/generateGameState";
import {
  gameSaveStorageKey,
  getLocalGameSaveInfo,
  loadGameFromLocalStorage,
  saveGameToLocalStorage
} from "./gameSave";

describe("browser game save", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips a game state through local storage", () => {
    const gameState = generateGameState();

    const info = saveGameToLocalStorage(gameState);

    expect(info?.savedAt).toBeTruthy();
    expect(loadGameFromLocalStorage()).toEqual(gameState);
    expect(getLocalGameSaveInfo()).toEqual(info);
  });

  it("ignores malformed or unsupported saves", () => {
    localStorage.setItem(gameSaveStorageKey, "{not-json");
    expect(loadGameFromLocalStorage()).toBeUndefined();

    localStorage.setItem(gameSaveStorageKey, JSON.stringify({ version: 3, savedAt: new Date().toISOString(), gameState: {} }));
    expect(loadGameFromLocalStorage()).toBeUndefined();

    localStorage.setItem(gameSaveStorageKey, JSON.stringify({
      version: 4,
      savedAt: new Date().toISOString(),
      gameState: {
        clubs: {
          invalid_club: {
            economy: {}
          }
        }
      }
    }));
    expect(loadGameFromLocalStorage()).toBeUndefined();
  });
});
