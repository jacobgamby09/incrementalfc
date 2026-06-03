import { useState } from "react";
import { Eye, Play, RefreshCw, Save } from "lucide-react";
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
import { getPlayerFitness, getReadinessLabel, getReadinessColor } from "../../domain/fitness/playerFitness";
import { getLineupTacticalFits, getPlayerTacticalFitForFocus } from "../../domain/player/tacticalFit";

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
  onSaveTactic: () => void;
  onPlayMatch: () => void;
  onAllocateDevelopmentPoint: (playerId: string, statKey: string) => void;
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
  onSaveTactic,
  onPlayMatch,
  onAllocateDevelopmentPoint
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
  const lineupFits = getLineupTacticalFits(draftLineup, gameState.players, 3);
  const selectedFocusFit = draftLineup.starters
    .map((slot) => gameState.players[slot.playerId])
    .filter((player): player is Player => Boolean(player))
    .map((player) => getPlayerTacticalFitForFocus(player, draftTactic.focus));
  const selectedFocusScore = selectedFocusFit.length > 0
    ? Math.round(selectedFocusFit.reduce((sum, fit) => sum + fit.score, 0) / selectedFocusFit.length)
    : 0;
  const topLineupFit = lineupFits[0];
  const selectedFocusGap = topLineupFit ? selectedFocusScore - topLineupFit.score : 0;
  const [selectedPlayerDetail, setSelectedPlayerDetail] = useState<SelectedPlayerDetail | null>(null);
  const [showTacticalDetails, setShowTacticalDetails] = useState(false);
  const selectedPlayer = selectedPlayerDetail ? gameState.players[selectedPlayerDetail.playerId] : undefined;
  const benchPlayers = playerClub.squadPlayerIds
    .filter((playerId) => !selectedStarterIds.has(playerId))
    .slice(0, 7)
    .map((playerId) => gameState.players[playerId]);

  return (
    <div className="space-y-4">
      {/* Unified Header & Tactics Selector */}
      <section className="rounded-md border border-stone-300 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Match Preparation</p>
            <h2 className="text-lg font-bold text-stone-900 leading-tight">
              {playerClub.name} vs {opponent?.name ?? "Opponent"}
            </h2>
          </div>

          {/* Tactical Config Options Inline */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
              <span>Formation:</span>
              <select
                value={draftTactic.formation}
                onChange={(event) => onSetTacticOption("formation", event.target.value as Formation)}
                className="h-8 rounded border border-stone-300 bg-white px-2 text-xs font-semibold text-stone-850 focus:border-pitch-500 focus:outline-none"
              >
                {formations.map((formation) => (
                  <option key={formation} value={formation}>
                    {formation}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
              <span>Focus:</span>
              <select
                value={draftTactic.focus}
                onChange={(event) => onSetTacticOption("focus", event.target.value as TacticalFocus)}
                className="h-8 rounded border border-stone-300 bg-white px-2 text-xs font-semibold text-stone-855 capitalize focus:border-pitch-500 focus:outline-none"
              >
                {tacticalFocuses.map((focus) => (
                  <option key={focus} value={focus}>
                    {optionLabel(focus)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
              <span>Risk:</span>
              <select
                value={draftTactic.riskLevel}
                onChange={(event) => onSetTacticOption("riskLevel", event.target.value as RiskLevel)}
                className="h-8 rounded border border-stone-300 bg-white px-2 text-xs font-semibold text-stone-855 capitalize focus:border-pitch-500 focus:outline-none"
              >
                {riskLevels.map((riskLevel) => (
                  <option key={riskLevel} value={riskLevel}>
                    {optionLabel(riskLevel)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSaveTactic}
              className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Save Tactic</span>
            </button>
            <button
              type="button"
              onClick={onPlayMatch}
              className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-pitch-700 px-3 text-xs font-semibold text-white hover:bg-pitch-900 disabled:bg-stone-400 transition"
              disabled={lineupErrors.length > 0}
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Simulate Match</span>
            </button>
          </div>
        </div>
      </section>

      {/* Tactical familiarity / impact preview - collapsible */}
      <section className="rounded-md border border-stone-300 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-stone-900">Tactical Overview & Familiarity</h3>
            <button
              type="button"
              onClick={() => setShowTacticalDetails(!showTacticalDetails)}
              className="flex items-center gap-1 text-xs font-semibold text-pitch-800 hover:text-pitch-900 transition"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{showTacticalDetails ? "Hide Details" : "Show Details"}</span>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded border border-pitch-200 bg-pitch-50 px-2.5 py-1 text-xs">
            <span className="font-semibold text-pitch-950">Familiarity: {Math.round(tacticFamiliarity)}%</span>
            <span className="text-pitch-900">({getTacticFamiliarityEffectText(tacticFamiliarity)})</span>
            {lastFamiliarityGain !== undefined && (
              <span className="font-semibold text-pitch-950 border-l border-pitch-200 pl-2 text-[11px]">+{lastFamiliarityGain}% last match</span>
            )}
          </div>
        </div>

        <div className="mt-3 rounded border border-sky-200 bg-sky-50 p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-900">Selected XI Tactical Fit</h4>
              <p className="mt-1 text-xs text-sky-900">
                Based on the current starters' attributes and positions. This is squad fit, not opponent advice.
              </p>
            </div>
            <div className="rounded border border-sky-200 bg-white px-2.5 py-1 text-xs text-sky-950">
              <span className="font-semibold">Current focus:</span> {optionLabel(draftTactic.focus)}
              <span className="ml-2 font-bold tabular-nums">{selectedFocusScore}%</span>
              {topLineupFit && selectedFocusGap < 0 && (
                <span className="ml-2 text-sky-700">({selectedFocusGap}% vs best)</span>
              )}
            </div>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-3">
            {lineupFits.map((fit, index) => {
              const isCurrent = fit.focus === draftTactic.focus;
              return (
                <div key={fit.focus} className={`rounded border p-2 ${isCurrent ? "border-pitch-300 bg-pitch-50" : "border-sky-200 bg-white"}`}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-stone-950">{index + 1}. {fit.label}</span>
                    <span className="font-bold tabular-nums text-stone-950">{fit.score}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-stone-200">
                    <div className={`h-full rounded-full ${isCurrent ? "bg-pitch-700" : "bg-sky-600"}`} style={{ width: `${fit.score}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-stone-600">Key stats: {fit.primaryStats.join(", ") || "-"}</p>
                </div>
              );
            })}
          </div>
        </div>

        {showTacticalDetails && (
          <div className="mt-3 grid gap-3 border-t border-stone-200 pt-3 lg:grid-cols-3">
            {impactPreview.map((impact) => (
              <div key={impact.title} className="rounded border border-stone-200 bg-stone-50 p-2.5 text-xs">
                <h4 className="font-semibold text-stone-900">{impact.title}</h4>
                <p className="mt-2 text-[10px] font-bold uppercase text-stone-500">Benefits</p>
                <ul className="mt-0.5 list-disc pl-4 text-stone-700 space-y-0.5">
                  {impact.benefits.map((benefit) => (
                    <li key={benefit}>{benefit}</li>
                  ))}
                </ul>
                <p className="mt-2 text-[10px] font-bold uppercase text-stone-500">Tradeoffs</p>
                <ul className="mt-0.5 list-disc pl-4 text-stone-700 space-y-0.5">
                  {impact.tradeoffs.map((tradeoff) => (
                    <li key={tradeoff}>{tradeoff}</li>
                  ))}
                </ul>
                {impact.primaryStats.length > 0 && (
                  <>
                    <p className="mt-2 text-[10px] font-bold uppercase text-stone-500">Primary Stats</p>
                    <p className="mt-0.5 text-stone-700">{impact.primaryStats.join(", ")}</p>
                  </>
                )}
                {impact.likelyChanceTypes.length > 0 && (
                  <>
                    <p className="mt-2 text-[10px] font-bold uppercase text-stone-500">Likely Chances</p>
                    <p className="mt-0.5 text-stone-700 capitalize">
                      {impact.likelyChanceTypes.map((chanceType) => optionLabel(chanceType)).join(", ")}
                    </p>
                  </>
                )}
                {impact.vulnerabilities.length > 0 && (
                  <>
                    <p className="mt-2 text-[10px] font-bold uppercase text-stone-500">Vulnerabilities</p>
                    <ul className="mt-0.5 list-disc pl-4 text-stone-700 space-y-0.5">
                      {impact.vulnerabilities.map((vulnerability) => (
                        <li key={vulnerability}>{vulnerability}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pitch & Starters selection */}
      <section className="rounded-md border border-stone-300 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-900">Pitch Lineup</h3>
          <button
            type="button"
            onClick={onAutoSelectLineup}
            className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-stone-300 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Auto-select</span>
          </button>
        </div>
        {lineupErrors.length > 0 && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {lineupErrors.join(" ")}
          </div>
        )}
        <div className="grid gap-4 xl:grid-cols-[minmax(520px,1fr)_420px]">
          {/* Pitch */}
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
                  {player && (
                    <div className="mt-1 flex items-center justify-between gap-1 text-[10px] font-medium border-t border-stone-200/60 pt-1">
                      <span className="text-stone-500">Readiness:</span>
                      <span className={`${getReadinessColor(getPlayerFitness(player)).text}`}>
                        {getReadinessLabel(getPlayerFitness(player))} ({getPlayerFitness(player)})
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Compact Starter List */}
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3 shadow-sm self-start">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200 pb-1.5 mb-2">
              Starting XI
            </h4>
            <div className="space-y-2 divide-y divide-stone-200/60">
              {draftLineup.starters.map((slot, index) => {
                const options = getSortedPlayersForSlot(gameState, playerClub.id, draftLineup, index);
                const selectedPlayer = gameState.players[slot.playerId];
                const fit = selectedPlayer ? calculatePositionFit(selectedPlayer, slot.position) : undefined;

                return (
                  <div
                    key={`${slot.position}-${index}`}
                    className={`flex items-center gap-2 text-xs ${index > 0 ? 'pt-2' : ''}`}
                  >
                    {/* Index & Position */}
                    <div className="w-12 shrink-0 flex items-center gap-1">
                      <span className="text-[10px] text-stone-400 font-mono w-4 text-right">
                        {index + 1}.
                      </span>
                      <span className="font-bold text-stone-850 truncate">{slot.position}</span>
                    </div>

                    {/* Selector */}
                    <div className="flex-1 min-w-0">
                      <select
                        value={slot.playerId}
                        onChange={(event) => onSetLineupSlot(index, event.target.value)}
                        className="h-8 w-full rounded border border-stone-300 bg-white px-2 py-0.5 text-xs text-stone-800 focus:border-pitch-500 focus:outline-none"
                      >
                        <option value="">Select player</option>
                        {options.map((player) => {
                          const fitness = getPlayerFitness(player);
                          const label = getReadinessLabel(fitness);
                          return (
                            <option key={player.id} value={player.id}>
                              {player.primaryPosition} - {player.firstName} {player.lastName} #{player.visualIdentity.kitNumber} ({label}: {fitness})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Position Fit Badge with tooltip description */}
                    {fit && (
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold shrink-0 cursor-help transition-all ${fitClass(fit.level)}`}
                        title={fit.explanation}
                      >
                        {fit.label} ({Math.round(fit.effectiveness * 100)}%)
                      </span>
                    )}

                    {/* View Details Icon Button */}
                    {selectedPlayer && (
                      <button
                        type="button"
                        onClick={() => setSelectedPlayerDetail({ playerId: selectedPlayer.id, slotPosition: slot.position })}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 hover:text-pitch-800 transition"
                        title={`View details for ${selectedPlayer.firstName} ${selectedPlayer.lastName}`}
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Bench */}
      <section className="rounded-md border border-stone-300 bg-white p-3 shadow-sm">
        <h3 className="mb-2 text-sm font-bold text-stone-900">Bench</h3>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
          {benchPlayers.map((player) => (
            <button
              type="button"
              key={player.id}
              onClick={() => setSelectedPlayerDetail({ playerId: player.id })}
              className="rounded border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-left text-xs transition hover:border-pitch-300 hover:bg-pitch-50"
            >
              <div className="font-semibold text-stone-850 truncate">{player.firstName[0]}. {player.lastName}</div>
              <div className="text-[10px] text-stone-500 font-medium">{player.primaryPosition}</div>
            </button>
          ))}
        </div>
      </section>

      {selectedPlayer && (
        <PlayerDetailSheet
          player={selectedPlayer}
          gameState={gameState}
          selectedSlotPosition={selectedPlayerDetail?.slotPosition}
          onAllocateDevelopmentPoint={onAllocateDevelopmentPoint}
          onClose={() => setSelectedPlayerDetail(null)}
        />
      )}
    </div>
  );
}
