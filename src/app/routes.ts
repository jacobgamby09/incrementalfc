import type { ScreenId } from "../store/gameStore";

export const routes: Array<{ id: ScreenId; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "league", label: "League" },
  { id: "squad", label: "Squad" }
];
