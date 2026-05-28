import { X } from "lucide-react";
import { getPlayerDetailView, type GetPlayerDetailViewOptions } from "../../../domain/player/getPlayerDetailView";
import type { PlayerMatchContext } from "../../../domain/player/playerSummaries";
import type { GameState } from "../../../domain/types/game";
import type { Player, PlayerPosition } from "../../../domain/types/player";
import { formatCurrency } from "../../../utils/format";

type PlayerDetailSheetProps = {
  player: Player;
  gameState?: GameState;
  selectedSlotPosition?: PlayerPosition;
  matchContext?: PlayerMatchContext;
  onClose: () => void;
};

export function PlayerDetailSheet({
  player,
  gameState,
  selectedSlotPosition,
  matchContext,
  onClose
}: PlayerDetailSheetProps): JSX.Element {
  const detailOptions: GetPlayerDetailViewOptions = {
    gameState,
    selectedSlotPosition,
    matchContext
  };
  const detail = getPlayerDetailView(player, detailOptions);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-stone-950/40">
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-stone-500">
              {detail.primaryPosition}
              {detail.secondaryPositions.length > 0 ? ` / ${detail.secondaryPositions.join(", ")}` : ""}
            </p>
            <h2 className="text-2xl font-bold text-stone-950">{detail.name}</h2>
            <p className="mt-1 text-sm text-stone-600">Age {detail.age}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-stone-300 text-stone-600 transition hover:bg-stone-50"
            aria-label="Close player details"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <section className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold uppercase text-stone-500">OVR</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{detail.ovr.toFixed(1)}</p>
          </div>
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold uppercase text-stone-500">Est. POT</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{detail.estimatedPot.toFixed(1)}</p>
          </div>
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold uppercase text-stone-500">Avg Rating</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{detail.performance?.display.avgRating ?? "-"}</p>
          </div>
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold uppercase text-stone-500">Last</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{detail.performance?.display.lastRating ?? "-"}</p>
          </div>
        </section>

        <section className="mt-4 rounded-md border border-stone-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-stone-500">Form</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {detail.performance?.formLastFive.length ? (
              detail.performance.formLastFive.map((rating, index) => (
                <span key={`${rating}-${index}`} className="rounded bg-stone-900 px-2 py-1 text-xs font-bold text-white tabular-nums">
                  {rating.toFixed(1)}
                </span>
              ))
            ) : (
              <span className="text-sm text-stone-500">-</span>
            )}
          </div>
        </section>

        {detail.selectedPositionFit && (
          <section className="mt-4 rounded-md border border-pitch-200 bg-pitch-50 p-3">
            <p className="text-xs font-semibold uppercase text-pitch-900">Selected Slot Fit</p>
            <p className="mt-1 text-sm font-semibold text-pitch-950">
              {detail.selectedPositionFit.label} at {selectedSlotPosition} -{" "}
              {Math.round(detail.selectedPositionFit.effectiveness * 100)}% effectiveness
            </p>
            <p className="mt-1 text-sm text-pitch-900">{detail.selectedPositionFit.explanation}</p>
          </section>
        )}

        {detail.matchContext && (
          <section className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase text-amber-900">Match Context</p>
            <p className="mt-1 text-sm font-semibold text-amber-950">
              {detail.matchContext.clubName} vs {detail.matchContext.opponentName}
            </p>
            <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-amber-900">Rating</span>
                <span className="float-right font-bold tabular-nums">{detail.matchContext.rating?.rating.toFixed(1) ?? "-"}</span>
              </div>
              {detail.matchContext.stats?.position === "GK" ? (
                <>
                  <div>
                    <span className="text-amber-900">Saves</span>
                    <span className="float-right font-bold tabular-nums">{detail.matchContext.stats.saves}</span>
                  </div>
                  <div>
                    <span className="text-amber-900">xG Faced</span>
                    <span className="float-right font-bold tabular-nums">{detail.matchContext.stats.xgFaced.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-amber-900">Goals / Assists</span>
                    <span className="float-right font-bold tabular-nums">
                      {detail.matchContext.stats?.goals ?? 0} / {detail.matchContext.stats?.assists ?? 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-amber-900">Shots / xG</span>
                    <span className="float-right font-bold tabular-nums">
                      {detail.matchContext.stats?.shots ?? 0} / {detail.matchContext.stats?.xg.toFixed(2) ?? "0.00"}
                    </span>
                  </div>
                  <div>
                    <span className="text-amber-900">Key Passes</span>
                    <span className="float-right font-bold tabular-nums">{detail.matchContext.stats?.keyPasses ?? 0}</span>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold uppercase text-stone-500">Weekly Wage</p>
            <p className="mt-1 text-lg font-bold">{formatCurrency(detail.wagePerWeek)}</p>
          </div>
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold uppercase text-stone-500">Market Value</p>
            <p className="mt-1 text-lg font-bold">{formatCurrency(detail.marketValue)}</p>
          </div>
        </section>

        <section className="mt-5">
          <h3 className="text-sm font-semibold uppercase text-stone-500">Stat Development</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-stone-300 text-xs uppercase text-stone-500">
                  <th className="py-2 pr-3 font-semibold">Stat</th>
                  <th className="px-3 py-2 text-right font-semibold">Current</th>
                  <th className="px-3 py-2 text-right font-semibold">Potential</th>
                  <th className="px-3 py-2 text-right font-semibold">Facility Cap</th>
                  <th className="py-2 pl-3 text-right font-semibold">Progress</th>
                </tr>
              </thead>
              <tbody>
                {(detail.developmentSummary?.statRows ?? detail.currentStats.map((stat) => ({
                  statKey: stat.key,
                  current: stat.current,
                  potential: stat.potential,
                  facilityCap: "-",
                  progressPercent: 0,
                  capStatus: "Developing",
                  recentDelta: undefined
                }))).map((stat) => (
                  <tr key={stat.statKey} className="border-b border-stone-200">
                    <td className="py-2 pr-3 font-semibold">{stat.statKey}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span>{stat.current}</span>
                      {stat.recentDelta && (
                        <span
                          className={`ml-2 text-xs font-bold ${
                            stat.recentDelta.direction === "increase" ? "text-emerald-700" : "text-red-700"
                          }`}
                          aria-label={`Recent Growth ${stat.recentDelta.label}`}
                        >
                          {stat.recentDelta.label}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{stat.potential}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{stat.facilityCap}</td>
                    <td className="py-2 pl-3 text-right">
                      <span className="font-semibold tabular-nums">{stat.progressPercent}%</span>
                      <span className="ml-2 text-xs text-stone-500">{stat.capStatus}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-5 rounded-md border border-stone-200 bg-stone-50 p-3">
          <h3 className="text-sm font-semibold uppercase text-stone-500">Development</h3>
          <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-stone-600">Cumulative match XP</span>
              <span className="float-right font-bold tabular-nums">{player.development.matchXp}</span>
            </div>
            <div>
              <span className="text-stone-600">Cumulative training XP</span>
              <span className="float-right font-bold tabular-nums">{player.development.trainingXp}</span>
            </div>
            <div>
              <span className="text-stone-600">Last match XP</span>
              <span className="float-right font-bold tabular-nums">+{player.development.lastMatchXpGained}</span>
            </div>
            <div>
              <span className="text-stone-600">Last training XP</span>
              <span className="float-right font-bold tabular-nums">+{player.development.lastTrainingXpGained}</span>
            </div>
            <div>
              <span className="text-stone-600">Club Cap</span>
              <span className="float-right font-bold tabular-nums">{detail.developmentSummary?.developmentCap ?? "-"}</span>
            </div>
            <div>
              <span className="text-stone-600">Next Growth</span>
              <span className="float-right font-bold tabular-nums">{detail.developmentSummary?.nextProgressPercent ?? 0}%</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {detail.developmentSummary?.cappedByFacility && (
              <span className="rounded bg-orange-100 px-2 py-1 font-semibold text-orange-800">Facility capped</span>
            )}
            {detail.developmentSummary?.cappedByPotential && (
              <span className="rounded bg-stone-200 px-2 py-1 font-semibold text-stone-700">Potential capped</span>
            )}
            {detail.developmentSummary?.untappedPotential && (
              <span className="rounded bg-sky-100 px-2 py-1 font-semibold text-sky-800">Untapped potential</span>
            )}
          </div>
          <div className="mt-3 space-y-1 text-sm text-stone-700">
            <p className="text-xs font-semibold uppercase text-stone-500">Recent development history</p>
            {(detail.developmentSummary?.recentGrowth ?? []).slice(0, 3).map((growth, index) => (
              <p key={`${growth.statKey}-${index}`}>
                {growth.to - growth.from > 0 ? "+" : ""}{growth.to - growth.from} {growth.statKey} ({growth.from} to {growth.to})
              </p>
            ))}
            {(detail.developmentSummary?.recentGrowth.length ?? 0) === 0 && <p>No recent stat growth.</p>}
            {detail.developmentSummary?.notes.map((note) => (
              <p key={note} className="text-stone-600">{note}</p>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
