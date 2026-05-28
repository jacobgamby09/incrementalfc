import { describe, expect, it, vi } from "vitest";
import { confirmNewGame, newGameConfirmationMessage } from "./newGameConfirmation";

describe("new game confirmation", () => {
  it("requires confirmation before resetting", () => {
    const confirmFn = vi.fn(() => true);

    expect(confirmNewGame(confirmFn)).toBe(true);
    expect(confirmFn).toHaveBeenCalledWith(newGameConfirmationMessage);
  });

  it("can cancel a new game reset", () => {
    expect(confirmNewGame(() => false)).toBe(false);
  });
});
