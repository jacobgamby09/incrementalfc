import { useState } from "react";
import type { GameState } from "../../domain/types/game";
import type { Player } from "../../domain/types/player";
import { LeagueTable } from "../components/tables/LeagueTable";
import { calculatePlayerOvr, getPlayerPerformanceSummary } from "../../domain/player/playerSummaries";
import { PlayerDetailSheet } from "../components/player/PlayerDetailSheet";
import { ClubDetailModal } from "../components/club/ClubDetailModal";
import { getScoutedPotentialReport } from "../../domain/scouting/scoutedPotential";

type LeagueScreenProps = {
  gameState: GameState;
};

export function LeagueScreen({ gameState }: LeagueScreenProps): JSX.Element {
  const season = gameState.seasons[gameState.currentSeasonId];
  const league = gameState.leagues[season.leagueId];
  const currentMatchdayFixtures = season.fixtures.filter(
    (fixture) => fixture.matchday === season.currentMatchday
  );
  const promotionSpots = league?.promotionSpots ?? 0;
  const relegationSpots = league?.relegationSpots ?? 0;

  const [activeTab, setActiveTab] = useState<"standings" | "playerStats">("standings");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

  const promotionText = promotionSpots > 0 ? `top ${promotionSpots} promoted` : "";
  const relegationText = relegationSpots > 0 ? `bottom ${relegationSpots} relegated` : "";
  const extraInfo = [promotionText, relegationText].filter(Boolean).join(", ");
  const description = `10 clubs, 18 matches${extraInfo ? `, ${extraInfo}` : ""}`;

  // Gather stats for all players in this league
  const leaguePlayers = league
    ? league.clubIds.flatMap((clubId) => {
        const club = gameState.clubs[clubId];
        return club.squadPlayerIds.map((playerId) => gameState.players[playerId]).filter((p): p is Player => Boolean(p));
      })
    : [];

  const playerStatsList = leaguePlayers.map((player) => {
    const performance = getPlayerPerformanceSummary(gameState, player.id, season.id);
    return {
      player,
      club: gameState.clubs[player.clubId || ""],
      performance
    };
  });

  const hasStats = playerStatsList.some((p) => p.performance.apps > 0);

  // Top Scorers (min 1 goal)
  const topScorers = [...playerStatsList]
    .filter((p) => p.performance.goals > 0)
    .sort((a, b) => {
      if (b.performance.goals !== a.performance.goals) {
        return b.performance.goals - a.performance.goals;
      }
      if (a.performance.apps !== b.performance.apps) {
        return a.performance.apps - b.performance.apps;
      }
      return calculatePlayerOvr(b.player) - calculatePlayerOvr(a.player);
    })
    .slice(0, 10);

  // Top Assisters (min 1 assist)
  const topAssisters = [...playerStatsList]
    .filter((p) => p.performance.assists > 0)
    .sort((a, b) => {
      if (b.performance.assists !== a.performance.assists) {
        return b.performance.assists - a.performance.assists;
      }
      if (a.performance.apps !== b.performance.apps) {
        return a.performance.apps - b.performance.apps;
      }
      return calculatePlayerOvr(b.player) - calculatePlayerOvr(a.player);
    })
    .slice(0, 10);

  // Highest Rated (min 3 apps to qualify)
  const topRated = [...playerStatsList]
    .filter((p) => p.performance.apps >= 3 && p.performance.avgRating !== undefined)
    .sort((a, b) => {
      const ratingA = a.performance.avgRating ?? 0;
      const ratingB = b.performance.avgRating ?? 0;
      if (ratingB !== ratingA) {
        return ratingB - ratingA;
      }
      if (b.performance.goals !== a.performance.goals) {
        return b.performance.goals - a.performance.goals;
      }
      return b.performance.apps - a.performance.apps; // stable ranking
    })
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex border-b border-stone-200">
        <button
          type="button"
          onClick={() => setActiveTab("standings")}
          className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === "standings"
              ? "border-pitch-700 text-pitch-700"
              : "border-transparent text-stone-600 hover:text-stone-900"
          }`}
        >
          Standings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("playerStats")}
          className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === "playerStats"
              ? "border-pitch-700 text-pitch-700"
              : "border-transparent text-stone-600 hover:text-stone-900"
          }`}
        >
          Player Stats
        </button>
      </div>

      {activeTab === "standings" ? (
        <>
          <section className="rounded-md border border-stone-300 bg-white p-4">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">League Table</h2>
                <p className="text-sm text-stone-600">{description}</p>
              </div>
              <p className="text-sm font-medium text-stone-700">Matchday {season.currentMatchday}</p>
            </div>
            <LeagueTable gameState={gameState} />
          </section>

          <section className="rounded-md border border-stone-300 bg-white p-4">
            <h2 className="mb-3 text-lg font-semibold">Current Matchday</h2>
            <div className="grid gap-2 md:grid-cols-2">
              {currentMatchdayFixtures.map((fixture) => (
                <div
                  key={fixture.id}
                  className="flex items-center justify-between rounded border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{gameState.clubs[fixture.homeClubId].name}</span>
                  <span className="px-2 text-xs uppercase text-stone-500">
                    {fixture.matchId && gameState.matches[fixture.matchId]
                      ? `${gameState.matches[fixture.matchId].result.homeGoals}-${gameState.matches[fixture.matchId].result.awayGoals}`
                      : "vs"}
                  </span>
                  <span className="font-medium">{gameState.clubs[fixture.awayClubId].name}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="space-y-6">
          {!hasStats ? (
            <div className="rounded-md border border-stone-200 bg-stone-50 p-6 text-center text-stone-600">
              No matches have been played this season yet. Play matchdays to generate player statistics!
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Top Scorers */}
              <div className="rounded-md border border-stone-300 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-500">Top Scorers</h3>
                {topScorers.length === 0 ? (
                  <p className="text-xs text-stone-500 italic py-2">No goals scored yet.</p>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 text-xs font-semibold text-stone-400 text-left">
                        <th className="py-1.5 w-8">#</th>
                        <th className="py-1.5 px-2">Player</th>
                        <th className="py-1.5 px-2">Club</th>
                        <th className="py-1.5 text-right w-12 font-mono">Goals</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-medium">
                      {topScorers.map((item, index) => (
                        <tr key={item.player.id} className="hover:bg-stone-50/50">
                          <td className="py-2 text-stone-400 font-bold font-mono">{index + 1}</td>
                          <td className="py-2 px-2">
                            <button
                              type="button"
                              onClick={() => setSelectedPlayerId(item.player.id)}
                              className="text-pitch-700 hover:underline font-semibold text-left"
                            >
                              {item.player.firstName} {item.player.lastName}
                            </button>
                          </td>
                          <td className="py-2 px-2">
                            <button
                              type="button"
                              onClick={() => setSelectedClubId(item.club?.id || null)}
                              className="text-stone-500 hover:underline font-medium text-left truncate max-w-[100px]"
                            >
                              {item.club?.shortName || "FA"}
                            </button>
                          </td>
                          <td className="py-2 text-right font-bold text-stone-800 font-mono">{item.performance.goals}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Top Assisters */}
              <div className="rounded-md border border-stone-300 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-500">Top Assisters</h3>
                {topAssisters.length === 0 ? (
                  <p className="text-xs text-stone-500 italic py-2">No assists recorded yet.</p>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 text-xs font-semibold text-stone-400 text-left">
                        <th className="py-1.5 w-8">#</th>
                        <th className="py-1.5 px-2">Player</th>
                        <th className="py-1.5 px-2">Club</th>
                        <th className="py-1.5 text-right w-12 font-mono">Assists</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-medium">
                      {topAssisters.map((item, index) => (
                        <tr key={item.player.id} className="hover:bg-stone-50/50">
                          <td className="py-2 text-stone-400 font-bold font-mono">{index + 1}</td>
                          <td className="py-2 px-2">
                            <button
                              type="button"
                              onClick={() => setSelectedPlayerId(item.player.id)}
                              className="text-pitch-700 hover:underline font-semibold text-left"
                            >
                              {item.player.firstName} {item.player.lastName}
                            </button>
                          </td>
                          <td className="py-2 px-2">
                            <button
                              type="button"
                              onClick={() => setSelectedClubId(item.club?.id || null)}
                              className="text-stone-500 hover:underline font-medium text-left truncate max-w-[100px]"
                            >
                              {item.club?.shortName || "FA"}
                            </button>
                          </td>
                          <td className="py-2 text-right font-bold text-stone-800 font-mono">{item.performance.assists}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Highest Rated */}
              <div className="rounded-md border border-stone-300 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-500">Highest Rated</h3>
                {topRated.length === 0 ? (
                  <p className="text-xs text-stone-500 italic py-2">No qualified players (min. 3 apps).</p>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 text-xs font-semibold text-stone-400 text-left">
                        <th className="py-1.5 w-8">#</th>
                        <th className="py-1.5 px-2">Player</th>
                        <th className="py-1.5 px-2">Club</th>
                        <th className="py-1.5 text-right w-12 font-mono">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-medium">
                      {topRated.map((item, index) => (
                        <tr key={item.player.id} className="hover:bg-stone-50/50">
                          <td className="py-2 text-stone-400 font-bold font-mono">{index + 1}</td>
                          <td className="py-2 px-2">
                            <button
                              type="button"
                              onClick={() => setSelectedPlayerId(item.player.id)}
                              className="text-pitch-700 hover:underline font-semibold text-left"
                            >
                              {item.player.firstName} {item.player.lastName}
                            </button>
                          </td>
                          <td className="py-2 px-2">
                            <button
                              type="button"
                              onClick={() => setSelectedClubId(item.club?.id || null)}
                              className="text-stone-500 hover:underline font-medium text-left truncate max-w-[100px]"
                            >
                              {item.club?.shortName || "FA"}
                            </button>
                          </td>
                          <td className="py-2 text-right font-bold text-stone-850 font-mono">{item.performance.display.avgRating}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {selectedPlayerId && (
        <PlayerDetailSheet
          player={gameState.players[selectedPlayerId]}
          gameState={gameState}
          scoutedPotential={
            gameState.players[selectedPlayerId].clubId !== gameState.playerClubId
              ? getScoutedPotentialReport(gameState.players[selectedPlayerId], gameState.clubs[gameState.playerClubId])
              : undefined
          }
          onClose={() => setSelectedPlayerId(null)}
        />
      )}

      {selectedClubId && (
        <ClubDetailModal
          clubId={selectedClubId}
          gameState={gameState}
          onClose={() => setSelectedClubId(null)}
        />
      )}
    </div>
  );
}
