import { X } from "lucide-react";
import type { GameState } from "../../../domain/types/game";
import type { Club } from "../../../domain/types/club";
import type { Player } from "../../../domain/types/player";
import { getFacilityProfile } from "../../../data/constants/facilityProfiles";
import { calculatePlayerOvr, calculatePlayerPot, getPlayerPerformanceSummary } from "../../../domain/player/playerSummaries";
import { getScoutedPotentialReport, formatScoutedPotential } from "../../../domain/scouting/scoutedPotential";
import { useState } from "react";
import { PlayerDetailSheet } from "../player/PlayerDetailSheet";
import { formatCurrency } from "../../../utils/format";

type ClubDetailModalProps = {
  clubId: string;
  gameState: GameState;
  onClose: () => void;
};

const positionOrder: Record<string, number> = {
  GK: 1,
  LB: 2,
  CB: 3,
  RB: 4,
  WB: 5,
  DM: 6,
  CM: 7,
  AM: 8,
  LW: 9,
  RW: 10,
  ST: 11
};

export function ClubDetailModal({ clubId, gameState, onClose }: ClubDetailModalProps): JSX.Element {
  const club = gameState.clubs[clubId];
  const playerClub = gameState.clubs[gameState.playerClubId];
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"squad" | "overview">("squad");

  if (!club) {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-stone-950/60 p-4">
        <div className="rounded-lg bg-white p-6 shadow-xl">
          <p className="text-stone-700">Club not found.</p>
          <button type="button" onClick={onClose} className="mt-4 rounded bg-stone-200 px-4 py-2 hover:bg-stone-300">
            Close
          </button>
        </div>
      </div>
    );
  }

  const league = Object.values(gameState.leagues).find((l) => l.clubIds.includes(club.id));

  // Sort squad by role on the pitch first, then by current quality.
  const squadPlayers = club.squadPlayerIds
    .map((id) => gameState.players[id])
    .filter((p): p is Player => Boolean(p))
    .sort((a, b) => {
      const orderA = positionOrder[a.primaryPosition] ?? 99;
      const orderB = positionOrder[b.primaryPosition] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return calculatePlayerOvr(b) - calculatePlayerOvr(a);
    });
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-stone-950/60 p-4 sm:p-6 md:p-10">
      <div className="relative flex h-full max-h-[85vh] w-full max-w-4xl flex-col rounded-lg border border-stone-300 bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-stone-950 flex items-center gap-2">
              {club.name}
              <span className="text-sm font-semibold text-stone-500 font-mono">({club.shortName})</span>
            </h2>
            <p className="text-sm text-stone-600 mt-1">
              {league ? `${league.name} (Level ${league.level})` : "No Active League"} | Reputation: {club.reputation}/100 | Fans: {club.fans.toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-stone-200 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("squad")}
            className={`border-b-2 px-4 py-2 text-sm font-semibold transition ${
              activeTab === "squad"
                ? "border-pitch-700 text-pitch-700"
                : "border-transparent text-stone-600 hover:text-stone-900"
            }`}
          >
            Squad ({squadPlayers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`border-b-2 px-4 py-2 text-sm font-semibold transition ${
              activeTab === "overview"
                ? "border-pitch-700 text-pitch-700"
                : "border-transparent text-stone-600 hover:text-stone-900"
            }`}
          >
            Club Overview
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeTab === "overview" && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* General & Stadium Info */}
              <div className="space-y-4">
                <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 mb-2">Stadium & General</h3>
                  <div className="space-y-2 text-sm text-stone-700">
                    <div className="flex justify-between">
                      <span className="font-medium text-stone-500">Stadium Name</span>
                      <span className="font-semibold">{club.name.startsWith("FC ") ? club.name.slice(3) : club.name} Park</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-stone-500">Stadium Capacity</span>
                      <span className="font-mono font-semibold">
                        {(club.facilities.stadium.effects.stadiumCapacity ?? 1000).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-stone-500">Club Archetype</span>
                      <span className="font-semibold capitalize">{club.ecosystem.archetype.replace("_", " ")}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 mb-2">History</h3>
                  <div className="space-y-2 text-sm text-stone-700">
                    <div className="flex justify-between">
                      <span className="font-medium text-stone-500">Founded Season</span>
                      <span className="font-semibold">Season {club.history.foundedSeason}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-stone-500">Promotions</span>
                      <span className="font-semibold">{club.history.promotions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-stone-500">Relegations</span>
                      <span className="font-semibold">{club.history.relegations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-stone-500">Highest Division Level</span>
                      <span className="font-semibold">Level {club.history.highestLeagueLevel}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Facilities Info */}
              <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 mb-3">Facility Levels</h3>
                <div className="space-y-3">
                  {(["trainingGround", "stadium", "medicalCenter", "scoutingNetwork", "youthAcademy"] as const).map((type) => {
                    const facility = club.facilities[type];
                    const profile = getFacilityProfile(type);
                    return (
                      <div key={type} className="flex items-center justify-between text-sm border-b border-stone-200/60 pb-2 last:border-0 last:pb-0">
                        <div>
                          <p className="font-semibold text-stone-850">{profile.name}</p>
                          <p className="text-xs text-stone-500">{profile.description}</p>
                        </div>
                        <span className="rounded bg-stone-200 px-2 py-0.5 font-mono text-xs font-bold text-stone-700 shrink-0">
                          Lvl {facility.level}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "squad" && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-300 text-xs uppercase text-stone-500">
                    <th className="py-2 pr-3 font-semibold w-10 text-center">Pos</th>
                    <th className="px-3 py-2 font-semibold">Name</th>
                    <th className="px-3 py-2 text-center font-semibold w-12">Age</th>
                    <th className="px-3 py-2 text-center font-semibold w-12">OVR</th>
                    <th className="px-3 py-2 text-center font-semibold w-20">POT</th>
                    <th className="px-3 py-2 text-right font-semibold">Value</th>
                    <th className="px-3 py-2 text-center font-semibold w-12">Apps</th>
                    <th className="px-3 py-2 text-center font-semibold w-12">Goals</th>
                    <th className="px-3 py-2 text-center font-semibold w-12">Ast</th>
                    <th className="py-2 pl-3 text-right font-semibold w-14">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {squadPlayers.map((player) => {
                    const ovr = calculatePlayerOvr(player);
                    const isPlayerInOwnClub = player.clubId === playerClub.id;
                    const potentialReport = getScoutedPotentialReport(player, playerClub);
                    const potString = isPlayerInOwnClub
                      ? `${Math.round(calculatePlayerPot(player))}`
                      : formatScoutedPotential(potentialReport);

                    const stats = getPlayerPerformanceSummary(gameState, player.id);

                    return (
                      <tr key={player.id} className="hover:bg-stone-50 transition-colors">
                        <td className="py-2 pr-3 text-center">
                          <span className="inline-block rounded bg-stone-150 px-1.5 py-0.5 text-[10px] font-bold text-stone-700">
                            {player.primaryPosition}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium">
                          <button
                            type="button"
                            onClick={() => setSelectedPlayerId(player.id)}
                            className="text-pitch-700 font-semibold hover:underline text-left"
                          >
                            {player.firstName} {player.lastName}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center text-stone-600 font-mono">{player.age}</td>
                        <td className="px-3 py-2 text-center font-bold text-stone-850 font-mono">{ovr}</td>
                        <td className="px-3 py-2 text-center text-stone-600 font-mono">{potString}</td>
                        <td className="px-3 py-2 text-right text-stone-600 font-mono">
                          {formatCurrency(player.contract.marketValue)}
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-stone-600">{stats.apps}</td>
                        <td className="px-3 py-2 text-center font-mono text-stone-600">{stats.goals || "-"}</td>
                        <td className="px-3 py-2 text-center font-mono text-stone-600">{stats.assists || "-"}</td>
                        <td className="py-2 pl-3 text-right font-semibold font-mono text-stone-850">
                          {stats.display.avgRating}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedPlayerId && (
        <PlayerDetailSheet
          player={gameState.players[selectedPlayerId]}
          gameState={gameState}
          scoutedPotential={
            gameState.players[selectedPlayerId].clubId !== playerClub.id
              ? getScoutedPotentialReport(gameState.players[selectedPlayerId], playerClub)
              : undefined
          }
          onClose={() => setSelectedPlayerId(null)}
        />
      )}
    </div>
  );
}
