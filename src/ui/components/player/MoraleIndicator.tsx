import { ArrowDown, ArrowUp, ChevronsDown, ChevronsUp, Minus } from "lucide-react";
import { getMoraleBand, moraleBandLabels } from "../../../domain/player/playerContext";

type MoraleIndicatorProps = {
  morale: number;
  compact?: boolean;
};

export function MoraleIndicator({ morale, compact = false }: MoraleIndicatorProps): JSX.Element {
  const band = getMoraleBand(morale);
  const label = moraleBandLabels[band];
  const styles = {
    thriving: "border-emerald-300 bg-emerald-50 text-emerald-800",
    happy: "border-green-300 bg-green-50 text-green-800",
    content: "border-amber-300 bg-amber-50 text-amber-800",
    frustrated: "border-red-300 bg-red-50 text-red-700",
    disengaged: "border-red-400 bg-red-100 text-red-900"
  }[band];
  const Icon = {
    thriving: ChevronsUp,
    happy: ArrowUp,
    content: Minus,
    frustrated: ArrowDown,
    disengaged: ChevronsDown
  }[band];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-semibold ${styles}`}
      title={`${label} morale (${morale}/100)`}
      aria-label={`${label} morale ${morale} out of 100`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {!compact && <span>{label}</span>}
    </span>
  );
}
