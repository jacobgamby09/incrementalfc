import { getStatDefinition } from "../../../domain/player/statDefinitions";

type StatLabelProps = {
  code: string;
  onClick?: () => void;
  suffix?: string;
};

export function StatLabel({ code, onClick, suffix = "" }: StatLabelProps): JSX.Element {
  const definition = getStatDefinition(code);
  if (!definition) return <span>{code}</span>;

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        className="rounded px-1 font-semibold underline decoration-dotted underline-offset-4 focus:outline-none focus:ring-2 focus:ring-pitch-500"
        aria-describedby={`stat-${definition.code}-tooltip`}
        aria-label={onClick ? `Sort by ${definition.code}` : undefined}
      >
        {definition.code}{suffix}
      </button>
      <span
        id={`stat-${definition.code}-tooltip`}
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden w-64 rounded-md border border-stone-300 bg-white p-3 text-left text-xs normal-case text-stone-700 shadow-xl group-focus-within:block group-hover:block"
      >
        <span className="block font-bold text-stone-950">{definition.code} - {definition.name}</span>
        <span className="mt-1 block">{definition.description}</span>
        <span className="mt-2 block text-stone-500">{definition.matchEngineUsage}</span>
      </span>
    </span>
  );
}
