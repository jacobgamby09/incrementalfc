import type { Match, MatchEvent } from "../types/match";

export type KeyMoment = {
  id: string;
  minute: number;
  type: "goal" | "big_chance" | "yellow_card" | "red_card" | "injury";
  clubId: string;
  clubName: string;
  clubShortName: string;
  text: string;
  playerName?: string;
  secondaryPlayerName?: string;
  playerId?: string;
  secondaryPlayerId?: string;
};

export type KeyMomentResolverOptions = {
  getPlayerName: (playerId: string) => string;
  getClubName: (clubId: string) => string;
  getClubShortName: (clubId: string) => string;
};

export function createKeyMoments(
  match: Match,
  visibleEvents: MatchEvent[],
  options: KeyMomentResolverOptions
): KeyMoment[] {
  const moments: KeyMoment[] = [];
  const bigChanceSeenInMinute = new Set<string>(); // "minute-clubId" to prevent duplicate big chance moments in a single attack sequence

  for (let index = 0; index < visibleEvents.length; index += 1) {
    const event = visibleEvents[index];
    const clubName = options.getClubName(event.clubId);
    const clubShortName = options.getClubShortName(event.clubId);
    const id = `${event.minute}_${event.type}_${event.clubId}_${index}`;

    if (event.type === "goal") {
      const scorerName = event.playerId ? options.getPlayerName(event.playerId) : "The player";
      const assisterName = event.secondaryPlayerId ? options.getPlayerName(event.secondaryPlayerId) : undefined;
      const assisterPart = assisterName ? ` (${assisterName})` : "";
      const text = `${event.minute}' GOAL ${scorerName}${assisterPart} - ${clubName}`;

      moments.push({
        id,
        minute: event.minute,
        type: "goal",
        clubId: event.clubId,
        clubName,
        clubShortName,
        text,
        playerName: scorerName,
        secondaryPlayerName: assisterName,
        playerId: event.playerId,
        secondaryPlayerId: event.secondaryPlayerId
      });
    }

    if (event.type === "shot" || event.type === "chance") {
      const isBigChance = (event.xg ?? 0) >= 0.3 || event.chanceType === "rebound_big_chance";
      if (isBigChance) {
        // Check if there is a goal by the same club in this minute
        const hasGoal = visibleEvents.some(
          (e) => e.type === "goal" && e.minute === event.minute && e.clubId === event.clubId
        );

        if (!hasGoal) {
          const key = `${event.minute}_${event.clubId}`;
          if (!bigChanceSeenInMinute.has(key)) {
            bigChanceSeenInMinute.add(key);
            const playerName = event.playerId ? options.getPlayerName(event.playerId) : "The player";
            const text = `${event.minute}' Big chance ${playerName} - ${clubName}`;

            moments.push({
              id,
              minute: event.minute,
              type: "big_chance",
              clubId: event.clubId,
              clubName,
              clubShortName,
              text,
              playerName,
              playerId: event.playerId
            });
          }
        }
      }
    }

    if (event.type === "yellow_card") {
      const playerName = event.playerId ? options.getPlayerName(event.playerId) : "The player";
      const text = `${event.minute}' YELLOW CARD ${playerName} - ${clubName}`;

      moments.push({
        id,
        minute: event.minute,
        type: "yellow_card",
        clubId: event.clubId,
        clubName,
        clubShortName,
        text,
        playerName,
        playerId: event.playerId
      });
    }

    if (event.type === "red_card") {
      const playerName = event.playerId ? options.getPlayerName(event.playerId) : "The player";
      const text = `${event.minute}' RED CARD ${playerName} - ${clubName}`;

      moments.push({
        id,
        minute: event.minute,
        type: "red_card",
        clubId: event.clubId,
        clubName,
        clubShortName,
        text,
        playerName,
        playerId: event.playerId
      });
    }
  }

  return moments;
}
