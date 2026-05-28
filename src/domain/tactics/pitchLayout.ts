import type { PitchCoordinate } from "../../data/constants/formations";

export type PitchCardFootprint = {
  width: number;
  height: number;
};

export type PitchCoordinateOverlap = {
  firstIndex: number;
  secondIndex: number;
};

export const defaultPitchCardFootprint: PitchCardFootprint = {
  width: 16,
  height: 10
};

export function getOverlappingPitchCoordinates(
  coordinates: PitchCoordinate[],
  footprint: PitchCardFootprint = defaultPitchCardFootprint
): PitchCoordinateOverlap[] {
  const overlaps: PitchCoordinateOverlap[] = [];

  for (let firstIndex = 0; firstIndex < coordinates.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < coordinates.length; secondIndex += 1) {
      const first = coordinates[firstIndex];
      const second = coordinates[secondIndex];
      const horizontallyOverlaps = Math.abs(first.x - second.x) < footprint.width;
      const verticallyOverlaps = Math.abs(first.y - second.y) < footprint.height;

      if (horizontallyOverlaps && verticallyOverlaps) {
        overlaps.push({ firstIndex, secondIndex });
      }
    }
  }

  return overlaps;
}
