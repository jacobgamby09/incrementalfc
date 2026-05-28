import { describe, expect, it } from "vitest";
import { goalkeeperStatKeys, outfieldStatKeys } from "../types/player";
import { getStatDefinition, statTooltip } from "./statDefinitions";

describe("stat definitions", () => {
  it("defines every player stat key with readable match usage", () => {
    for (const key of [...outfieldStatKeys, ...goalkeeperStatKeys]) {
      const definition = getStatDefinition(key);

      expect(definition).toBeDefined();
      expect(definition?.code).toBe(key);
      expect(definition?.name.length).toBeGreaterThan(0);
      expect(definition?.description.length).toBeGreaterThan(0);
      expect(definition?.matchEngineUsage.length).toBeGreaterThan(0);
      expect(statTooltip(key)).toContain(definition!.name);
    }
  });
});
