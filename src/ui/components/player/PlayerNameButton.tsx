import type { Player } from "../../../domain/types/player";

type PlayerNameButtonProps = {
  player: Player;
  clubTag?: string;
  position?: string;
  isOwnClub?: boolean;
  onClick: () => void;
};

export function PlayerNameButton({
  player,
  clubTag,
  position,
  isOwnClub = false,
  onClick
}: PlayerNameButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex max-w-full items-center gap-1.5 text-left font-semibold underline-offset-2 hover:underline ${
        isOwnClub ? "text-pitch-800" : "text-stone-800"
      }`}
    >
      <span className="truncate">{player.firstName} {player.lastName}</span>
      {clubTag && (
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${isOwnClub ? "bg-pitch-100 text-pitch-900" : "bg-stone-200 text-stone-700"}`}>
          {clubTag}
        </span>
      )}
      {position && <span className="text-xs font-medium text-stone-500">{position}</span>}
    </button>
  );
}
