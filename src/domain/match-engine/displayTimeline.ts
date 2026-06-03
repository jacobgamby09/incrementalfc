import type { ChanceType, MatchEvent } from "../types/match";

export type DisplayTimelineEventType =
  | "chance"
  | "goal"
  | "save"
  | "rebound"
  | "defensive_stop"
  | "error"
  | "card";

export type DisplayTimelineEvent = {
  id: string;
  minute: number;
  clubId: string;
  type: DisplayTimelineEventType;
  text: string;
  xg?: number;
  chanceType?: ChanceType;
  isGoal: boolean;
  isBigChance: boolean;
  isSave: boolean;
  isRebound: boolean;
  primaryPlayerId?: string;
  secondaryPlayerId?: string;
  rawEventIndexes: number[];
};

export type DisplayTimelineOptions = {
  getPlayerName?: (playerId: string) => string;
  getClubName?: (clubId: string) => string;
};

const meaningfulSaveXg = 0.1;

const chanceTypeCopy: Record<ChanceType, string> = {
  fast_breakaway: "a fast breakaway",
  wide_cross: "a wide cross",
  sustained_pressure: "sustained pressure",
  rebound_big_chance: "a rebound chance",
  corner: "a corner",
  indirect_free_kick: "an indirect free kick",
  direct_free_kick: "a direct free kick",
  penalty: "a penalty"
};

function playerName(playerId: string | undefined, options: DisplayTimelineOptions): string {
  if (!playerId) return "The player";
  return options.getPlayerName?.(playerId) ?? "The player";
}

function clubName(clubId: string, options: DisplayTimelineOptions): string {
  return options.getClubName?.(clubId) ?? "the team";
}

function xgValue(events: MatchEvent[]): number | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index].xg !== undefined) return events[index].xg;
  }
  return undefined;
}

function isBigChance(xg: number | undefined, chanceType: ChanceType | undefined): boolean {
  return chanceType === "rebound_big_chance" || (xg ?? 0) >= 0.3;
}

function isLinkedSequenceEvent(base: MatchEvent, candidate: MatchEvent): boolean {
  if (candidate.minute !== base.minute) return false;
  if (candidate.type === "save") return candidate.chanceType === base.chanceType;
  if (candidate.clubId !== base.clubId) return false;
  return candidate.chanceType === base.chanceType && ["shot", "goal", "chance"].includes(candidate.type);
}

function isLinkedReboundEvent(base: MatchEvent, candidate: MatchEvent): boolean {
  if (candidate.minute !== base.minute) return false;
  if (candidate.type === "save") return candidate.chanceType === "rebound_big_chance";
  if (candidate.clubId !== base.clubId) return false;
  return candidate.chanceType === "rebound_big_chance" && ["chance", "shot", "goal"].includes(candidate.type);
}

function displayId(rawEventIndexes: number[]): string {
  return `display_${rawEventIndexes.join("_")}`;
}

function buildChanceDisplay(
  events: MatchEvent[],
  rawEventIndexes: number[],
  options: DisplayTimelineOptions
): DisplayTimelineEvent {
  const chance = events.find((event) => event.type === "chance");
  const shot = events.find((event) => event.type === "shot");
  const goal = events.find((event) => event.type === "goal");
  const save = events.find((event) => event.type === "save");
  const mainEvent = goal ?? save ?? shot ?? chance ?? events[0];
  const chanceType = mainEvent.chanceType ?? chance?.chanceType;
  const xg = xgValue(events);
  const scorerId = goal?.playerId ?? shot?.playerId ?? chance?.secondaryPlayerId;
  const shooterId = shot?.playerId ?? chance?.secondaryPlayerId;
  const keeperId = save?.playerId;
  const route = chanceType ? chanceTypeCopy[chanceType] : "the move";

  if (goal) {
    return {
      id: displayId(rawEventIndexes),
      minute: goal.minute,
      clubId: goal.clubId,
      type: "goal",
      text: `GOAL - ${playerName(scorerId, options)} scores from ${route}.`,
      xg,
      chanceType,
      isGoal: true,
      isBigChance: isBigChance(xg, chanceType),
      isSave: false,
      isRebound: chanceType === "rebound_big_chance",
      primaryPlayerId: scorerId,
      secondaryPlayerId: goal.secondaryPlayerId,
      rawEventIndexes
    };
  }

  if (save) {
    return {
      id: displayId(rawEventIndexes),
      minute: save.minute,
      clubId: save.clubId,
      type: "save",
      text: `${playerName(keeperId, options)} saves ${playerName(shooterId, options)}'s shot from ${route}.`,
      xg,
      chanceType,
      isGoal: false,
      isBigChance: isBigChance(xg, chanceType),
      isSave: true,
      isRebound: chanceType === "rebound_big_chance",
      primaryPlayerId: keeperId,
      secondaryPlayerId: shooterId,
      rawEventIndexes
    };
  }

  return {
    id: displayId(rawEventIndexes),
    minute: mainEvent.minute,
    clubId: mainEvent.clubId,
    type: "chance",
    text: `${playerName(shooterId ?? chance?.playerId, options)} finds a shooting chance from ${route}.`,
    xg,
    chanceType,
    isGoal: false,
    isBigChance: isBigChance(xg, chanceType),
    isSave: false,
    isRebound: chanceType === "rebound_big_chance",
    primaryPlayerId: shooterId ?? chance?.playerId,
    secondaryPlayerId: chance?.playerId,
    rawEventIndexes
  };
}

function buildReboundDisplay(
  events: MatchEvent[],
  rawEventIndexes: number[],
  options: DisplayTimelineOptions
): DisplayTimelineEvent {
  const rebound = events.find((event) => event.type === "rebound") ?? events[0];
  const followUp = buildChanceDisplay(events, rawEventIndexes, options);
  const reboundWinner = rebound.playerId ?? followUp.secondaryPlayerId;

  if (followUp.isGoal) {
    return {
      ...followUp,
      type: "rebound",
      isRebound: true,
      text: `GOAL - ${playerName(followUp.primaryPlayerId, options)} scores after ${clubName(rebound.clubId, options)} win the rebound.`,
      rawEventIndexes
    };
  }

  if (followUp.isSave) {
    return {
      ...followUp,
      type: "rebound",
      isRebound: true,
      text: `${playerName(followUp.primaryPlayerId, options)} saves ${playerName(followUp.secondaryPlayerId, options)}'s rebound effort.`,
      rawEventIndexes
    };
  }

  return {
    id: displayId(rawEventIndexes),
    minute: rebound.minute,
    clubId: rebound.clubId,
    type: "rebound",
    text: `${playerName(reboundWinner, options)} wins the rebound for ${clubName(rebound.clubId, options)}.`,
    xg: followUp.xg,
    chanceType: "rebound_big_chance",
    isGoal: false,
    isBigChance: true,
    isSave: false,
    isRebound: true,
    primaryPlayerId: reboundWinner,
    secondaryPlayerId: followUp.secondaryPlayerId,
    rawEventIndexes
  };
}

function buildStandaloneDisplay(
  event: MatchEvent,
  rawEventIndex: number,
  options: DisplayTimelineOptions
): DisplayTimelineEvent | undefined {
  if (event.type === "event_control" || event.type === "yellow_card") return undefined;
  if (event.type === "save" && (event.xg ?? 0) < meaningfulSaveXg) return undefined;

  if (event.type === "goal") {
    return {
      id: displayId([rawEventIndex]),
      minute: event.minute,
      clubId: event.clubId,
      type: "goal",
      text: `GOAL - ${playerName(event.playerId, options)} scores for ${clubName(event.clubId, options)}.`,
      xg: event.xg,
      chanceType: event.chanceType,
      isGoal: true,
      isBigChance: isBigChance(event.xg, event.chanceType),
      isSave: false,
      isRebound: event.chanceType === "rebound_big_chance",
      primaryPlayerId: event.playerId,
      secondaryPlayerId: event.secondaryPlayerId,
      rawEventIndexes: [rawEventIndex]
    };
  }

  if (event.type === "save") {
    return {
      id: displayId([rawEventIndex]),
      minute: event.minute,
      clubId: event.clubId,
      type: "save",
      text: `${playerName(event.playerId, options)} makes a save for ${clubName(event.clubId, options)}.`,
      xg: event.xg,
      chanceType: event.chanceType,
      isGoal: false,
      isBigChance: isBigChance(event.xg, event.chanceType),
      isSave: true,
      isRebound: event.chanceType === "rebound_big_chance",
      primaryPlayerId: event.playerId,
      secondaryPlayerId: event.secondaryPlayerId,
      rawEventIndexes: [rawEventIndex]
    };
  }

  const type: DisplayTimelineEventType =
    event.type === "red_card" ? "card" : event.type === "error" ? "error" : event.type === "defensive_stop" ? "defensive_stop" : "chance";

  return {
    id: displayId([rawEventIndex]),
    minute: event.minute,
    clubId: event.clubId,
    type,
    text: event.type === "defensive_stop"
      ? `${playerName(event.playerId, options)} breaks up the attack for ${clubName(event.clubId, options)}.`
      : event.description,
    xg: event.xg,
    chanceType: event.chanceType,
    isGoal: false,
    isBigChance: isBigChance(event.xg, event.chanceType),
    isSave: false,
    isRebound: event.type === "rebound" || event.chanceType === "rebound_big_chance",
    primaryPlayerId: event.playerId,
    secondaryPlayerId: event.secondaryPlayerId,
    rawEventIndexes: [rawEventIndex]
  };
}

export function createDisplayTimelineEvents(
  events: MatchEvent[],
  options: DisplayTimelineOptions = {}
): DisplayTimelineEvent[] {
  const consumed = new Set<number>();
  const displayEvents: DisplayTimelineEvent[] = [];

  for (let index = 0; index < events.length; index += 1) {
    if (consumed.has(index)) continue;
    const event = events[index];

    if (event.type === "chance") {
      const sequenceIndexes = [index];
      for (let nextIndex = index + 1; nextIndex < events.length; nextIndex += 1) {
        if (!isLinkedSequenceEvent(event, events[nextIndex])) break;
        sequenceIndexes.push(nextIndex);
        if (events[nextIndex].type === "goal" || events[nextIndex].type === "save") break;
      }
      sequenceIndexes.forEach((sequenceIndex) => consumed.add(sequenceIndex));
      displayEvents.push(buildChanceDisplay(sequenceIndexes.map((sequenceIndex) => events[sequenceIndex]), sequenceIndexes, options));
      continue;
    }

    if (event.type === "rebound") {
      const sequenceIndexes = [index];
      for (let nextIndex = index + 1; nextIndex < events.length; nextIndex += 1) {
        if (!isLinkedReboundEvent(event, events[nextIndex])) break;
        sequenceIndexes.push(nextIndex);
        if (events[nextIndex].type === "goal" || events[nextIndex].type === "save") break;
      }
      sequenceIndexes.forEach((sequenceIndex) => consumed.add(sequenceIndex));
      displayEvents.push(buildReboundDisplay(sequenceIndexes.map((sequenceIndex) => events[sequenceIndex]), sequenceIndexes, options));
      continue;
    }

    const standaloneDisplay = buildStandaloneDisplay(event, index, options);
    consumed.add(index);
    if (standaloneDisplay) displayEvents.push(standaloneDisplay);
  }

  return displayEvents;
}
