import type { GameState } from "../types/game";
import { calculatePlayerOvr } from "../player/playerSummaries";

export type ClubStrengthInfo = {
  avgOvr: number;
  stars: number;
  rank: number;
};

export function calculateClubStrength(gameState: GameState, clubId: string): ClubStrengthInfo {
  const club = gameState.clubs[clubId];
  if (!club) {
    return { avgOvr: 0, stars: 1, rank: 10 };
  }

  // Get current season to find league clubs
  const season = gameState.seasons[gameState.currentSeasonId];
  if (!season) {
    return { avgOvr: 0, stars: 1, rank: 10 };
  }
  
  // Calculate average OVR for all clubs in the current league
  const clubAvgOvrs = season.clubIds.map((cId) => {
    const c = gameState.clubs[cId];
    const squad = c.squadPlayerIds.map((pid) => gameState.players[pid]).filter(Boolean);
    if (squad.length === 0) return { clubId: cId, avgOvr: 0 };
    const totalOvr = squad.reduce((sum, p) => sum + calculatePlayerOvr(p), 0);
    return { clubId: cId, avgOvr: totalOvr / squad.length };
  });

  // Rank the clubs based on paper strength (avgOvr)
  const sortedClubs = clubAvgOvrs.slice().sort((a, b) => b.avgOvr - a.avgOvr);
  const rank = sortedClubs.findIndex((c) => c.clubId === clubId) + 1;

  // Map 10 ranks to 6 star ratings
  let stars = 1;
  if (rank === 1) stars = 6;
  else if (rank === 2) stars = 5;
  else if (rank <= 4) stars = 4;
  else if (rank <= 6) stars = 3;
  else if (rank <= 8) stars = 2;
  else stars = 1;

  const clubOvrInfo = clubAvgOvrs.find((c) => c.clubId === clubId);
  const avgOvr = clubOvrInfo ? clubOvrInfo.avgOvr : 0;

  return {
    avgOvr,
    stars,
    rank
  };
}
