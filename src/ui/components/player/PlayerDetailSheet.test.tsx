import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { generateGameState } from "../../../domain/generation/generateGameState";
import { PlayerDetailSheet } from "./PlayerDetailSheet";

describe("PlayerDetailSheet", () => {
  it("renders one primary growth progress bar per stat and stat delta indicators", () => {
    const gameState = generateGameState();
    const club = gameState.clubs[gameState.playerClubId];
    const playerId = club.squadPlayerIds.find((candidateId) => gameState.players[candidateId].primaryPosition !== "GK")!;
    const player = {
      ...gameState.players[playerId],
      development: {
        ...gameState.players[playerId].development,
        recentStatGrowth: [
          { statKey: "ACC", from: 8, to: 9, source: "training" as const },
          { statKey: "PHY", from: 8, to: 7, source: "training" as const }
        ]
      }
    };
    const stateWithPlayer = {
      ...gameState,
      players: {
        ...gameState.players,
        [player.id]: player
      }
    };

    render(<PlayerDetailSheet player={player} gameState={stateWithPlayer} onClose={vi.fn()} />);

    expect(screen.getByLabelText("Recent Growth ↑ +1")).toBeInTheDocument();
    expect(screen.getByLabelText("Recent Growth ↓ -1")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^stat-growth-progress-/)).toHaveLength(Object.keys(player.currentStats).length);
  });
});
