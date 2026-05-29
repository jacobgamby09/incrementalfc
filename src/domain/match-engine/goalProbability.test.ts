import { describe, expect, it } from "vitest";
import { goalProbability } from "./goalProbability";

describe("goalProbability", () => {
  it("gives stronger shooters a larger but still realistic advantage", () => {
    const weakShooter = goalProbability(0.2, 3, 9);
    const evenDuel = goalProbability(0.2, 6, 6);
    const strongShooter = goalProbability(0.2, 9, 3);

    expect(strongShooter).toBeGreaterThan(evenDuel);
    expect(evenDuel).toBeGreaterThan(weakShooter);
    expect(strongShooter).toBeLessThan(0.35);
  });
});
