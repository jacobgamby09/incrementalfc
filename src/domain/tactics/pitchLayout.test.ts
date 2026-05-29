import { describe, expect, it } from "vitest";
import { formationPitchCoordinates, formationSlots, formations } from "../../data/constants/formations";
import { getOverlappingPitchCoordinates } from "./pitchLayout";

describe("pitch layout", () => {
  it("includes the expanded formation set", () => {
    expect(formations).toEqual(expect.arrayContaining(["5-3-2", "3-4-3", "3-4-2-1"]));
  });

  it("defines non-overlapping coordinates for every formation slot", () => {
    for (const formation of formations) {
      const coordinates = formationPitchCoordinates[formation];

      expect(coordinates).toHaveLength(formationSlots[formation].length);
      expect(coordinates).toHaveLength(11);
      expect(getOverlappingPitchCoordinates(coordinates)).toEqual([]);
    }
  });
});
