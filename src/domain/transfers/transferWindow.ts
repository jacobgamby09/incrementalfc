import {
  aiTransferActivityProfile,
  negotiationPackageProfiles,
  saleStrategyProfiles,
  transferWillingnessProfile,
  transferWindowProfile
} from "../../data/constants/transferProfiles";
import { clamp } from "../../utils/math";
import { createId, type RandomSource, defaultRandom } from "../../utils/random";
import { calculatePlayerOvr } from "../player/playerSummaries";
import type { GameState } from "../types/game";
import type { SquadRole } from "../types/player";
import type { NegotiationPackage, SaleStrategy, TransferMarketState, TransferNegotiation, TransferOffer } from "../types/transfer";
import { appendFinanceTransaction } from "../economy/financeLedger";

type TransferPool = {
  listedPlayerIds?: string[];
  freeAgentPlayerIds?: string[];
};

export const MINIMUM_PLAYABLE_SQUAD_SIZE = 11;

export function getTransferWindowFinalizationIssues(gameState: GameState): string[] {
  const playerClub = gameState.clubs[gameState.playerClubId];
  const squadPlayers = playerClub.squadPlayerIds
    .map((playerId) => gameState.players[playerId])
    .filter(Boolean);
  const expiredContracts = squadPlayers.filter((player) => player.contract.seasonsRemaining <= 0);
  const contractedPlayers = squadPlayers.filter((player) => player.contract.seasonsRemaining > 0);
  const issues: string[] = [];

  if (expiredContracts.length > 0) {
    issues.push(
      `${expiredContracts.length} player contract${expiredContracts.length === 1 ? "" : "s"} must be renewed before the next season.`
    );
  }
  if (contractedPlayers.length < MINIMUM_PLAYABLE_SQUAD_SIZE) {
    issues.push(
      `At least ${MINIMUM_PLAYABLE_SQUAD_SIZE} contracted players are required to start the season. You currently have ${contractedPlayers.length}.`
    );
  }

  return issues;
}

export function createClosedTransferMarket(): TransferMarketState {
  return {
    status: "closed",
    currentWeek: 0,
    totalWeeks: transferWindowProfile.totalWeeks,
    actionsRemaining: 0,
    listedPlayerIds: [],
    freeAgentPlayerIds: [],
    scoutedOpportunityPlayerIds: [],
    negotiations: {},
    incomingOffers: []
  };
}

export function createOpenTransferMarket(pool: TransferPool = {}): TransferMarketState {
  return {
    status: "open",
    currentWeek: 1,
    totalWeeks: transferWindowProfile.totalWeeks,
    actionsRemaining: transferWindowProfile.actionsPerWindow,
    listedPlayerIds: [...new Set(pool.listedPlayerIds ?? [])],
    freeAgentPlayerIds: [...new Set(pool.freeAgentPlayerIds ?? [])],
    scoutedOpportunityPlayerIds: [],
    negotiations: {},
    incomingOffers: []
  };
}

export function advanceTransferWeek(gameState: GameState, rng: RandomSource = defaultRandom): GameState {
  if (gameState.transferMarket.status !== "open") return gameState;
  if (gameState.transferMarket.currentWeek >= gameState.transferMarket.totalWeeks) return gameState;

  const nextState = {
    ...gameState,
    currentDate: {
      ...gameState.currentDate,
      week: gameState.currentDate.week + 1
    },
    transferMarket: {
      ...gameState.transferMarket,
      currentWeek: gameState.transferMarket.currentWeek + 1
    }
  };

  return generateIncomingTransferOffers(expireIncomingTransferOffers(nextState), rng);
}

function assertOpenTransferWindow(gameState: GameState): void {
  if (gameState.transferMarket.status !== "open" || gameState.currentDate.phase !== "transferWindow") {
    throw new Error("This action is only available during the offseason transfer window.");
  }
}

function getContractedSquadSize(gameState: GameState, clubId: string): number {
  return gameState.clubs[clubId].squadPlayerIds.filter(
    (playerId) => (gameState.players[playerId]?.contract.seasonsRemaining ?? 0) > 0
  ).length;
}

function expireIncomingTransferOffers(gameState: GameState, playerId?: string): GameState {
  const incomingOffers = gameState.transferMarket.incomingOffers.map((offer) =>
    offer.status === "pending" &&
    (offer.expiresAfterWeek < gameState.transferMarket.currentWeek || offer.playerId === playerId)
      ? { ...offer, status: "expired" as const }
      : offer
  );

  return {
    ...gameState,
    transferMarket: {
      ...gameState.transferMarket,
      incomingOffers
    }
  };
}

function scorePotentialBuyer(gameState: GameState, clubId: string, playerId: string): number {
  const club = gameState.clubs[clubId];
  const player = gameState.players[playerId];
  if (!club || !player) return -Infinity;
  const neededPosition = club.ecosystem.squadNeedProfile.positions.includes(player.primaryPosition);
  const thinSquad = club.squadPlayerIds.length < 18;
  return (neededPosition ? 20 : 0) +
    (thinSquad ? 10 : 0) +
    (club.ecosystem.archetype === "ambitious" ? 6 : 0) -
    (club.ecosystem.archetype === "financially_cautious" ? 6 : 0) +
    calculatePlayerOvr(player);
}

function createIncomingOffer(
  gameState: GameState,
  playerId: string,
  strategy: SaleStrategy,
  rng: RandomSource
): TransferOffer | undefined {
  const player = gameState.players[playerId];
  if (!player) return undefined;
  const profile = saleStrategyProfiles[strategy];
  const activeClubIds = Object.keys(gameState.clubs);
  const askingPrice = Math.round(player.contract.marketValue * profile.askingPriceMultiplier);
  const playerOvr = calculatePlayerOvr(player);
  const eligibleBuyers = activeClubIds
    .filter((clubId) => clubId !== gameState.playerClubId)
    .map((clubId) => gameState.clubs[clubId])
    .filter(Boolean)
    .filter((club) => {
      const league = gameState.leagues[club.leagueId];
      return !league || playerOvr >= Math.max(1, league.targetOvrRange[0] - 3);
    })
    .filter((club) => club.economy.cashBalance >= askingPrice + aiTransferActivityProfile.minimumBuyerCashReserve)
    .sort((left, right) => scorePotentialBuyer(gameState, right.id, player.id) - scorePotentialBuyer(gameState, left.id, player.id));
  const buyer = eligibleBuyers[0];
  if (!buyer) return undefined;

  const neededPosition = buyer.ecosystem.squadNeedProfile.positions.includes(player.primaryPosition);
  const chance = clamp(
    profile.weeklyOfferChance +
      (neededPosition ? aiTransferActivityProfile.neededPositionChanceBonus : 0) +
      (buyer.squadPlayerIds.length < 18 ? aiTransferActivityProfile.thinSquadChanceBonus : 0) +
      (buyer.ecosystem.archetype === "ambitious" ? aiTransferActivityProfile.ambitiousClubChanceBonus : 0) -
      (buyer.ecosystem.archetype === "financially_cautious" ? aiTransferActivityProfile.financiallyCautiousChancePenalty : 0),
    0.05,
    0.98
  );
  if (rng() > chance) return undefined;

  const variation = aiTransferActivityProfile.offerVariationMinimum +
    rng() * (aiTransferActivityProfile.offerVariationMaximum - aiTransferActivityProfile.offerVariationMinimum);
  return {
    id: createId("incoming_offer", rng),
    playerId: player.id,
    buyingClubId: buyer.id,
    sellingClubId: gameState.playerClubId,
    amount: Math.round(askingPrice * variation),
    strategy,
    createdWeek: gameState.transferMarket.currentWeek,
    expiresAfterWeek: gameState.transferMarket.currentWeek,
    status: "pending"
  };
}

export function generateIncomingTransferOffers(
  gameState: GameState,
  rng: RandomSource = defaultRandom
): GameState {
  if (gameState.transferMarket.status !== "open") return gameState;
  const playerClub = gameState.clubs[gameState.playerClubId];
  const pendingPlayerIds = new Set(
    gameState.transferMarket.incomingOffers
      .filter((offer) => offer.status === "pending")
      .map((offer) => offer.playerId)
  );
  const newOffers = playerClub.squadPlayerIds.flatMap((playerId) => {
    const player = gameState.players[playerId];
    if (!player?.transferIntent.isListed || pendingPlayerIds.has(playerId)) return [];
    const strategy = player.transferIntent.saleStrategy ?? "market_price";
    const offer = createIncomingOffer(gameState, playerId, strategy, rng);
    return offer ? [offer] : [];
  });
  if (newOffers.length === 0) return gameState;

  return {
    ...gameState,
    transferMarket: {
      ...gameState.transferMarket,
      incomingOffers: [...gameState.transferMarket.incomingOffers, ...newOffers]
    }
  };
}

export function listPlayerForSale(
  gameState: GameState,
  playerId: string,
  strategy: SaleStrategy,
  rng: RandomSource = defaultRandom
): GameState {
  assertOpenTransferWindow(gameState);
  const player = gameState.players[playerId];
  if (!player || player.clubId !== gameState.playerClubId) {
    throw new Error("Only your own players can be listed for sale.");
  }
  if (player.contract.seasonsRemaining <= 0) {
    throw new Error("Renew this player's expired contract before listing them for sale.");
  }
  if (getContractedSquadSize(gameState, gameState.playerClubId) <= MINIMUM_PLAYABLE_SQUAD_SIZE) {
    throw new Error(`Keep at least ${MINIMUM_PLAYABLE_SQUAD_SIZE} contracted players before listing someone for sale.`);
  }
  const profile = saleStrategyProfiles[strategy];
  const nextState = {
    ...gameState,
    players: {
      ...gameState.players,
      [player.id]: {
        ...player,
        transferIntent: {
          ...player.transferIntent,
          isListed: true,
          listingReason: "player_listed" as const,
          saleStrategy: strategy,
          askingPrice: Math.round(player.contract.marketValue * profile.askingPriceMultiplier)
        }
      }
    }
  };

  return generateIncomingTransferOffers(nextState, rng);
}

export function removePlayerListing(gameState: GameState, playerId: string): GameState {
  assertOpenTransferWindow(gameState);
  const player = gameState.players[playerId];
  if (!player || player.clubId !== gameState.playerClubId) {
    throw new Error("Only your own players can be removed from sale.");
  }
  const nextState = expireIncomingTransferOffers(gameState, player.id);
  return {
    ...nextState,
    players: {
      ...nextState.players,
      [player.id]: {
        ...player,
        transferIntent: {
          ...player.transferIntent,
          isListed: false,
          listingReason: "none" as const,
          saleStrategy: undefined,
          askingPrice: 0
        }
      }
    }
  };
}

export function respondToIncomingTransferOffer(
  gameState: GameState,
  offerId: string,
  decision: "accept" | "reject"
): GameState {
  assertOpenTransferWindow(gameState);
  const offer = gameState.transferMarket.incomingOffers.find((candidate) => candidate.id === offerId);
  if (!offer || offer.status !== "pending") throw new Error("This offer is no longer available.");
  if (decision === "reject") {
    return {
      ...gameState,
      transferMarket: {
        ...gameState.transferMarket,
        incomingOffers: gameState.transferMarket.incomingOffers.map((candidate) =>
          candidate.id === offer.id ? { ...candidate, status: "rejected" as const } : candidate
        )
      }
    };
  }

  const player = gameState.players[offer.playerId];
  const seller = gameState.clubs[offer.sellingClubId];
  const buyer = gameState.clubs[offer.buyingClubId];
  if (!player || player.clubId !== seller?.id || seller.id !== gameState.playerClubId || !buyer) {
    throw new Error("The sale can no longer be completed.");
  }
  if (getContractedSquadSize(gameState, seller.id) <= MINIMUM_PLAYABLE_SQUAD_SIZE) {
    throw new Error(`Keep at least ${MINIMUM_PLAYABLE_SQUAD_SIZE} contracted players after completing a sale.`);
  }
  if (buyer.economy.cashBalance < offer.amount) {
    throw new Error("The buying club can no longer afford this offer.");
  }
  const seasonNumber = gameState.currentDate.seasonNumber;
  const week = gameState.currentDate.week;
  const sellerEconomy = appendFinanceTransaction(seller.economy, {
    seasonNumber,
    week,
    category: "transfer_sale",
    amount: offer.amount,
    description: `Sale of ${player.firstName} ${player.lastName}`
  });
  const buyerEconomy = appendFinanceTransaction(buyer.economy, {
    seasonNumber,
    week,
    category: "transfer_purchase",
    amount: -offer.amount,
    description: `Purchase of ${player.firstName} ${player.lastName}`
  });

  return {
    ...gameState,
    players: {
      ...gameState.players,
      [player.id]: {
        ...player,
        clubId: buyer.id,
        transferIntent: {
          ...player.transferIntent,
          isListed: false,
          listingReason: "none",
          saleStrategy: undefined,
          askingPrice: 0
        }
      }
    },
    clubs: {
      ...gameState.clubs,
      [seller.id]: {
        ...seller,
        squadPlayerIds: seller.squadPlayerIds.filter((playerId) => playerId !== player.id),
        economy: { ...sellerEconomy, cashBalance: seller.economy.cashBalance + offer.amount }
      },
      [buyer.id]: {
        ...buyer,
        squadPlayerIds: buyer.squadPlayerIds.includes(player.id)
          ? buyer.squadPlayerIds
          : [...buyer.squadPlayerIds, player.id],
        economy: { ...buyerEconomy, cashBalance: buyer.economy.cashBalance - offer.amount }
      }
    },
    transferMarket: {
      ...gameState.transferMarket,
      incomingOffers: gameState.transferMarket.incomingOffers.map((candidate) =>
        candidate.playerId === player.id
          ? { ...candidate, status: candidate.id === offer.id ? "accepted" as const : "expired" as const }
          : candidate
      )
    }
  };
}

export type SubmitNegotiationOfferInput = {
  playerId: string;
  kind: "signing" | "renewal";
  packageId: NegotiationPackage;
  offeredSquadRole: SquadRole;
  contractSeasons: number;
};

function getLeagueLevel(gameState: GameState, clubId: string | null): number {
  if (!clubId) return 0;
  const club = gameState.clubs[clubId];
  return club ? (gameState.leagues[club.leagueId]?.level ?? 1) : 0;
}

function negotiationId(playerId: string, kind: SubmitNegotiationOfferInput["kind"]): string {
  return `${kind}_${playerId}`;
}

function calculateTransferFee(
  gameState: GameState,
  playerId: string,
  packageId: NegotiationPackage,
  kind: SubmitNegotiationOfferInput["kind"]
): number {
  const player = gameState.players[playerId];
  if (!player || kind === "renewal" || !player.clubId) return 0;
  const askingPrice = player.transferIntent.askingPrice || player.contract.marketValue;
  return Math.round(askingPrice * negotiationPackageProfiles[packageId].transferFeeMultiplier);
}

export function calculateNegotiationWillingness(
  gameState: GameState,
  input: SubmitNegotiationOfferInput
): number {
  const player = gameState.players[input.playerId];
  if (!player) return 0;
  const profile = transferWillingnessProfile;
  const playerClub = gameState.clubs[gameState.playerClubId];
  const currentLeagueLevel = getLeagueLevel(gameState, player.clubId);
  const destinationLeagueLevel = getLeagueLevel(gameState, playerClub.id);
  const reputationDelta = playerClub.reputation - player.marketReputation / 5;
  const packageProfile = negotiationPackageProfiles[input.packageId];
  const interestLevel = input.kind === "renewal"
    ? player.status.morale
    : player.transferIntent.interestLevel;
  const moraleModifier = input.kind === "renewal"
    ? (player.status.morale - 50) * profile.renewalMoraleWeight
    : 0;

  return Math.round(clamp(
    profile.baseScore +
      interestLevel * profile.interestLevelWeight +
      reputationDelta * profile.clubReputationWeight +
      (destinationLeagueLevel - currentLeagueLevel) * profile.leagueLevelWeight +
      profile.squadRoleModifiers[input.offeredSquadRole] +
      input.contractSeasons * profile.longerContractBonusPerSeason +
      packageProfile.willingnessModifier +
      moraleModifier,
    0,
    100
  ));
}

function completeAcceptedNegotiation(
  gameState: GameState,
  input: SubmitNegotiationOfferInput,
  negotiation: TransferNegotiation
): GameState {
  const player = gameState.players[input.playerId];
  const playerClub = gameState.clubs[gameState.playerClubId];
  const previousClub = player.clubId ? gameState.clubs[player.clubId] : undefined;
  const transferFee = negotiation.transferFee ?? 0;
  const nextPlayers = {
    ...gameState.players,
    [player.id]: {
      ...player,
      clubId: playerClub.id,
      squadRole: input.offeredSquadRole,
      contract: {
        ...player.contract,
        wagePerWeek: negotiation.offeredWagePerWeek ?? player.contract.wagePerWeek,
        seasonsRemaining: input.contractSeasons
      },
      transferIntent: {
        ...player.transferIntent,
        isListed: false,
        listingReason: "none" as const,
        askingPrice: 0
      }
    }
  };

  const seasonNumber = gameState.currentDate.seasonNumber;
  const week = gameState.currentDate.week;

  let updatedBuyerEconomy = playerClub.economy;
  if (transferFee > 0) {
    updatedBuyerEconomy = appendFinanceTransaction(playerClub.economy, {
      seasonNumber,
      week,
      category: "transfer_purchase",
      amount: -transferFee,
      description: `Purchase of ${player.firstName} ${player.lastName}`
    });
  }

  const nextClubs = {
    ...gameState.clubs,
    [playerClub.id]: {
      ...playerClub,
      squadPlayerIds: playerClub.squadPlayerIds.includes(player.id)
        ? playerClub.squadPlayerIds
        : [...playerClub.squadPlayerIds, player.id],
      economy: {
        ...updatedBuyerEconomy,
        cashBalance: playerClub.economy.cashBalance - transferFee
      }
    }
  };

  if (previousClub && previousClub.id !== playerClub.id) {
    let updatedSellerEconomy = previousClub.economy;
    if (transferFee > 0) {
      updatedSellerEconomy = appendFinanceTransaction(previousClub.economy, {
        seasonNumber,
        week,
        category: "transfer_sale",
        amount: transferFee,
        description: `Sale of ${player.firstName} ${player.lastName}`
      });
    }
    nextClubs[previousClub.id] = {
      ...previousClub,
      squadPlayerIds: previousClub.squadPlayerIds.filter((playerId) => playerId !== player.id),
      economy: {
        ...updatedSellerEconomy,
        cashBalance: previousClub.economy.cashBalance + transferFee
      }
    };
  }

  return {
    ...gameState,
    players: nextPlayers,
    clubs: nextClubs,
    transferMarket: {
      ...gameState.transferMarket,
      listedPlayerIds: gameState.transferMarket.listedPlayerIds.filter((playerId) => playerId !== player.id),
      freeAgentPlayerIds: gameState.transferMarket.freeAgentPlayerIds.filter((playerId) => playerId !== player.id),
      scoutedOpportunityPlayerIds: gameState.transferMarket.scoutedOpportunityPlayerIds.filter((playerId) => playerId !== player.id)
    }
  };
}

export function submitNegotiationOffer(
  gameState: GameState,
  input: SubmitNegotiationOfferInput
): GameState {
  if (gameState.transferMarket.status !== "open" || gameState.currentDate.phase !== "transferWindow") {
    throw new Error("Negotiations are only available during the offseason transfer window.");
  }
  const isRenewal = input.kind === "renewal";
  if (!isRenewal && gameState.transferMarket.actionsRemaining <= 0) {
    throw new Error("No transfer actions remain in this window.");
  }

  const player = gameState.players[input.playerId];
  if (!player) throw new Error("Player not found.");
  if (isRenewal && player.clubId !== gameState.playerClubId) {
    throw new Error("Only your own players can receive renewal offers.");
  }
  if (!isRenewal && player.clubId === gameState.playerClubId) {
    throw new Error("Your own players require a renewal offer.");
  }

  const id = negotiationId(player.id, input.kind);
  const existing = gameState.transferMarket.negotiations[id];
  if (existing?.status === "accepted" || existing?.status === "collapsed") return gameState;
  const packageProfile = negotiationPackageProfiles[input.packageId];
  const attemptsRemaining = (existing?.attemptsRemaining ?? transferWindowProfile.negotiationPatience) -
    packageProfile.patienceCost;
  const transferFee = calculateTransferFee(gameState, player.id, input.packageId, input.kind);
  const offeredWagePerWeek = Math.round(player.contract.wagePerWeek * packageProfile.wageMultiplier);
  const willingnessScore = calculateNegotiationWillingness(gameState, input);
  const affordable = transferFee <= gameState.clubs[gameState.playerClubId].economy.cashBalance;
  const accepted = affordable && willingnessScore >= transferWindowProfile.acceptanceThreshold;
  const status = accepted ? "accepted" : attemptsRemaining <= 0 ? "collapsed" : "active";
  const message = accepted
    ? `${player.firstName} ${player.lastName} accepted the ${packageProfile.label.toLowerCase()} package.`
    : !affordable
      ? "The club cannot afford this transfer fee."
      : status === "collapsed"
        ? "The player walked away after the latest offer."
        : "The player rejected the offer but remains open to improved terms.";
  const negotiation: TransferNegotiation = {
    id,
    playerId: player.id,
    kind: input.kind,
    status,
    attemptsRemaining: Math.max(0, attemptsRemaining),
    lastPackage: input.packageId,
    offeredSquadRole: input.offeredSquadRole,
    offeredContractSeasons: input.contractSeasons,
    offeredWagePerWeek,
    transferFee,
    willingnessScore,
    message
  };
  const nextState = {
    ...gameState,
    transferMarket: {
      ...gameState.transferMarket,
      actionsRemaining: gameState.transferMarket.actionsRemaining - (isRenewal ? 0 : 1),
      negotiations: {
        ...gameState.transferMarket.negotiations,
        [id]: negotiation
      }
    }
  };

  return accepted ? completeAcceptedNegotiation(nextState, input, negotiation) : nextState;
}
