import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { generateGameState } from "../../../domain/generation/generateGameState";
import { PlayerDetailSheet } from "./PlayerDetailSheet";

describe("PlayerDetailSheet", () => {
  it("renders stat delta indicators without misleading per-stat progress bars", () => {
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
    expect(screen.getByText("Action / Status")).toBeInTheDocument();
    expect(screen.getByText("Best Tactical Fits")).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^stat-growth-progress-/)).toHaveLength(0);
  });

  it("shows a scouting interval without leaking development data for external players", () => {
    const gameState = generateGameState();
    const club = gameState.clubs[gameState.playerClubId];
    const player = gameState.players[club.squadPlayerIds[0]];

    render(
      <PlayerDetailSheet
        player={player}
        gameState={gameState}
        scoutedPotential={{ estimatedMin: 8, estimatedMax: 16, confidence: "Low", accuracy: 0.5 }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Est. POT")).toBeInTheDocument();
    expect(screen.getByText("8-16")).toBeInTheDocument();
    expect(screen.getByText("Low confidence")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Player Attributes" })).toBeInTheDocument();
    expect(screen.getByText("Estimated")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Development" })).not.toBeInTheDocument();
    expect(screen.queryAllByTestId(/^stat-growth-progress-/)).toHaveLength(0);
  });

  it("shows declining status for players aged 30 or older", () => {
    const gameState = generateGameState();
    const club = gameState.clubs[gameState.playerClubId];
    const player = {
      ...gameState.players[club.squadPlayerIds[0]],
      age: 30
    };
    const stateWithVeteran = {
      ...gameState,
      players: {
        ...gameState.players,
        [player.id]: player
      }
    };

    render(<PlayerDetailSheet player={player} gameState={stateWithVeteran} onClose={vi.fn()} />);

    expect(screen.getAllByText("Declining").length).toBeGreaterThan(0);
    expect(screen.queryByText("Untapped potential")).not.toBeInTheDocument();
  });
});
