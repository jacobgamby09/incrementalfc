import type { ScreenId } from "../store/gameStore";

export const routes: Array<{ id: ScreenId; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "economy", label: "Economy" },
  { id: "league", label: "League" },
  { id: "fixtures", label: "Fixtures" },
  { id: "tactics", label: "Tactics" },
  { id: "squad", label: "Squad" },
  { id: "training", label: "Training" },
  { id: "facilities", label: "Facilities" },
  { id: "market", label: "Market" }
];
