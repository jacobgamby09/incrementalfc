import type { Player, PlayerPosition } from "../types/player";

export type PositionFitLevel = "natural" | "secondary" | "related" | "poor" | "invalid";

export type PositionFit = {
  level: PositionFitLevel;
  effectiveness: number;
  label: string;
  explanation: string;
};

const relatedPositions: Record<PlayerPosition, PlayerPosition[]> = {
  GK: [],
  CB: ["DM", "LB", "RB"],
  LB: ["WB", "RB", "CB"],
  RB: ["WB", "LB", "CB"],
  WB: ["LB", "RB", "LW", "RW"],
  DM: ["CM", "CB"],
  CM: ["DM", "AM"],
  AM: ["CM", "LW", "RW", "ST"],
  LW: ["RW", "WB", "AM", "ST"],
  RW: ["LW", "WB", "AM", "ST"],
  ST: ["AM", "LW", "RW"]
};

function fitForLevel(level: PositionFitLevel): PositionFit {
  if (level === "natural") {
    return {
      level,
      effectiveness: 1,
      label: "Natural",
      explanation: "Best fit for this role."
    };
  }
  if (level === "secondary") {
    return {
      level,
      effectiveness: 0.93,
      label: "Secondary",
      explanation: "Comfortable enough with only a small effectiveness loss."
    };
  }
  if (level === "related") {
    return {
      level,
      effectiveness: 0.82,
      label: "Related",
      explanation: "Similar football demands, but some tactical sharpness is lost."
    };
  }
  if (level === "poor") {
    return {
      level,
      effectiveness: 0.62,
      label: "Poor",
      explanation: "Unnatural role with a clear contribution penalty."
    };
  }

  return {
    level,
    effectiveness: 0.25,
    label: "Invalid",
    explanation: "This role is too far from the player's position."
  };
}

export function calculatePositionFit(player: Player, slotPosition: PlayerPosition): PositionFit {
  if (player.primaryPosition === slotPosition) {
    return fitForLevel("natural");
  }

  if (player.secondaryPositions.includes(slotPosition)) {
    return fitForLevel("secondary");
  }

  if (slotPosition === "GK" || player.primaryPosition === "GK") {
    return fitForLevel("invalid");
  }

  if (relatedPositions[player.primaryPosition].includes(slotPosition)) {
    return fitForLevel("related");
  }

  return fitForLevel("poor");
}

export function getPositionFitModifier(player: Player, slotPosition: PlayerPosition): number {
  return calculatePositionFit(player, slotPosition).effectiveness;
}
