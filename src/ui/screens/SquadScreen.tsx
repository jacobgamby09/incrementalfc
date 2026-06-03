import { useState } from "react";
import type { GameState } from "../../domain/types/game";
import { formatCurrency } from "../../utils/format";
import { PlayerDetailSheet } from "../components/player/PlayerDetailSheet";
import { SquadPreview } from "../components/player/SquadPreview";
import type { SquadTablePresetId } from "../components/player/squadTablePresets";
import { calculateClubStrength } from "../../domain/league/clubStrength";

type SquadScreenProps = {
  gameState: GameState;
  onAllocateDevelopmentPoint: (playerId: string, statKey: string) => void;
};

export function SquadScreen({ gameState, onAllocateDevelopmentPoint }: SquadScreenProps): JSX.Element {
  const playerClub = gameState.clubs[gameState.playerClubId];
  const playerSquad = playerClub.squadPlayerIds.map((playerId) => gameState.players[playerId]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [tablePreset, setTablePreset] = useState<SquadTablePresetId>("overview");
  const selectedPlayer = selectedPlayerId ? gameState.players[selectedPlayerId] : undefined;

  const { avgOvr, stars, rank: playerRank } = calculateClubStrength(gameState, playerClub.id);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <p className="text-sm font-medium text-stone-500">Squad Size</p>
          <p className="mt-2 text-2xl font-bold">{playerSquad.length}</p>
        </div>
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <p className="text-sm font-medium text-stone-500">Weekly Wages</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(playerClub.economy.playerWageTotal)}</p>
        </div>
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <p className="text-sm font-medium text-stone-500">Squad OVR</p>
          <p className="mt-2 text-2xl font-bold">{Math.round(avgOvr)}</p>
          <div className="mt-1 flex items-center gap-0.5" title={`Club paper strength: Rank ${playerRank} of 10 in the league`}>
            {Array.from({ length: 6 }).map((_, index) => (
              <span
                key={index}
                className={`text-base leading-none ${
                  index < stars ? "text-amber-500 font-semibold" : "text-stone-300"
                }`}
              >
                ★
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-md border border-stone-300 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Squad Preview</h2>
        <SquadPreview
          players={playerSquad}
          gameState={gameState}
          preset={tablePreset}
          onPresetChange={setTablePreset}
          onSelectPlayer={(player) => setSelectedPlayerId(player.id)}
        />
      </section>

      {selectedPlayer && (
        <PlayerDetailSheet
          player={selectedPlayer}
          gameState={gameState}
          onAllocateDevelopmentPoint={onAllocateDevelopmentPoint}
          onClose={() => setSelectedPlayerId(null)}
        />
      )}
    </div>
  );
}
