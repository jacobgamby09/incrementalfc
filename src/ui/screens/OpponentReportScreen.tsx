import { useState, useEffect } from "react";
import { ArrowRight, ClipboardList } from "lucide-react";
import type { GameState } from "../../domain/types/game";
import { generateOppositionReport } from "../../domain/reports/generateOppositionReport";
import { calculateClubStrength } from "../../domain/league/clubStrength";
import { calculateStadiumAttendance } from "../../domain/economy/stadiumAttendance";
import { formatCurrency, formatNumber } from "../../utils/format";

type OpponentReportScreenProps = {
  gameState: GameState;
  fixtureId: string;
  onContinue: () => void;
  onPlayMatch: () => void;
};

function labelChanceType(chanceType: string): string {
  return chanceType.replace(/_/g, " ");
}

export function OpponentReportScreen({
  gameState,
  fixtureId,
  onContinue,
  onPlayMatch
}: OpponentReportScreenProps): JSX.Element {
  const report = generateOppositionReport({ gameState, fixtureId, playerClubId: gameState.playerClubId });
  const fixture = gameState.seasons[gameState.currentSeasonId].fixtures.find((candidate) => candidate.id === fixtureId);
  const playerClub = gameState.clubs[gameState.playerClubId];
  const opponent = gameState.clubs[report.opponentClubId];
  const { stars, rank } = calculateClubStrength(gameState, opponent.id);
  const isHomeFixture = fixture?.homeClubId === playerClub.id;
  const attendance = isHomeFixture ? calculateStadiumAttendance(playerClub, opponent) : undefined;
  const stadiumCapacity = playerClub.facilities.stadium.effects.stadiumCapacity ?? 1_000;
  const occupancyPercent = attendance ? Math.round(attendance.occupancyRate * 100) : 0;

  const [animatedPercent, setAnimatedPercent] = useState(0);

  useEffect(() => {
    if (attendance) {
      setAnimatedPercent(0);
      const timer = setTimeout(() => {
        setAnimatedPercent(occupancyPercent);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedPercent(0);
    }
  }, [occupancyPercent, isHomeFixture]);

  const isSoldOut = occupancyPercent >= 100;
  const showMaxEffect = isSoldOut && animatedPercent >= 100;

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-stone-300 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-stone-500">
              <ClipboardList className="h-4 w-4 text-pitch-700" aria-hidden="true" />
              Opposition Report
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-bold">{opponent.name}</h2>
              <div className="flex items-center gap-0.5" title={`Club paper strength: Rank ${rank} of 10 in the league`}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <span
                    key={index}
                    className={`text-lg leading-none ${
                      index < stars ? "text-amber-500 font-semibold" : "text-stone-300"
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-1 text-sm text-stone-600">{report.summary}</p>
          </div>
          <div className="rounded border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
            <span className="font-medium">Report quality</span>
            <span className="ml-2 tabular-nums">{report.reportQuality}%</span>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-stone-300 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-stone-500">Matchday Attendance</p>
            <h3 className="mt-1 text-lg font-semibold">
              {attendance
                ? `${formatNumber(attendance.attendance)} / ${formatNumber(stadiumCapacity)} seats filled`
                : "Away fixture"}
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              {attendance
                ? `Expected gate receipts: ${formatCurrency(attendance.gateReceipts)}`
                : "No home gate receipts for this matchday."}
            </p>
          </div>
          {attendance && (
            <div className="flex flex-col items-end gap-1">
              <span className={`text-sm font-bold tabular-nums transition-all duration-500 ${showMaxEffect ? "text-amber-600 scale-110 font-black" : "text-pitch-800"}`}>
                {occupancyPercent}% full
              </span>
              {showMaxEffect && (
                <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-800 border border-amber-300 uppercase tracking-wider animate-bounce">
                  ⚡ SOLD OUT
                </span>
              )}
            </div>
          )}
        </div>
        {attendance && (
          <div className="mt-3 h-3 w-full bg-stone-200 rounded-full relative" aria-label={`Expected stadium occupancy ${occupancyPercent}%`}>
            <div
              className={`h-full rounded-full transition-all duration-[1200ms] ease-out ${
                showMaxEffect 
                  ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)] animate-pulse" 
                  : "bg-pitch-700"
              }`}
              style={{ width: `${animatedPercent}%` }}
            />
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <h3 className="font-semibold">Estimated Strengths</h3>
          <ul className="mt-3 space-y-2 text-sm text-stone-700">
            {report.estimatedStrengths.map((strength) => (
              <li key={strength}>{strength}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <h3 className="font-semibold">Estimated Weaknesses</h3>
          <ul className="mt-3 space-y-2 text-sm text-stone-700">
            {report.estimatedWeaknesses.map((weakness) => (
              <li key={weakness}>{weakness}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <h3 className="font-semibold">Chance Profile Clues</h3>
          <div className="mt-3 space-y-2 text-sm">
            {Object.entries(report.chanceProfile ?? {}).map(([chanceType, value]) => (
              <div key={chanceType} className="flex justify-between gap-3">
                <span className="capitalize text-stone-700">{labelChanceType(chanceType)}</span>
                <span className="font-medium tabular-nums">{value}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-md border border-stone-300 bg-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-semibold">Considerations</h3>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-stone-700 lg:flex-row lg:gap-4">
              {report.recommendedConsiderations.map((consideration) => (
                <li key={consideration}>{consideration}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onContinue}
              className="flex h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              <span>Set Tactics</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onPlayMatch}
              className="flex h-10 items-center justify-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white transition hover:bg-pitch-700"
            >
              <span>Simulate Match</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
