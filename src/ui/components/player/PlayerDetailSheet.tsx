import { X } from "lucide-react";
import { getPlayerFitness, getReadinessLabel, getReadinessColor } from "../../../domain/fitness/playerFitness";
import { getPlayerDetailView, type GetPlayerDetailViewOptions } from "../../../domain/player/getPlayerDetailView";
import type { PlayerMatchContext } from "../../../domain/player/playerSummaries";
import type { GameState } from "../../../domain/types/game";
import type { Player, PlayerPosition } from "../../../domain/types/player";
import { formatCurrency } from "../../../utils/format";
import { StatLabel } from "./StatLabel";
import {
  formatScoutedPotential,
  formatScoutedValue,
  getScoutedStatReport,
  type ScoutedPotentialReport
} from "../../../domain/scouting/scoutedPotential";
import { squadRoleLabels } from "../../../domain/player/playerContext";
import { MoraleIndicator } from "./MoraleIndicator";
import { saleStrategyProfiles } from "../../../data/constants/transferProfiles";

type PlayerDetailSheetProps = {
  player: Player;
  gameState?: GameState;
  selectedSlotPosition?: PlayerPosition;
  matchContext?: PlayerMatchContext;
  scoutedPotential?: ScoutedPotentialReport;
  onAllocateDevelopmentPoint?: (playerId: string, statKey: string) => void;
  onClose: () => void;
};

const nationalityCodes: Record<string, string> = {
  "England": "gb-eng",
  "France": "fr",
  "Brazil": "br",
  "Netherlands": "nl",
  "Spain": "es",
  "Germany": "de",
  "Portugal": "pt",
  "Argentina": "ar",
  "Belgium": "be",
  "Wales": "gb-wls",
  "Italy": "it",
  "Denmark": "dk",
  "Scotland": "gb-sct",
  "Sweden": "se",
  "Republic of Ireland": "ie",
  "Nigeria": "ng",
  "Norway": "no",
  "Senegal": "sn",
  "Cote d'Ivoire": "ci",
  "Northern Ireland": "gb-nir",
  "Morocco": "ma",
  "Serbia": "rs",
  "Switzerland": "ch",
  "United States": "us",
  "Congo DR": "cd"
};

function getFlagUrl(nationality: string): string | null {
  const code = nationalityCodes[nationality];
  if (!code) return null;
  return `https://flagcdn.com/w80/${code}.png`;
}

export function PlayerDetailSheet({
  player,
  gameState,
  selectedSlotPosition,
  matchContext,
  scoutedPotential,
  onAllocateDevelopmentPoint,
  onClose
}: PlayerDetailSheetProps): JSX.Element {
  const detailOptions: GetPlayerDetailViewOptions = {
    gameState,
    selectedSlotPosition,
    matchContext
  };
  const detail = getPlayerDetailView(player, detailOptions);
  const flagUrl = getFlagUrl(detail.nationality);
  const unspentDevelopmentPoints = detail.developmentSummary?.unspentDevelopmentPoints ?? 0;
  const scoutingClub = scoutedPotential && gameState ? gameState.clubs[gameState.playerClubId] : undefined;

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
            <p className="mt-1 flex items-center text-sm text-stone-600">
              Age {detail.age} / {detail.nationality}
              {flagUrl && (
                <img
                  src={flagUrl}
                  alt={`${detail.nationality} flag`}
                  className="ml-2 h-3.5 w-5 rounded-sm object-cover shadow-sm border border-stone-200"
                  loading="lazy"
                />
              )}
            </p>
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
            <p className="mt-1 text-lg font-bold tabular-nums">{Math.round(detail.ovr)}</p>
          </div>
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold uppercase text-stone-500">{scoutedPotential ? "Est. POT" : "POT"}</p>
            <p className="mt-1 text-lg font-bold tabular-nums">
              {scoutedPotential ? formatScoutedPotential(scoutedPotential) : Math.round(detail.estimatedPot)}
            </p>
            {scoutedPotential && <p className="mt-1 text-xs font-semibold text-stone-500">{scoutedPotential.confidence} confidence</p>}
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

        {!scoutedPotential && unspentDevelopmentPoints > 0 && (
          <section className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-emerald-800">Development Point Ready</p>
                <p className="mt-1 text-sm text-emerald-950">
                  Assign {unspentDevelopmentPoints} point{unspentDevelopmentPoints === 1 ? "" : "s"} to any eligible stat below.
                </p>
              </div>
              <span className="rounded bg-emerald-700 px-2.5 py-1 text-sm font-bold text-white tabular-nums">
                {unspentDevelopmentPoints}
              </span>
            </div>
          </section>
        )}

        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold uppercase text-stone-500">Squad Role</p>
            <p className="mt-1 text-sm font-bold">{squadRoleLabels[detail.squadRole]}</p>
          </div>
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold uppercase text-stone-500">Morale</p>
            <div className="mt-1">
              <MoraleIndicator morale={detail.morale} />
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-stone-600">Readiness</span>
            <span className={`font-bold ${getReadinessColor(getPlayerFitness(player)).text}`}>
              {getReadinessLabel(getPlayerFitness(player))} ({getPlayerFitness(player)}%)
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full rounded bg-stone-200 overflow-hidden">
            <div
              className="h-full rounded transition-all duration-300"
              style={{
                width: `${getPlayerFitness(player)}%`,
                backgroundColor: getReadinessColor(getPlayerFitness(player)).hex,
              }}
            />
          </div>
        </section>

        <section className="mt-4 rounded-md border border-sky-200 bg-sky-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-sky-800">Best Tactical Fits</p>
              <p className="mt-1 text-xs text-sky-900">
                Estimated from current attributes and positional role.
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {detail.tacticalFits.map((fit, index) => (
              <div key={fit.focus}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-sky-950">
                    {index + 1}. {fit.label}
                  </span>
                  <span className="font-bold tabular-nums text-sky-950">{fit.score}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-sky-100">
                  <div className="h-full rounded-full bg-sky-600" style={{ width: `${fit.score}%` }} />
                </div>
                <p className="mt-1 text-[11px] font-medium text-sky-800">Key stats: {fit.primaryStats.join(", ")}</p>
              </div>
            ))}
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

        <section className="mt-4 rounded-md border border-stone-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-stone-500">Season Stats</p>
          <div className="mt-2 grid grid-cols-4 gap-2 text-sm">
            <div><span className="text-stone-500">Apps</span><p className="font-bold tabular-nums">{detail.performance?.apps ?? 0}</p></div>
            <div><span className="text-stone-500">Goals</span><p className="font-bold tabular-nums">{detail.performance?.goals ?? 0}</p></div>
            <div><span className="text-stone-500">Assists</span><p className="font-bold tabular-nums">{detail.performance?.assists ?? 0}</p></div>
            <div><span className="text-stone-500">Avg Rating</span><p className="font-bold tabular-nums">{detail.performance?.display.avgRating ?? "-"}</p></div>
          </div>
          {(detail.seasonHistory?.length ?? 0) > 0 && (
            <div className="mt-3 overflow-x-auto border-t border-stone-200 pt-3">
              <p className="text-xs font-semibold uppercase text-stone-500">Season History</p>
              <table className="mt-2 min-w-full text-left text-xs">
                <thead className="text-stone-500">
                  <tr>
                    <th className="py-1 pr-2 font-semibold">Season</th>
                    <th className="px-2 py-1 text-right font-semibold">Apps</th>
                    <th className="px-2 py-1 text-right font-semibold">Goals</th>
                    <th className="px-2 py-1 text-right font-semibold">Assists</th>
                    <th className="py-1 pl-2 text-right font-semibold">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.seasonHistory!.map((summary) => (
                    <tr key={summary.seasonId} className="border-t border-stone-100">
                      <td className="py-1 pr-2 font-semibold">Season {summary.seasonNumber}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{summary.apps}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{summary.goals}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{summary.assists}</td>
                      <td className="py-1 pl-2 text-right tabular-nums">{summary.display.avgRating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

        <section className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold uppercase text-stone-500">Weekly Wage</p>
            <p className="mt-1 text-lg font-bold">{formatCurrency(detail.wagePerWeek)}</p>
          </div>
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold uppercase text-stone-500">Market Value</p>
            <p className="mt-1 text-lg font-bold">{formatCurrency(detail.marketValue)}</p>
          </div>
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold uppercase text-stone-500">Contract</p>
            <p className="mt-1 text-lg font-bold">
              {detail.contractSeasonsRemaining} season{detail.contractSeasonsRemaining === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold uppercase text-stone-500">Market Rep</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{detail.marketReputation}</p>
          </div>
        </section>

        {player.transferIntent.isListed && (
          <section className="mt-4 rounded-md border border-sky-200 bg-sky-50 p-3">
            <p className="text-xs font-semibold uppercase text-sky-800">Transfer Listing</p>
            <p className="mt-1 text-sm font-bold text-sky-950">
              {saleStrategyProfiles[player.transferIntent.saleStrategy ?? "market_price"].label}
              {" "} - {formatCurrency(player.transferIntent.askingPrice)}
            </p>
            <p className="mt-1 text-sm text-sky-900">
              {saleStrategyProfiles[player.transferIntent.saleStrategy ?? "market_price"].description}
            </p>
          </section>
        )}

        <section className="mt-5">
          <h3 className="text-sm font-semibold uppercase text-stone-500">{scoutedPotential ? "Player Attributes" : "Stat Development"}</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-stone-300 text-xs uppercase text-stone-500">
                  <th className="py-2 pr-3 font-semibold">Stat</th>
                  <th className="px-3 py-2 text-right font-semibold">{scoutedPotential ? "Estimated" : "Current"}</th>
                  {!scoutedPotential && <th className="px-3 py-2 text-right font-semibold">Potential</th>}
                  {!scoutedPotential && <th className="px-3 py-2 text-right font-semibold">Facility Cap</th>}
                  {!scoutedPotential && <th className="py-2 pl-3 text-right font-semibold">Action / Status</th>}
                </tr>
              </thead>
              <tbody>
                {(detail.developmentSummary?.statRows ?? detail.currentStats.map((stat) => ({
                  statKey: stat.key,
                  current: stat.current,
                  potential: stat.potential,
                  facilityCap: "-",
                  canAllocate: false,
                  progressPercent: 0,
                  potentialPercent: 0,
                  facilityCapPercent: 0,
                  capStatus: "Developing",
                  recentDelta: undefined
                }))).map((stat) => (
                  <tr key={stat.statKey} className="border-b border-stone-200">
                    <td className="py-2 pr-3 font-semibold">
                      <StatLabel code={stat.statKey} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span>
                        {scoutingClub
                          ? formatScoutedValue(getScoutedStatReport(Number(stat.current), scoutingClub))
                          : stat.current}
                      </span>
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
                    {!scoutedPotential && <td className="px-3 py-2 text-right tabular-nums">{stat.potential}</td>}
                    {!scoutedPotential && <td className="px-3 py-2 text-right tabular-nums">{stat.facilityCap}</td>}
                    {!scoutedPotential && <td className="py-2 pl-3 text-right">
                      {stat.canAllocate && onAllocateDevelopmentPoint ? (
                        <button
                          type="button"
                          onClick={() => onAllocateDevelopmentPoint(player.id, stat.statKey)}
                          className="rounded-md border border-emerald-600 bg-emerald-600 px-2 py-1 text-xs font-bold text-white transition hover:bg-emerald-700"
                        >
                          +1
                        </button>
                      ) : (
                        <>
                          <span className="text-xs font-semibold text-stone-500">{stat.capStatus}</span>
                        </>
                      )}
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {!scoutedPotential && <section className="mt-5 rounded-md border border-stone-200 bg-stone-50 p-3">
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
              <span className="text-stone-600">Next Point</span>
              <span className="float-right font-bold tabular-nums">{detail.developmentSummary?.nextProgressPercent ?? 0}%</span>
            </div>
            <div>
              <span className="text-stone-600">Unspent Points</span>
              <span className="float-right font-bold tabular-nums">{unspentDevelopmentPoints}</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {detail.developmentSummary?.cappedByFacility && (
              <span className="rounded bg-orange-100 px-2 py-1 font-semibold text-orange-800">Facility limited</span>
            )}
            {detail.developmentSummary?.cappedByPotential && (
              <span className="rounded bg-stone-200 px-2 py-1 font-semibold text-stone-700">Potential reached</span>
            )}
            {detail.developmentSummary?.untappedPotential && (
              <span className="rounded bg-sky-100 px-2 py-1 font-semibold text-sky-800">Untapped potential</span>
            )}
            {player.age >= 30 && (
              <span className="rounded bg-rose-100 px-2 py-1 font-semibold text-rose-800">Declining</span>
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
        </section>}
      </aside>
    </div>
  );
}
