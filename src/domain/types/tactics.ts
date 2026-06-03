import type { PlayerPosition, PlayerRole } from "./player";

export type Formation =
  | "4-4-2"
  | "4-3-3"
  | "4-2-3-1"
  | "3-5-2"
  | "5-4-1"
  | "5-3-2"
  | "3-4-3"
  | "3-4-2-1";

export type TacticalFocus =
  | "balanced"
  | "wide_play"
  | "fast_breaks"
  | "sustained_pressure"
  | "defensive_shape"
  | "control"
  | "tiki_taka";

export type RiskLevel = "conservative" | "balanced" | "aggressive";

export type TacticalInstruction =
  | "press_high"
  | "sit_deep"
  | "overlap_wide"
  | "play_direct"
  | "short_passing"
  | "target_man"
  | "counter_attack";

export type Tactic = {
  id: string;
  name: string;
  formation: Formation;
  focus: TacticalFocus;
  riskLevel: RiskLevel;
  instructions: TacticalInstruction[];
};

export type ClubTactics = {
  activeTactic: Tactic;
  savedTactics: Tactic[];
  familiarityByTacticId: Record<string, number>;
  activeLineup?: Lineup;
};

export type LineupSlot = {
  position: PlayerPosition;
  playerId: string;
  role?: PlayerRole;
};

export type Lineup = {
  tacticId: string;
  starters: LineupSlot[];
  bench: string[];
  captainPlayerId?: string;
};
