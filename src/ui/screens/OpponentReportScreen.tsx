import { ArrowRight, ClipboardList } from "lucide-react";
import type { GameState } from "../../domain/types/game";
import { generateOppositionReport } from "../../domain/reports/generateOppositionReport";

type OpponentReportScreenProps = {
  gameState: GameState;
  fixtureId: string;
  onContinue: () => void;
};

function labelChanceType(chanceType: string): string {
  return chanceType.replace(/_/g, " ");
}

export function OpponentReportScreen({
  gameState,
  fixtureId,
  onContinue
}: OpponentReportScreenProps): JSX.Element {
  const report = generateOppositionReport({ gameState, fixtureId, playerClubId: gameState.playerClubId });
  const opponent = gameState.clubs[report.opponentClubId];

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-stone-300 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-stone-500">
              <ClipboardList className="h-4 w-4 text-pitch-700" aria-hidden="true" />
              Opposition Report
            </div>
            <h2 className="mt-2 text-2xl font-bold">{opponent.name}</h2>
            <p className="mt-1 text-sm text-stone-600">{report.summary}</p>
          </div>
          <div className="rounded border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
            <span className="font-medium">Report quality</span>
            <span className="ml-2 tabular-nums">{report.reportQuality}%</span>
          </div>
        </div>
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
          <button
            type="button"
            onClick={onContinue}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white transition hover:bg-pitch-700"
          >
            <span>Set Tactics</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}
