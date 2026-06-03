import type { GameState } from "../types/game";
import type { Club } from "../types/club";
import type { Player, PlayerPosition } from "../types/player";
import type { Season } from "../types/league";
import { createId, pickOne, randomInt, type RandomSource } from "../../utils/random";
import { appendFinanceTransaction } from "../economy/financeLedger";
import { isGoalkeeperStats, goalkeeperStatKeys, outfieldStatKeys } from "../types/player";
import { calculatePlayerOvr } from "../player/playerSummaries";
import { generateFixtures } from "../generation/generateFixtures";
import { createEmptyTable } from "../generation/generateLeague";
import {
  getLeagueIdForLevel
} from "../../data/constants/leagueProfiles";
import { sortTableCanonically } from "../league/leagueTableView";
import { advanceFacilityConstruction } from "../facilities/facilityUpgrades";
import { processOffseasonFinances } from "../economy/clubFinance";
import { advanceYouthAcademy } from "../academy/youthAcademy";
import { economyProfile } from "../../data/constants/economyProfiles";
import { getAgeCurveStageForAge, getEffectivePotentialValue } from "../player/playerPotential";
import { createOpenTransferMarket, getTransferWindowFinalizationIssues } from "../transfers/transferWindow";
import { updatePersistentPyramid } from "./persistentWorld";
import { ensurePlayerNameRegistry, generateUniquelyNamedPlayer } from "../generation/playerNameRegistry";

function applyAgeDecline(player: Player, rng: RandomSource): Player {
  const currentStats = { ...player.currentStats };
  const growth: Array<{ statKey: string; from: number; to: number; source: "match" | "training" | "combined" }> = [];
  
  if (isGoalkeeperStats(currentStats)) {
    const oldPhy = currentStats.PHY;
    const oldRef = currentStats.REF;
    
    currentStats.PHY = Math.max(1, currentStats.PHY - 1);
    growth.push({ statKey: "PHY", from: oldPhy, to: currentStats.PHY, source: "combined" });
    
    if (rng() < 0.5) {
      currentStats.REF = Math.max(1, currentStats.REF - 1);
      growth.push({ statKey: "REF", from: oldRef, to: currentStats.REF, source: "combined" });
    }
  } else {
    const oldAcc = currentStats.ACC;
    const oldSta = currentStats.STA;
    const oldPhy = currentStats.PHY;
    
    const amount = player.age > 33 ? 2 : 1;
    currentStats.ACC = Math.max(1, currentStats.ACC - amount);
    currentStats.STA = Math.max(1, currentStats.STA - amount);
    currentStats.PHY = Math.max(1, currentStats.PHY - 1);
    
    growth.push({ statKey: "ACC", from: oldAcc, to: currentStats.ACC, source: "combined" });
    growth.push({ statKey: "STA", from: oldSta, to: currentStats.STA, source: "combined" });
    growth.push({ statKey: "PHY", from: oldPhy, to: currentStats.PHY, source: "combined" });
    
    const keysToTry = ["PAS", "SHO", "TAC", "CRO", "HEA", "DRI", "POS", "TEC", "MEN"] as const;
    for (const key of keysToTry) {
      if (rng() < 0.1) {
        const oldVal = currentStats[key];
        currentStats[key] = Math.max(1, currentStats[key] - 1);
        growth.push({ statKey: key, from: oldVal, to: currentStats[key], source: "combined" });
      }
    }
  }
  
  return {
    ...player,
    currentStats,
    development: {
      ...player.development,
      recentStatGrowth: [...growth, ...player.development.recentStatGrowth].slice(0, 8),
      recentDevelopmentNotes: ["Physical decline due to age."]
    }
  };
}

function cloneClub(club: Club): Club {
  return {
    ...club,
    economy: {
      ...club.economy,
      transactions: [...(club.economy.transactions ?? [])]
    },
    facilities: {
      ...club.facilities,
      trainingGround: { ...club.facilities.trainingGround, effects: { ...club.facilities.trainingGround.effects }, visualState: { ...club.facilities.trainingGround.visualState }, construction: club.facilities.trainingGround.construction ? { ...club.facilities.trainingGround.construction } : null },
      youthAcademy: { ...club.facilities.youthAcademy, effects: { ...club.facilities.youthAcademy.effects }, visualState: { ...club.facilities.youthAcademy.visualState }, construction: club.facilities.youthAcademy.construction ? { ...club.facilities.youthAcademy.construction } : null },
      scoutingNetwork: { ...club.facilities.scoutingNetwork, effects: { ...club.facilities.scoutingNetwork.effects }, visualState: { ...club.facilities.scoutingNetwork.visualState }, construction: club.facilities.scoutingNetwork.construction ? { ...club.facilities.scoutingNetwork.construction } : null },
      stadium: { ...club.facilities.stadium, effects: { ...club.facilities.stadium.effects }, visualState: { ...club.facilities.stadium.visualState }, construction: club.facilities.stadium.construction ? { ...club.facilities.stadium.construction } : null },
      medicalCenter: { ...club.facilities.medicalCenter, effects: { ...club.facilities.medicalCenter.effects }, visualState: { ...club.facilities.medicalCenter.visualState }, construction: club.facilities.medicalCenter.construction ? { ...club.facilities.medicalCenter.construction } : null },
      analyticsDepartment: { ...club.facilities.analyticsDepartment, effects: { ...club.facilities.analyticsDepartment.effects }, visualState: { ...club.facilities.analyticsDepartment.visualState }, construction: club.facilities.analyticsDepartment.construction ? { ...club.facilities.analyticsDepartment.construction } : null }
    },
    training: {
      focusedAssignments: club.training.focusedAssignments.map((assignment) => ({ ...assignment }))
    },
    academy: {
      ...club.academy,
      pendingProspect: club.academy.pendingProspect ? clonePlayer(club.academy.pendingProspect) : null
    },
    scouting: { ...club.scouting },
    history: {
      ...club.history,
      trophies: club.history.trophies ? [...club.history.trophies] : []
    },
    ecosystem: {
      ...club.ecosystem,
      squadNeedProfile: {
        positions: club.ecosystem.squadNeedProfile?.positions ? [...club.ecosystem.squadNeedProfile.positions] : [],
        minOvr: club.ecosystem.squadNeedProfile?.minOvr ?? 0
      }
    },
    squadPlayerIds: [...club.squadPlayerIds],
    seasonStats: { ...club.seasonStats, formLastFive: [...(club.seasonStats.formLastFive || [])] }
  };
}

function clonePlayer(player: Player): Player {
  return {
    ...player,
    secondaryPositions: [...player.secondaryPositions],
    currentStats: { ...player.currentStats },
    potentialStats: { ...player.potentialStats },
    development: {
      ...player.development,
      cappedStats: [...player.development.cappedStats],
      statProgress: { ...player.development.statProgress },
      recentStatGrowth: player.development.recentStatGrowth.map(g => ({ ...g })),
      recentDevelopmentNotes: [...player.development.recentDevelopmentNotes]
    },
    contract: { ...player.contract },
    status: { ...player.status },
    history: {
      ...player.history,
      previousClubIds: [...player.history.previousClubIds]
    },
    visualIdentity: { ...player.visualIdentity },
    transferIntent: { ...player.transferIntent }
  };
}

function uniqueRecordId(candidateId: string, records: Record<string, unknown>): string {
  if (!records[candidateId]) return candidateId;
  let suffix = 2;
  while (records[`${candidateId}_${suffix}`]) suffix += 1;
  return `${candidateId}_${suffix}`;
}

function addGeneratedPlayer(player: Player, players: Record<string, Player>): Player {
  const id = uniqueRecordId(player.id, players);
  const insertedPlayer = id === player.id ? player : { ...player, id };
  players[id] = insertedPlayer;
  return insertedPlayer;
}

export function openTransferWindow(gameState: GameState, rng: RandomSource = Math.random): GameState {
  const currentSeason = gameState.seasons[gameState.currentSeasonId];
  if (!currentSeason || currentSeason.status !== "completed") {
    throw new Error("Cannot rollover season: current season is not completed.");
  }

  const league = gameState.leagues[currentSeason.leagueId];
  const sortedTable = sortTableCanonically(currentSeason.table);

  // Identify original keys to prevent mutating incoming state and skip aging on day-1 replacement entities
  const originalPlayerIds = new Set(Object.keys(gameState.players));

  const nextClubs: Record<string, Club> = {};
  for (const [id, club] of Object.entries(gameState.clubs)) {
    nextClubs[id] = cloneClub(club);
  }

  const nextPlayers: Record<string, Player> = {};
  for (const [id, player] of Object.entries(gameState.players)) {
    nextPlayers[id] = clonePlayer(player);
  }
  const nameRegistry = ensurePlayerNameRegistry(gameState.nameRegistry, nextPlayers);

  // 1. Pay Placement Prizes
  sortedTable.forEach((entry, rank) => {
    const club = nextClubs[entry.clubId];
    if (!club) return;

    const seasonNumber = gameState.currentDate.seasonNumber;
    const week = gameState.currentDate.week;

    let payout = league.rewardProfile.participationPrize;
    club.economy = appendFinanceTransaction(club.economy, {
      seasonNumber,
      week,
      category: "participation_prize",
      amount: league.rewardProfile.participationPrize,
      description: "League participation prize"
    });

    if (rank === 0) {
      payout += league.rewardProfile.championPrize;
      club.economy = appendFinanceTransaction(club.economy, {
        seasonNumber,
        week,
        category: "champion_prize",
        amount: league.rewardProfile.championPrize,
        description: "League champion title prize"
      });
    }

    if (rank < league.promotionSpots && league.rewardProfile.promotionBonus > 0) {
      payout += league.rewardProfile.promotionBonus;
      club.economy = appendFinanceTransaction(club.economy, {
        seasonNumber,
        week,
        category: "promotion_bonus",
        amount: league.rewardProfile.promotionBonus,
        description: "League promotion bonus"
      });
    }

    club.economy.cashBalance += payout;
  });

  // 2. Resolve every division together. Offscreen leagues use lightweight
  // standings, then exchange existing clubs with adjacent divisions.
  const playerClubId = gameState.playerClubId;
  const pyramid = updatePersistentPyramid(
    gameState.leagues,
    nextClubs,
    nextPlayers,
    league.id,
    sortedTable,
    rng
  );
  const promotedIds = pyramid.promotedClubIds;
  const relegatedIds = pyramid.relegatedClubIds;
  const nextLeagueId = nextClubs[playerClubId].leagueId;
  const nextLeague = pyramid.leagues[nextLeagueId];
  const nextActiveClubIds = nextLeague.clubIds;

  const listedIdsList: string[] = [];
  const freeAgentIdsList: string[] = [];

  // 3. Player Aging, Decline & Contract Expiry
  // Apply aging to all persistent clubs, including offscreen divisions.
  const activeClubPlayerIds = new Set<string>();
  Object.keys(nextClubs).forEach((clubId) => {
    const club = nextClubs[clubId];
    if (club) club.squadPlayerIds.forEach((pid) => activeClubPlayerIds.add(pid));
  });

  activeClubPlayerIds.forEach((playerId) => {
    if (!originalPlayerIds.has(playerId)) return; // Skip newly generated players!
    const player = nextPlayers[playerId];
    if (!player) return;

    player.age += 1;
    player.development.ageCurveStage = getAgeCurveStageForAge(player.age);

    // Clear stale notes before applying decline so the new decline notes are preserved
    player.development.recentDevelopmentNotes = [];

    if (player.age >= 30) {
      nextPlayers[playerId] = applyAgeDecline(player, rng);
    } else {
      // Clear development deltas for active young/prime players
      player.development.recentStatGrowth = [];
    }
  });

  Object.keys(nextClubs).forEach((clubId) => {
    const club = nextClubs[clubId];
    if (!club) return;

    club.squadPlayerIds = club.squadPlayerIds.filter((playerId) => {
      if (!originalPlayerIds.has(playerId)) return true;
      const player = nextPlayers[playerId];
      if (!player) return false;

      player.contract.seasonsRemaining = Math.max(0, player.contract.seasonsRemaining - 1);
      if (player.contract.seasonsRemaining > 0) return true;

      player.transferIntent = {
        isListed: false,
        listingReason: "contract_declining",
        askingPrice: 0,
        interestLevel: randomInt(20, 70, rng)
      };
      if (clubId === playerClubId) {
        return true;
      }
      if (rng() < 0.82) {
        player.contract.seasonsRemaining = randomInt(1, 3, rng);
        return true;
      }

      player.clubId = null;
      freeAgentIdsList.push(playerId);
      return false;
    });
  });

  // 4. AI Squad Refresh & Churn across the persistent world.

  Object.keys(nextClubs).forEach((clubId) => {
    if (clubId === playerClubId) return; // Skip player club squad churn
    
    const club = nextClubs[clubId];
    if (!club) return;
    const clubLeague = pyramid.leagues[club.leagueId];

    let squadIds = [...club.squadPlayerIds];
    const departingIds = new Set<string>();

    squadIds.forEach((playerId) => {
      const player = nextPlayers[playerId];
      if (!player) return;

      const ovr = calculatePlayerOvr(player);

      // A. Retirements (Age >= 35)
      if (player.age >= 35) {
        departingIds.add(playerId);
        return;
      }

      // B. Outlier Churn (OVR is above target range max)
      if (ovr > clubLeague.targetOvrRange[1]) {
        // 50% chance to churn (leave for a bigger division)
        if (rng() < 0.5) {
          departingIds.add(playerId);
          return;
        } else {
          // Flag as future transfer candidate with reason
          player.transferIntent = {
            isListed: true,
            listingReason: "too_good_for_division",
            askingPrice: Math.round(player.contract.marketValue * 1.25),
            interestLevel: randomInt(40, 85, rng)
          };
          listedIdsList.push(playerId);
          return;
        }
      }

      // C. Financial Listings
      const isRelegatedAI = relegatedIds.includes(clubId);
      const isCautiousAI = club.ecosystem.archetype === "financially_cautious";
      if (isRelegatedAI || isCautiousAI || club.ecosystem.financialPressure > 30) {
        // List highest value player
        const highestValPlayerId = squadIds
          .filter((id) => !departingIds.has(id))
          .sort((a, b) => (nextPlayers[b]?.contract.marketValue ?? 0) - (nextPlayers[a]?.contract.marketValue ?? 0))[0];
        
        if (highestValPlayerId === playerId) {
          player.transferIntent = {
            isListed: true,
            listingReason: "financial_pressure",
            askingPrice: Math.round(player.contract.marketValue * 0.85),
            interestLevel: randomInt(30, 75, rng)
          };
          listedIdsList.push(playerId);
        }
      }

      // D. Nudge Stats towards Division bands & archetypes
      const isUnderCap = player.age < 30 && ovr < clubLeague.facilityCap;
      if (isUnderCap) {
        // Apply tiny nudge growth
        const keys = isGoalkeeperStats(player.currentStats) ? goalkeeperStatKeys : outfieldStatKeys;
        const nudgeCount = player.development.ageCurveStage === "youth" || player.development.ageCurveStage === "developing" ? 2 : 1;
        
        let nudgesDone = 0;
        const currentStats = { ...player.currentStats };
        for (let i = 0; i < keys.length; i++) {
          if (nudgesDone >= nudgeCount) break;
          const key = keys[i];
          const curVal = Number(currentStats[key as keyof typeof currentStats]);
          const potVal = getEffectivePotentialValue(player, key);
          
          if (curVal < potVal && curVal < clubLeague.facilityCap) {
            (currentStats as any)[key] = curVal + 1;
            nudgesDone += 1;
          }
        }
        player.currentStats = currentStats;
      }
    });

    // Remove departing players from AI club and gameState
    const remainingSquadIds = squadIds.filter((pid) => {
      if (departingIds.has(pid)) {
        // Turn some into free agents rather than deleting them completely, unless they retired
        const player = nextPlayers[pid];
        if (player && player.age < 35 && rng() < 0.6) {
          player.clubId = null;
          player.transferIntent = {
            isListed: false,
            listingReason: "none",
            askingPrice: Math.round(player.contract.marketValue * 0.9),
            interestLevel: randomInt(20, 50, rng)
          };
          freeAgentIdsList.push(pid);
        } else {
          delete nextPlayers[pid];
        }
        return false;
      }
      return true;
    });

    // Replacements
    const requiredPlayers = 16;
    const diff = requiredPlayers - remainingSquadIds.length;
    for (let k = 0; k < diff; k++) {
      const positions: PlayerPosition[] = ["ST", "CM", "CB", "GK", "LW", "RW"];
      const pos = pickOne(positions, rng);
      const replacementAge = randomInt(17, 20, rng);
      const newPlayer = generateUniquelyNamedPlayer({
        clubId,
        position: pos,
        statRange: clubLeague.playerStatRange,
        age: replacementAge,
        leagueLevel: clubLeague.level,
        rng
      }, nameRegistry);
      
      remainingSquadIds.push(addGeneratedPlayer(newPlayer, nextPlayers).id);
    }

    club.squadPlayerIds = remainingSquadIds;
  });

  // The offseason represents enough recovery time for every active squad to
  // begin the next campaign fresh. Fitness pressure remains a within-season
  // rotation concern.
  Object.keys(nextClubs).forEach((clubId) => {
    const club = nextClubs[clubId];
    if (!club) return;
    club.squadPlayerIds.forEach((playerId) => {
      const player = nextPlayers[playerId];
      if (!player) return;
      player.status = {
        ...player.status,
        fitness: 100
      };
    });
  });

  // 5. Generate a few unaffiliated Free Agents for the Transfer Pool
  for (let f = 0; f < 5; f++) {
    const positions: PlayerPosition[] = ["ST", "CM", "CB", "GK"];
    const pos = pickOne(positions, rng);
    const freePlayerAge = randomInt(18, 32, rng);
    const freePlayer = generateUniquelyNamedPlayer({
      clubId: "free_agents",
      position: pos,
      statRange: nextLeague.playerStatRange,
      age: freePlayerAge,
      leagueLevel: nextLeague.level,
      rng
    }, nameRegistry);
    freePlayer.clubId = null;
    freePlayer.transferIntent = {
      isListed: false,
      askingPrice: Math.round(freePlayer.contract.marketValue * 0.95),
      interestLevel: randomInt(15, 60, rng)
    };
    freeAgentIdsList.push(addGeneratedPlayer(freePlayer, nextPlayers).id);
  }

  // 6. Reset Season Stats
  Object.keys(nextClubs).forEach((clubId) => {
    const club = nextClubs[clubId];
    if (club) {
      club.seasonStats = {
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        formLastFive: []
      };
    }
  });

  // 7. Reset currentDate and Season state
  const nextSeasonNumber = currentSeason.seasonNumber + 1;
  const nextSeasonId = createId("season", rng);

  const nextSeason: Season = {
    id: nextSeasonId,
    seasonNumber: nextSeasonNumber,
    leagueId: nextLeagueId,
    clubIds: nextActiveClubIds,
    fixtures: generateFixtures(nextActiveClubIds, nextSeasonId),
    table: createEmptyTable(nextActiveClubIds),
    currentMatchday: 1,
    status: "pending",
    rewardsPaid: false
  };

  let rolledState: GameState = {
    ...gameState,
    currentDate: {
      seasonNumber: nextSeasonNumber,
      week: 1,
      phase: "transferWindow"
    },
    currentSeasonId: nextSeasonId,
    clubs: nextClubs,
    players: nextPlayers,
    leagues: pyramid.leagues,
    nameRegistry,
    seasons: {
      ...gameState.seasons,
      [nextSeasonId]: nextSeason
    },
    transferMarket: createOpenTransferMarket({
      listedPlayerIds: listedIdsList,
      freeAgentPlayerIds: freeAgentIdsList
    })
  };
  rolledState = processOffseasonFinances(rolledState, economyProfile.offseasonWeeks);
  rolledState = advanceFacilityConstruction(rolledState, economyProfile.offseasonWeeks, [rolledState.playerClubId]);
  rolledState = advanceYouthAcademy(rolledState, economyProfile.offseasonWeeks, rng);
  return rolledState;
}

export function finalizeTransferWindow(
  gameState: GameState,
  options: { skipSquadValidation?: boolean } = {}
): GameState {
  if (gameState.transferMarket.status !== "open" || gameState.currentDate.phase !== "transferWindow") {
    throw new Error("Cannot finalize transfer window: no offseason transfer window is open.");
  }

  const season = gameState.seasons[gameState.currentSeasonId];
  if (!season || season.status !== "pending") {
    throw new Error("Cannot finalize transfer window: next season is not pending.");
  }
  const finalizationIssues = options.skipSquadValidation ? [] : getTransferWindowFinalizationIssues(gameState);
  if (finalizationIssues.length > 0) {
    throw new Error(`Cannot finalize transfer window: ${finalizationIssues.join(" ")}`);
  }

  return {
    ...gameState,
    currentDate: {
      ...gameState.currentDate,
      week: 1,
      phase: "regularSeason"
    },
    seasons: {
      ...gameState.seasons,
      [season.id]: {
        ...season,
        status: "active"
      }
    },
    transferMarket: {
      ...gameState.transferMarket,
      status: "closed",
      currentWeek: 0,
      actionsRemaining: 0
    }
  };
}

// Diagnostics and legacy domain tests can still advance seasons in one call.
export function rollOverSeason(gameState: GameState, rng: RandomSource = Math.random): GameState {
  return finalizeTransferWindow(openTransferWindow(gameState, rng), { skipSquadValidation: true });
}
