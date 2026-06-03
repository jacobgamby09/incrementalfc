import { useEffect, useMemo, useState } from "react";
import { ClipboardList, FastForward, Gauge, SkipForward } from "lucide-react";
import { type PlayerMatchContext } from "../../domain/player/playerSummaries";
import type { GameState } from "../../domain/types/game";
import type { MatchEvent } from "../../domain/types/match";
import type { DisplayTimelineEvent } from "../../domain/match-engine/displayTimeline";
import { getPlaybackFrame } from "../../domain/match-engine/playback";
import { PlayerDetailSheet } from "../components/player/PlayerDetailSheet";
import { PlayerNameButton } from "../components/player/PlayerNameButton";
import { createVisibleMatchStats } from "../../domain/match-engine/liveMatchStats";
import { createKeyMoments } from "../../domain/match-engine/keyMoments";

type MatchSimulationScreenProps = {
  gameState: GameState;
  matchId: string;
  onViewReport: () => void;
};

type StatRowProps = {
  label: string;
  homeValue: string | number;
  awayValue: string | number;
  homePercent: number;
};

function StatRow({ label, homeValue, awayValue, homePercent }: StatRowProps) {
  const awayPercent = 100 - homePercent;
  return (
    <div className="flex flex-col py-3 border-b border-stone-100 last:border-0">
      <div className="flex justify-between items-center text-sm font-semibold mb-1.5">
        <span className="w-16 text-left text-stone-900 tabular-nums">{homeValue}</span>
        <span className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</span>
        <span className="w-16 text-right text-stone-900 tabular-nums">{awayValue}</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded bg-stone-100 flex">
        <div
          className="h-full bg-pitch-700 transition-all duration-500 ease-out"
          style={{ width: `${homePercent}%` }}
        />
        <div className="w-0.5 bg-white h-full z-10" />
        <div
          className="h-full bg-stone-300 transition-all duration-500 ease-out"
          style={{ width: `${awayPercent}%` }}
        />
      </div>
    </div>
  );
}

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

  const liveStats = useMemo(() => {
    return createVisibleMatchStats(match, playbackFrame.visibleEvents);
  }, [match, playbackFrame.visibleEvents]);

  const keyMoments = useMemo(() => {
    return createKeyMoments(
      match,
      playbackFrame.visibleEvents,
      {
        getPlayerName: (playerId) => {
          const player = gameState.players[playerId];
          return player ? `${player.firstName} ${player.lastName}` : "The player";
        },
        getClubName: (clubId) => gameState.clubs[clubId]?.name ?? "the team",
        getClubShortName: (clubId) => gameState.clubs[clubId]?.shortName ?? "CLB"
      }
    );
  }, [gameState.clubs, gameState.players, match, playbackFrame.visibleEvents]);

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

  // Stat percentage helpers
  const possessionPercent = liveStats.home.possession;
  
  const shotsTotal = liveStats.home.shots + liveStats.away.shots;
  const shotsPercent = shotsTotal === 0 ? 50 : (liveStats.home.shots / shotsTotal) * 100;

  const sotTotal = liveStats.home.shotsOnTarget + liveStats.away.shotsOnTarget;
  const sotPercent = sotTotal === 0 ? 50 : (liveStats.home.shotsOnTarget / sotTotal) * 100;

  const xgTotal = liveStats.home.xg + liveStats.away.xg;
  const xgPercent = xgTotal === 0 ? 50 : (liveStats.home.xg / xgTotal) * 100;

  const savesTotal = liveStats.home.saves + liveStats.away.saves;
  const savesPercent = savesTotal === 0 ? 50 : (liveStats.home.saves / savesTotal) * 100;

  const stopsTotal = liveStats.home.defensiveStops + liveStats.away.defensiveStops;
  const stopsPercent = stopsTotal === 0 ? 50 : (liveStats.home.defensiveStops / stopsTotal) * 100;

  // Filter key moments per club
  const homeMoments = useMemo(() => {
    return keyMoments.filter(m => m.clubId === match.homeClubId);
  }, [keyMoments, match.homeClubId]);

  const awayMoments = useMemo(() => {
    return keyMoments.filter(m => m.clubId === match.awayClubId);
  }, [keyMoments, match.awayClubId]);

  function renderTopKeyMoment(moment: any) {
    const player = moment.playerId ? gameState.players[moment.playerId] : undefined;
    const secondaryPlayer = moment.secondaryPlayerId ? gameState.players[moment.secondaryPlayerId] : undefined;
    const isCurrentGoal = moment.type === "goal" && moment.minute === playbackFrame.minute;

    let typeLabel = "";
    if (moment.type === "goal") typeLabel = "Goal";
    else if (moment.type === "big_chance") typeLabel = "Big chance";
    else if (moment.type === "yellow_card") typeLabel = "Yellow card";
    else if (moment.type === "red_card") typeLabel = "Red card";

    return (
      <div
        key={moment.id}
        className={`flex items-center justify-center gap-1.5 text-xs text-stone-700 transition-all duration-300 py-0.5 ${
          isCurrentGoal ? "animate-pulse font-bold text-amber-600 scale-[1.01]" : ""
        }`}
      >
        <span className="font-bold text-stone-400 tabular-nums">{moment.minute}'</span>
        
        {/* Tiny Visual Indicators */}
        {moment.type === "goal" && <span className="text-xs" title="Goal">⚽</span>}
        {moment.type === "yellow_card" && <span className="inline-block w-2.5 h-3.5 bg-amber-400 border border-amber-500 rounded-[1px]" title="Yellow Card" />}
        {moment.type === "red_card" && <span className="inline-block w-2.5 h-3.5 bg-red-600 border border-red-700 rounded-[1px]" title="Red Card" />}
        
        <span className="text-stone-500 font-medium">{typeLabel}:</span>

        {player ? (
          <PlayerNameButton
            player={player}
            isOwnClub={moment.clubId === gameState.playerClubId}
            onClick={() => openEventPlayer(player.id)}
          />
        ) : (
          <span className="font-medium">{moment.playerName}</span>
        )}

        {moment.type === "goal" && secondaryPlayer && (
          <span className="text-stone-400 font-normal ml-0.5 flex items-center gap-1">
            (assist:
            <PlayerNameButton
              player={secondaryPlayer}
              isOwnClub={moment.secondaryPlayerId ? match.report.playerStats[moment.secondaryPlayerId]?.clubId === gameState.playerClubId : false}
              onClick={() => openEventPlayer(secondaryPlayer.id)}
            />
            )
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scorecard Header & Split Key Moments */}
      <section
        className={`rounded-md border bg-white p-4 transition ${
          playbackFrame.hasGoalAtCurrentMinute
            ? "border-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.25)]"
            : "border-stone-300"
        }`}
      >
        <div className="text-center">
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
        </div>

        {/* Split Key Moments Feed */}
        {keyMoments.length === 0 ? (
          <p className="text-xs text-stone-400 italic mt-3 pt-3 border-t border-stone-100 text-center select-none">
            No key moments yet
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-6 mt-3 pt-3 border-t border-stone-100">
            {/* Home Moments (Centered) */}
            <div className="space-y-1.5 border-r border-stone-100 pr-4 flex flex-col items-center">
              {homeMoments.map(renderTopKeyMoment)}
            </div>
            {/* Away Moments (Centered) */}
            <div className="space-y-1.5 pl-4 flex flex-col items-center">
              {awayMoments.map(renderTopKeyMoment)}
            </div>
          </div>
        )}

        <div className="mt-4 h-2 overflow-hidden rounded bg-stone-200">
          <div
            className="h-full bg-pitch-700 transition-all"
            style={{ width: `${(playbackFrame.minute / 90) * 100}%` }}
          />
        </div>
      </section>

      {/* Control Bar (Speed controls, skip, and report flow) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-md border border-stone-300">
        <span className="text-sm font-semibold text-stone-700 flex items-center gap-2">
          {!playbackFrame.isFullTime && (
            <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          )}
          {playbackFrame.isFullTime ? "Match Concluded" : "Match Live Simulation"}
        </span>
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
        <div className="flex items-center gap-2 rounded border border-pitch-100 bg-pitch-50 px-3 py-2 text-sm text-pitch-900">
          <FastForward className="h-4 w-4" aria-hidden="true" />
          <span>Events are revealed as the match clock reaches their minute. The result is already calculated.</span>
        </div>
      )}

      {/* Centered Live Match Stats VS Panel */}
      <div className="max-w-2xl mx-auto w-full">
        <section className="rounded-md border border-stone-300 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900 border-b border-stone-100 pb-2 mb-3 text-center">
            Live Match Stats
          </h3>
          <div className="space-y-1">
            <StatRow
              label="Possession"
              homeValue={`${liveStats.home.possession}%`}
              awayValue={`${liveStats.away.possession}%`}
              homePercent={possessionPercent}
            />
            <StatRow
              label="Shots"
              homeValue={liveStats.home.shots}
              awayValue={liveStats.away.shots}
              homePercent={shotsPercent}
            />
            <StatRow
              label="Shots on Target"
              homeValue={liveStats.home.shotsOnTarget}
              awayValue={liveStats.away.shotsOnTarget}
              homePercent={sotPercent}
            />
            <StatRow
              label="Expected Goals (xG)"
              homeValue={liveStats.home.xg.toFixed(2)}
              awayValue={liveStats.away.xg.toFixed(2)}
              homePercent={xgPercent}
            />
            <StatRow
              label="Saves"
              homeValue={liveStats.home.saves}
              awayValue={liveStats.away.saves}
              homePercent={savesPercent}
            />
            <StatRow
              label="Defensive Stops"
              homeValue={liveStats.home.defensiveStops}
              awayValue={liveStats.away.defensiveStops}
              homePercent={stopsPercent}
            />
          </div>
          <div className="mt-4 pt-3 border-t border-stone-150 flex items-center justify-between text-xs text-stone-400 font-medium font-sans px-1">
            <span className="truncate max-w-[200px]" title={homeClub.name}>{homeClub.name}</span>
            <span className="text-stone-300 font-bold">VS</span>
            <span className="truncate max-w-[200px] text-right" title={awayClub.name}>{awayClub.name}</span>
          </div>
        </section>
      </div>

      {/* Detailed Event Log (Collapsible Timeline) */}
      <details className="group w-full rounded-md border border-stone-300 bg-white p-4 shadow-sm">
        <summary className="flex items-center justify-between cursor-pointer font-bold text-stone-700 select-none">
          <span className="text-base font-semibold text-stone-900 group-open:text-pitch-700 transition-colors">
            Detailed Event Log
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
              {playbackFrame.visibleDisplayEvents.length} events
            </span>
            <span className="text-stone-400 group-open:rotate-180 transition-transform text-xs">▼</span>
          </div>
        </summary>
        <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {playbackFrame.visibleDisplayEvents.length === 0 && (
            <div className="rounded border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-500">
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
                <span className="mr-3 inline-block w-8 font-semibold tabular-nums">{event.minute}'</span>
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
      </details>

      {/* Player Detail Modal Sheet */}
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
