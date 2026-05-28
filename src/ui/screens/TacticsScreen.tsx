import { useState } from "react";
import { Eye, Play, RefreshCw } from "lucide-react";
import { formationPitchCoordinates, formations, tacticalFocuses } from "../../data/constants/formations";
import type { GameState } from "../../domain/types/game";
import type { Player, PlayerPosition } from "../../domain/types/player";
import type { Formation, Lineup, RiskLevel, TacticalFocus, Tactic } from "../../domain/types/tactics";
import { getSortedPlayersForSlot } from "../../domain/lineup/selectLineup";
import { calculatePositionFit, type PositionFitLevel } from "../../domain/lineup/positionFit";
import { getTacticalImpactPreview } from "../../domain/tactics/tacticalImpact";
import {
  getLastTacticFamiliarityGain,
  getTacticFamiliarity,
  getTacticFamiliarityEffectText
} from "../../domain/tactics/tacticFamiliarity";
import { PlayerDetailSheet } from "../components/player/PlayerDetailSheet";

type TacticsScreenProps = {
  gameState: GameState;
  fixtureId: string;
  draftTactic: Tactic;
  draftLineup: Lineup;
  lineupErrors: string[];
  onSetTacticOption: (
    key: "formation" | "focus" | "riskLevel",
    value: Formation | TacticalFocus | RiskLevel
  ) => void;
  onSetLineupSlot: (slotIndex: number, playerId: string) => void;
  onAutoSelectLineup: () => void;
  onPlayMatch: () => void;
};

const riskLevels: RiskLevel[] = ["conservative", "balanced", "aggressive"];

function optionLabel(value: string): string {
  return value.replace(/_/g, " ");
}

function fitClass(level: PositionFitLevel): string {
  if (level === "natural") return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (level === "secondary") return "bg-sky-100 text-sky-800 border-sky-300";
  if (level === "related") return "bg-amber-100 text-amber-800 border-amber-300";
  if (level === "poor") return "bg-orange-100 text-orange-800 border-orange-300";
  return "bg-red-100 text-red-800 border-red-300";
}

function shortPlayerName(player?: Player): string {
  if (!player) return "Select player";
  return `${player.firstName[0]}. ${player.lastName}`;
}

type SelectedPlayerDetail = {
  playerId: string;
  slotPosition?: PlayerPosition;
};

export function TacticsScreen({
  gameState,
  fixtureId,
  draftTactic,
  draftLineup,
  lineupErrors,
  onSetTacticOption,
  onSetLineupSlot,
  onAutoSelectLineup,
  onPlayMatch
}: TacticsScreenProps): JSX.Element {
  const playerClub = gameState.clubs[gameState.playerClubId];
  const fixture = gameState.seasons[gameState.currentSeasonId].fixtures.find(
    (candidate) => candidate.id === fixtureId
  );
  const opponentId = fixture?.homeClubId === playerClub.id ? fixture.awayClubId : fixture?.homeClubId;
  const opponent = opponentId ? gameState.clubs[opponentId] : undefined;
  const selectedStarterIds = new Set(draftLineup.starters.map((slot) => slot.playerId).filter(Boolean));
  const impactPreview = getTacticalImpactPreview(draftTactic);
  const tacticFamiliarity = getTacticFamiliarity(playerClub, draftTactic);
  const lastFamiliarityGain = getLastTacticFamiliarityGain(gameState, draftTactic);
  const [selectedPlayerDetail, setSelectedPlayerDetail] = useState<SelectedPlayerDetail | null>(null);
  const selectedPlayer = selectedPlayerDetail ? gameState.players[selectedPlayerDetail.playerId] : undefined;
  const benchPlayers = playerClub.squadPlayerIds
    .filter((playerId) => !selectedStarterIds.has(playerId))
    .slice(0, 7)
    .map((playerId) => gameState.players[playerId]);

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-stone-300 bg-white p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-stone-500">Match Preparation</p>
            <h2 className="text-2xl font-bold">{playerClub.name} vs {opponent?.name ?? "Opponent"}</h2>
          </div>
          <button
            type="button"
            onClick={onPlayMatch}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-pitch-700 px-4 text-sm font-semibold text-white transition hover:bg-pitch-900 disabled:bg-stone-400"
            disabled={lineupErrors.length > 0}
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            <span>Simulate Match</span>
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <label className="rounded-md border border-stone-300 bg-white p-4 text-sm font-medium">
          Formation
          <select
            value={draftTactic.formation}
            onChange={(event) => onSetTacticOption("formation", event.target.value as Formation)}
            className="mt-2 h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm"
          >
            {formations.map((formation) => (
              <option key={formation} value={formation}>
                {formation}
              </option>
            ))}
          </select>
        </label>
        <label className="rounded-md border border-stone-300 bg-white p-4 text-sm font-medium">
          Tactical Focus
          <select
            value={draftTactic.focus}
            onChange={(event) => onSetTacticOption("focus", event.target.value as TacticalFocus)}
            className="mt-2 h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm capitalize"
          >
            {tacticalFocuses.map((focus) => (
              <option key={focus} value={focus}>
                {optionLabel(focus)}
              </option>
            ))}
          </select>
        </label>
        <label className="rounded-md border border-stone-300 bg-white p-4 text-sm font-medium">
          Risk Level
          <select
            value={draftTactic.riskLevel}
            onChange={(event) => onSetTacticOption("riskLevel", event.target.value as RiskLevel)}
            className="mt-2 h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm capitalize"
          >
            {riskLevels.map((riskLevel) => (
              <option key={riskLevel} value={riskLevel}>
                {optionLabel(riskLevel)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="rounded-md border border-stone-300 bg-white p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold">Tactical Impact Preview</h3>
          <div className="rounded border border-pitch-200 bg-pitch-50 px-3 py-2 text-sm">
            <span className="font-semibold text-pitch-950">Familiarity: {Math.round(tacticFamiliarity)}%</span>
            <span className="ml-2 text-pitch-900">{getTacticFamiliarityEffectText(tacticFamiliarity)}</span>
            {lastFamiliarityGain !== undefined && (
              <span className="ml-2 font-semibold text-pitch-950">+{lastFamiliarityGain}% gained last match.</span>
            )}
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {impactPreview.map((impact) => (
            <div key={impact.title} className="rounded border border-stone-200 bg-stone-50 p-3 text-sm">
              <h4 className="font-semibold">{impact.title}</h4>
              <p className="mt-2 text-xs font-semibold uppercase text-stone-500">Benefits</p>
              <ul className="mt-1 space-y-1 text-stone-700">
                {impact.benefits.map((benefit) => (
                  <li key={benefit}>{benefit}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs font-semibold uppercase text-stone-500">Tradeoffs</p>
              <ul className="mt-1 space-y-1 text-stone-700">
                {impact.tradeoffs.map((tradeoff) => (
                  <li key={tradeoff}>{tradeoff}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-stone-300 bg-white p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold">Pitch Lineup</h3>
          <button
            type="button"
            onClick={onAutoSelectLineup}
            className="flex h-9 items-center justify-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>Auto-select</span>
          </button>
        </div>
        {lineupErrors.length > 0 && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {lineupErrors.join(" ")}
          </div>
        )}
        <div className="grid gap-4 xl:grid-cols-[minmax(520px,1fr)_420px]">
          <div className="relative min-h-[680px] overflow-hidden rounded-md border border-pitch-700 bg-pitch-700 p-4 shadow-inner">
            <div className="absolute inset-4 rounded border-2 border-white/35" />
            <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/25" />
            <div className="absolute left-[15%] right-[15%] top-4 h-24 border-x-2 border-b-2 border-white/25" />
            <div className="absolute bottom-4 left-[15%] right-[15%] h-24 border-x-2 border-t-2 border-white/25" />
            <div className="absolute left-4 right-4 top-1/2 border-t-2 border-white/25" />
            {draftLineup.starters.map((slot, index) => {
              const player = gameState.players[slot.playerId];
              const fit = player ? calculatePositionFit(player, slot.position) : undefined;
              const coordinate = formationPitchCoordinates[draftTactic.formation][index];

              return (
                <button
                  type="button"
                  key={`${slot.position}-${index}-pitch`}
                  onClick={() => player && setSelectedPlayerDetail({ playerId: player.id, slotPosition: slot.position })}
                  className="absolute w-36 -translate-x-1/2 -translate-y-1/2 rounded-md border border-white/30 bg-white/95 p-2 text-left text-xs shadow-md transition hover:border-amber-300 hover:bg-amber-50"
                  style={{ left: `${coordinate.x}%`, top: `${coordinate.y}%` }}
                  disabled={!player}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-stone-950">{slot.position}</span>
                    {fit && (
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${fitClass(fit.level)}`}>
                        {fit.label}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate font-semibold text-stone-800">{shortPlayerName(player)}</p>
                  <p className="text-[11px] text-stone-500">
                    Natural: {player?.primaryPosition ?? "-"}
                    {fit ? `, ${Math.round(fit.effectiveness * 100)}%` : ""}
                  </p>
                </button>
              );
            })}
          </div>
          <div className="space-y-2">
          {draftLineup.starters.map((slot, index) => {
            const options = getSortedPlayersForSlot(gameState, playerClub.id, draftLineup, index);
            const selectedPlayer = gameState.players[slot.playerId];
            const fit = selectedPlayer ? calculatePositionFit(selectedPlayer, slot.position) : undefined;

            return (
              <div key={`${slot.position}-${index}`} className="rounded border border-stone-200 bg-stone-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-2 font-semibold">
                  <span>{index + 1}. {slot.position}</span>
                  {fit && (
                    <span className={`rounded border px-2 py-0.5 text-xs ${fitClass(fit.level)}`}>
                      {fit.label} {Math.round(fit.effectiveness * 100)}%
                    </span>
                  )}
                </div>
                <select
                  value={slot.playerId}
                  onChange={(event) => onSetLineupSlot(index, event.target.value)}
                  className="mt-2 h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm"
                >
                  <option value="">Select player</option>
                  {options.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.primaryPosition} - {player.firstName} {player.lastName} #{player.visualIdentity.kitNumber}
                    </option>
                  ))}
                </select>
                {selectedPlayer && (
                  <button
                    type="button"
                    onClick={() => setSelectedPlayerDetail({ playerId: selectedPlayer.id, slotPosition: slot.position })}
                    className="mt-2 flex items-center gap-1 text-xs font-semibold text-pitch-800 underline-offset-2 hover:underline"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>View player detail</span>
                  </button>
                )}
                {fit && <p className="mt-1 text-xs text-stone-600">{fit.explanation}</p>}
              </div>
            );
          })}
          </div>
        </div>
      </section>

      <section className="rounded-md border border-stone-300 bg-white p-4">
        <h3 className="mb-3 text-lg font-semibold">Bench</h3>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {benchPlayers.map((player) => (
            <button
              type="button"
              key={player.id}
              onClick={() => setSelectedPlayerDetail({ playerId: player.id })}
              className="rounded border border-stone-200 bg-stone-50 px-3 py-2 text-left text-sm transition hover:border-pitch-300 hover:bg-pitch-50"
            >
              <span className="font-medium">{player.primaryPosition}</span>
              <span className="ml-2">{player.firstName} {player.lastName}</span>
            </button>
          ))}
        </div>
      </section>

      {selectedPlayer && (
        <PlayerDetailSheet
          player={selectedPlayer}
          gameState={gameState}
          selectedSlotPosition={selectedPlayerDetail?.slotPosition}
          onClose={() => setSelectedPlayerDetail(null)}
        />
      )}
    </div>
  );
}
