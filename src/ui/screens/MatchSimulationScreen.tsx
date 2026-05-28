import { useEffect, useMemo, useState } from "react";
import { ClipboardList, FastForward, Gauge, SkipForward } from "lucide-react";
import { type PlayerMatchContext } from "../../domain/player/playerSummaries";
import type { GameState } from "../../domain/types/game";
import type { MatchEvent } from "../../domain/types/match";
import type { DisplayTimelineEvent } from "../../domain/match-engine/displayTimeline";
import { getPlaybackFrame } from "../../domain/match-engine/playback";
import { PlayerDetailSheet } from "../components/player/PlayerDetailSheet";
import { PlayerNameButton } from "../components/player/PlayerNameButton";

type MatchSimulationScreenProps = {
  gameState: GameState;
  matchId: string;
  onViewReport: () => void;
};

export function MatchSimulationScreen({
  gameState,
  matchId,
  onViewReport
}: MatchSimulationScreenProps): JSX.Element {
  const match = gameState.matches[matchId];
  const homeClub = gameState.clubs[match.homeClubId];
  const awayClub = gameState.clubs[match.awayClubId];
  const [minute, setMinute] = useState(0);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedMatchContext, setSelectedMatchContext] = useState<PlayerMatchContext | undefined>(undefined);
  const playbackFrame = useMemo(() => getPlaybackFrame(match, minute, {
    getPlayerName: (playerId) => {
      const player = gameState.players[playerId];
      return player ? `${player.firstName} ${player.lastName}` : "The player";
    },
    getClubName: (clubId) => gameState.clubs[clubId]?.name ?? "the team"
  }), [gameState.clubs, gameState.players, match, minute]);
  const detailedEvents = playbackFrame.visibleEvents.filter((event) =>
    ["chance", "shot", "save", "rebound", "goal"].includes(event.type)
  );
  const latestGoalClub = playbackFrame.latestGoalEvent
    ? gameState.clubs[playbackFrame.latestGoalEvent.clubId]
    : undefined;
  const selectedPlayer = selectedPlayerId ? gameState.players[selectedPlayerId] : undefined;

  useEffect(() => {
    setMinute(0);
    setSpeed(1);
  }, [matchId]);

  useEffect(() => {
    if (minute >= 90) return undefined;

    const timer = window.setInterval(() => {
      setMinute((currentMinute) => Math.min(currentMinute + 1, 90));
    }, speed === 1 ? 500 : 250);

    return () => window.clearInterval(timer);
  }, [minute, speed]);

  function openEventPlayer(playerId: string): void {
    const stats = match.report.playerStats[playerId];
    const rating = match.report.playerRatings[playerId];
    const club = stats ? gameState.clubs[stats.clubId] : undefined;
    const opponentId = stats?.clubId === match.homeClubId ? match.awayClubId : match.homeClubId;
    setSelectedPlayerId(playerId);
    setSelectedMatchContext({
      matchId: match.id,
      clubName: club?.name ?? "Club",
      opponentName: gameState.clubs[opponentId]?.name ?? "Opponent",
      stats,
      rating
    });
  }

  function eventActors(event: MatchEvent): JSX.Element | null {
    const actorIds = [event.playerId, event.secondaryPlayerId].filter(
      (playerId, index, ids): playerId is string => Boolean(playerId) && ids.indexOf(playerId) === index
    );
    if (actorIds.length === 0) return null;

    return (
      <span className="mr-2 inline-flex flex-wrap items-center gap-1">
        {actorIds.map((playerId) => {
          const player = gameState.players[playerId];
          const stats = match.report.playerStats[playerId];
          if (!player) return null;
          const club = stats ? gameState.clubs[stats.clubId] : undefined;
          return (
            <PlayerNameButton
              key={playerId}
              player={player}
              clubTag={club?.shortName}
              position={stats?.position}
              isOwnClub={stats?.clubId === gameState.playerClubId}
              onClick={() => openEventPlayer(playerId)}
            />
          );
        })}
      </span>
    );
  }

  function displayEventActors(event: DisplayTimelineEvent): JSX.Element | null {
    const actorIds = [event.primaryPlayerId, event.secondaryPlayerId].filter(
      (playerId, index, ids): playerId is string => Boolean(playerId) && ids.indexOf(playerId) === index
    );
    if (actorIds.length === 0) return null;

    return (
      <span className="mr-2 inline-flex flex-wrap items-center gap-1">
        {actorIds.map((playerId) => {
          const player = gameState.players[playerId];
          const stats = match.report.playerStats[playerId];
          if (!player) return null;
          const club = stats ? gameState.clubs[stats.clubId] : undefined;
          return (
            <PlayerNameButton
              key={playerId}
              player={player}
              clubTag={club?.shortName}
              position={stats?.position}
              isOwnClub={stats?.clubId === gameState.playerClubId}
              onClick={() => openEventPlayer(playerId)}
            />
          );
        })}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      <section
        className={`rounded-md border bg-white p-4 text-center transition ${
          playbackFrame.hasGoalAtCurrentMinute
            ? "border-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.25)]"
            : "border-stone-300"
        }`}
      >
        <p className="text-sm font-medium text-stone-500">
          {playbackFrame.isFullTime ? "Full Time" : `Minute ${playbackFrame.minute}'`}
        </p>
        {playbackFrame.hasGoalAtCurrentMinute && latestGoalClub && (
          <div className="mx-auto mt-2 w-fit rounded-full bg-amber-400 px-4 py-1 text-sm font-black uppercase tracking-wide text-stone-950 animate-pulse">
            Goal - {latestGoalClub.shortName}
          </div>
        )}
        <h2
          className={`mt-2 text-3xl font-bold transition ${
            playbackFrame.hasGoalAtCurrentMinute ? "scale-[1.02] text-amber-700" : "text-stone-950"
          }`}
        >
          {homeClub.name} {playbackFrame.homeGoals}-{playbackFrame.awayGoals} {awayClub.name}
        </h2>
        <div className="mt-4 h-2 overflow-hidden rounded bg-stone-200">
          <div
            className="h-full bg-pitch-700 transition-all"
            style={{ width: `${(playbackFrame.minute / 90) * 100}%` }}
          />
        </div>
      </section>

      <section className="rounded-md border border-stone-300 bg-white p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold">Match Timeline</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSpeed((currentSpeed) => (currentSpeed === 1 ? 2 : 1))}
              className="flex h-10 items-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              <Gauge className="h-4 w-4" aria-hidden="true" />
              <span>{speed === 1 ? "1x Speed" : "2x Speed"}</span>
            </button>
            {!playbackFrame.isFullTime && (
              <button
                type="button"
                onClick={() => setMinute(90)}
                className="flex h-10 items-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
              >
                <SkipForward className="h-4 w-4" aria-hidden="true" />
                <span>Skip Result</span>
              </button>
            )}
            {playbackFrame.isFullTime && (
              <button
                type="button"
                onClick={onViewReport}
                className="flex h-10 items-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white transition hover:bg-pitch-700"
              >
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                <span>View Report</span>
              </button>
            )}
          </div>
        </div>
        {!playbackFrame.isFullTime && (
          <div className="mb-3 flex items-center gap-2 rounded border border-pitch-100 bg-pitch-50 px-3 py-2 text-sm text-pitch-900">
            <FastForward className="h-4 w-4" aria-hidden="true" />
            <span>Events are revealed as the match clock reaches their minute. The result is already calculated.</span>
          </div>
        )}
        <div className="max-h-[520px] space-y-2 overflow-y-auto">
          {playbackFrame.visibleDisplayEvents.length === 0 && (
            <div className="rounded border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
              Waiting for the first notable event...
            </div>
          )}
          {playbackFrame.visibleDisplayEvents.map((event) => {
            const eventClub = gameState.clubs[event.clubId];
            const isCurrentGoal = event.isGoal && event.minute === playbackFrame.minute;
            const isOwnClub = event.clubId === gameState.playerClubId;

            return (
              <div
                key={event.id}
                className={`rounded border px-3 py-2 text-sm transition ${
                  event.isGoal
                    ? `border-amber-300 bg-amber-50 font-semibold ${isCurrentGoal ? "animate-pulse" : ""}`
                    : isOwnClub
                      ? "border-pitch-200 bg-pitch-50"
                      : "border-stone-200 bg-stone-50"
                }`}
              >
                <span className="mr-3 inline-block w-10 font-semibold tabular-nums">{event.minute}'</span>
                <span className="mr-2 rounded bg-stone-200 px-2 py-0.5 text-xs font-bold text-stone-700">
                  {eventClub?.shortName ?? "CLB"}
                </span>
                {event.isGoal && (
                  <span className="mr-2 rounded bg-amber-400 px-2 py-0.5 text-xs font-black text-stone-950">GOAL</span>
                )}
                {event.isBigChance && !event.isGoal && (
                  <span className="mr-2 rounded bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-800">Big chance</span>
                )}
                {displayEventActors(event)}
                <span>{event.text}</span>
                {event.xg !== undefined && (
                  <span className="ml-2 text-xs font-medium text-stone-500">xG {event.xg.toFixed(2)}</span>
                )}
              </div>
            );
          })}
        </div>
        <details className="mt-4 rounded border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
          <summary className="cursor-pointer font-semibold text-stone-700">Show detailed event log</summary>
          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {detailedEvents.length === 0 && <p className="text-stone-600">No raw events revealed yet.</p>}
            {detailedEvents.map((event, index) => {
              const isGoal = event.type === "goal";

              return (
                <div
                  key={`${event.minute}-${event.type}-${index}`}
                  className={`rounded border px-3 py-2 text-sm transition ${
                    isGoal ? "border-amber-300 bg-amber-50 font-semibold" : "border-stone-200 bg-white"
                  }`}
                >
                  <span className="mr-3 inline-block w-10 font-semibold tabular-nums">{event.minute}'</span>
                  {isGoal && (
                    <span className="mr-2 rounded bg-amber-400 px-2 py-0.5 text-xs font-black text-stone-950">GOAL</span>
                  )}
                  {eventActors(event)}
                  <span>{event.description}</span>
                  {event.xg !== undefined && (
                    <span className="ml-2 text-xs font-medium text-stone-500">xG {event.xg.toFixed(2)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      </section>

      {selectedPlayer && (
        <PlayerDetailSheet
          player={selectedPlayer}
          gameState={gameState}
          matchContext={selectedMatchContext}
          onClose={() => {
            setSelectedPlayerId(null);
            setSelectedMatchContext(undefined);
          }}
        />
      )}
    </div>
  );
}
