import { useState } from "react";
import { Activity, Dumbbell, GraduationCap, Target } from "lucide-react";
import { developmentProfile } from "../../data/constants/developmentProfiles";
import { getFacilityLevelConfig } from "../../data/constants/facilityProfiles";
import {
  calculateFocusedTrainingXp,
  calculateSquadTrainingXp,
  getPlayerCapStatus,
  getPlayerDevelopmentSummary
} from "../../domain/development/playerDevelopment";
import { getFocusedTrainingAssignment, getFocusedTrainingSlotCount } from "../../domain/development/focusedTraining";
import { calculatePlayerOvr, calculatePlayerPot } from "../../domain/player/playerSummaries";
import type { GameState } from "../../domain/types/game";
import type { TrainingFocus } from "../../domain/types/training";
import { PlayerDetailSheet } from "../components/player/PlayerDetailSheet";

type TrainingScreenProps = {
  gameState: GameState;
  onAssignFocusedTraining: (slotIndex: number, playerId?: string, focus?: TrainingFocus) => void;
  onAllocateDevelopmentPoint: (playerId: string, statKey: string) => void;
};

export function TrainingScreen({ gameState, onAssignFocusedTraining, onAllocateDevelopmentPoint }: TrainingScreenProps): JSX.Element {
  const club = gameState.clubs[gameState.playerClubId];
  const players = club.squadPlayerIds.map((playerId) => gameState.players[playerId]).filter(Boolean);
  const slotCount = getFocusedTrainingSlotCount(club);
  const trainingGround = getFacilityLevelConfig("trainingGround", club.facilities.trainingGround.level);
  const squadXp = Math.round(developmentProfile.baselineTrainingXpPerWeek * (1 + (trainingGround.effects.trainingXpBonus ?? 0)));
  const unspentPointTotal = players.reduce((sum, player) => sum + (player.development.unspentDevelopmentPoints ?? 0), 0);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const selectedPlayer = selectedPlayerId ? gameState.players[selectedPlayerId] : undefined;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-stone-950">Training</h2>
        <p className="mt-1 text-sm text-stone-600">
          Shape player development between matches. Every squad player trains; focused slots add extra progress toward manual Development Points.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary icon={GraduationCap} label="Training Ground" value={`Level ${club.facilities.trainingGround.level}`} />
        <Summary icon={Activity} label="Squad Training" value={`${squadXp} XP/player/week`} />
        <Summary icon={Target} label="Focused Slots" value={`${club.training.focusedAssignments.length}/${slotCount} assigned`} />
        <Summary icon={Dumbbell} label="Unspent Points" value={`${unspentPointTotal} ready`} />
      </section>

      <section className="rounded-md border border-stone-300 bg-white p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-bold">Focused Training Slots</h3>
            <p className="text-sm text-stone-600">Assign one player per slot. Focused slots multiply that player's progress toward manual Development Points.</p>
          </div>
          <p className="text-xs font-semibold uppercase text-stone-500">Development cap {trainingGround.effects.developmentCapBonus}</p>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {Array.from({ length: slotCount }, (_, slotIndex) => {
            const assignment = getFocusedTrainingAssignment(club, slotIndex);
            const player = assignment ? gameState.players[assignment.playerId] : undefined;
            const summary = player ? getPlayerDevelopmentSummary(player, club) : undefined;

            return (
              <div key={slotIndex} className="rounded-md border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase text-stone-500">Slot {slotIndex + 1}</p>
                  {player && (
                    <button
                      type="button"
                      onClick={() => onAssignFocusedTraining(slotIndex)}
                      className="text-xs font-semibold text-stone-500 transition hover:text-red-700"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <label className="mt-3 block text-xs font-semibold text-stone-600">
                  Player
                  <select
                    value={player?.id ?? ""}
                    onChange={(event) => onAssignFocusedTraining(slotIndex, event.target.value || undefined, assignment?.focus)}
                    className="mt-1 h-9 w-full rounded border border-stone-300 bg-white px-2 text-sm text-stone-900"
                  >
                    <option value="">Unassigned</option>
                    {players.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.firstName} {candidate.lastName} / {candidate.primaryPosition}
                      </option>
                    ))}
                  </select>
                </label>
                {player && assignment && summary && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <button type="button" onClick={() => setSelectedPlayerId(player.id)} className="font-bold text-pitch-800 hover:underline">
                        {player.firstName} {player.lastName}
                      </button>
                      <span className="font-semibold text-emerald-700">+{calculateFocusedTrainingXp(player, club)} focused XP/week</span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">Focused slot bonus applies on top of regular squad training.</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-stone-600">
                      <span>Next point</span>
                      <strong>{summary.nextProgressPercent}%</strong>
                    </div>
                    <ProgressBar value={summary.nextProgressPercent} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-stone-300 bg-white">
        <div className="border-b border-stone-200 p-4">
          <h3 className="text-lg font-bold">Squad Development</h3>
          <p className="text-sm text-stone-600">Use progress and development status to decide where focused training has the most value.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">Player</th>
                <th className="px-3 py-3">Age</th>
                <th className="px-3 py-3">Pos</th>
                <th className="px-3 py-3">OVR</th>
                <th className="px-3 py-3">POT</th>
                <th className="px-3 py-3">Squad XP</th>
                <th className="px-3 py-3">Focused Slot</th>
                <th className="px-3 py-3">Points</th>
                <th className="min-w-44 px-3 py-3">Next Point</th>
                <th className="px-3 py-3">Development Status</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => {
                const assignment = club.training.focusedAssignments.find((candidate) => candidate.playerId === player.id);
                const summary = getPlayerDevelopmentSummary(player, club);
                return (
                  <tr key={player.id} className="border-b border-stone-100 last:border-b-0">
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => setSelectedPlayerId(player.id)} className="font-semibold text-stone-900 hover:text-pitch-700 hover:underline">
                        {player.firstName} {player.lastName}
                      </button>
                    </td>
                    <td className="px-3 py-3">{player.age}</td>
                    <td className="px-3 py-3">{player.primaryPosition}</td>
                    <td className="px-3 py-3">{Math.round(calculatePlayerOvr(player))}</td>
                    <td className="px-3 py-3">{Math.round(calculatePlayerPot(player))}</td>
                    <td className="px-3 py-3">+{calculateSquadTrainingXp(player, club)}</td>
                    <td className="px-3 py-3">{assignment ? `Slot ${assignment.slotIndex + 1}` : "-"}</td>
                    <td className="px-3 py-3">
                      {(summary.unspentDevelopmentPoints ?? 0) > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedPlayerId(player.id)}
                          className="rounded bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800 transition hover:bg-emerald-200"
                        >
                          {summary.unspentDevelopmentPoints} ready
                        </button>
                      ) : (
                        <span className="text-stone-500">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-between gap-2 text-xs text-stone-600">
                        <span>Progress</span>
                        <strong>{summary.nextProgressPercent}%</strong>
                      </div>
                      <ProgressBar value={summary.nextProgressPercent} />
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold text-stone-700">{getPlayerCapStatus(player, club)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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

function ProgressBar({ value }: { value: number }): JSX.Element {
  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <div className="h-full rounded-full bg-pitch-700" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function Summary({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-md border border-stone-300 bg-white p-4">
      <p className="flex items-center gap-2 text-xs font-bold uppercase text-stone-500"><Icon className="h-4 w-4 text-pitch-700" />{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}
