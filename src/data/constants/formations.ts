import type { Formation, TacticalFocus } from "../../domain/types/tactics";
import type { ChanceType } from "../../domain/types/match";
import type { PlayerPosition } from "../../domain/types/player";

export const formations: Formation[] = ["4-4-2", "4-3-3", "4-2-3-1", "3-5-2", "5-4-1"];

export const tacticalFocuses: TacticalFocus[] = [
  "balanced",
  "wide_play",
  "fast_breaks",
  "sustained_pressure",
  "defensive_shape"
];

export const formationSlots: Record<Formation, PlayerPosition[]> = {
  "4-4-2": ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "LW", "RW", "ST", "ST"],
  "4-3-3": ["GK", "RB", "CB", "CB", "LB", "DM", "CM", "CM", "LW", "RW", "ST"],
  "4-2-3-1": ["GK", "RB", "CB", "CB", "LB", "DM", "CM", "LW", "AM", "RW", "ST"],
  "3-5-2": ["GK", "CB", "CB", "CB", "WB", "DM", "CM", "CM", "WB", "ST", "ST"],
  "5-4-1": ["GK", "RB", "CB", "CB", "CB", "LB", "CM", "CM", "LW", "RW", "ST"]
};

export type PitchCoordinate = {
  x: number;
  y: number;
};

export const formationPitchCoordinates: Record<Formation, PitchCoordinate[]> = {
  "4-4-2": [
    { x: 50, y: 92 },
    { x: 86, y: 74 },
    { x: 62, y: 76 },
    { x: 38, y: 76 },
    { x: 14, y: 74 },
    { x: 38, y: 52 },
    { x: 62, y: 52 },
    { x: 14, y: 43 },
    { x: 86, y: 43 },
    { x: 40, y: 16 },
    { x: 60, y: 16 }
  ],
  "4-3-3": [
    { x: 50, y: 92 },
    { x: 86, y: 74 },
    { x: 62, y: 76 },
    { x: 38, y: 76 },
    { x: 14, y: 74 },
    { x: 50, y: 58 },
    { x: 32, y: 45 },
    { x: 68, y: 45 },
    { x: 14, y: 21 },
    { x: 86, y: 21 },
    { x: 50, y: 13 }
  ],
  "4-2-3-1": [
    { x: 50, y: 92 },
    { x: 86, y: 74 },
    { x: 62, y: 76 },
    { x: 38, y: 76 },
    { x: 14, y: 74 },
    { x: 40, y: 60 },
    { x: 60, y: 60 },
    { x: 16, y: 34 },
    { x: 50, y: 32 },
    { x: 84, y: 34 },
    { x: 50, y: 13 }
  ],
  "3-5-2": [
    { x: 50, y: 92 },
    { x: 28, y: 76 },
    { x: 50, y: 78 },
    { x: 72, y: 76 },
    { x: 10, y: 52 },
    { x: 50, y: 58 },
    { x: 34, y: 44 },
    { x: 66, y: 44 },
    { x: 90, y: 52 },
    { x: 40, y: 15 },
    { x: 60, y: 15 }
  ],
  "5-4-1": [
    { x: 50, y: 92 },
    { x: 90, y: 73 },
    { x: 70, y: 78 },
    { x: 50, y: 80 },
    { x: 30, y: 78 },
    { x: 10, y: 73 },
    { x: 40, y: 50 },
    { x: 60, y: 50 },
    { x: 14, y: 38 },
    { x: 86, y: 38 },
    { x: 50, y: 13 }
  ]
};

export const chanceTypeBaseWeights: Record<ChanceType, number> = {
  fast_breakaway: 1,
  wide_cross: 1,
  sustained_pressure: 1,
  rebound_big_chance: 0.18
};
