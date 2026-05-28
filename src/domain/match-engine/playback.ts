import type { Match, MatchEvent } from "../types/match";
import {
  createDisplayTimelineEvents,
  type DisplayTimelineEvent,
  type DisplayTimelineOptions
} from "./displayTimeline";

export type MatchPlaybackFrame = {
  minute: number;
  homeGoals: number;
  awayGoals: number;
  visibleEvents: MatchEvent[];
  visibleDisplayEvents: DisplayTimelineEvent[];
  latestGoalEvent?: MatchEvent;
  hasGoalAtCurrentMinute: boolean;
  isFullTime: boolean;
};

export function getPlaybackFrame(
  match: Match,
  minute: number,
  displayOptions: DisplayTimelineOptions = {}
): MatchPlaybackFrame {
  const clampedMinute = Math.min(Math.max(minute, 0), 90);
  const visibleEvents = match.events.filter((event) => event.minute <= clampedMinute);
  const visibleDisplayEvents = createDisplayTimelineEvents(match.events, displayOptions).filter((event) => event.minute <= clampedMinute);
  const goals = visibleEvents.filter((event) => event.type === "goal");
  const latestGoalEvent = goals[goals.length - 1];
  const hasGoalAtCurrentMinute = goals.some((event) => event.minute === clampedMinute);
  const homeGoals = goals.filter((event) => event.clubId === match.homeClubId).length;
  const awayGoals = goals.filter((event) => event.clubId === match.awayClubId).length;
  const isFullTime = clampedMinute >= 90;

  return {
    minute: clampedMinute,
    homeGoals: isFullTime ? match.result.homeGoals : homeGoals,
    awayGoals: isFullTime ? match.result.awayGoals : awayGoals,
    visibleEvents,
    visibleDisplayEvents,
    latestGoalEvent,
    hasGoalAtCurrentMinute,
    isFullTime
  };
}
