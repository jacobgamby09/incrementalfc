export type TransferWindowStatus = "closed" | "open";

export type NegotiationPackage = "lowball" | "cautious" | "fair" | "statement";
export type SaleStrategy = "quick_sale" | "market_price" | "hold_out";
export type TransferNegotiationStatus = "active" | "accepted" | "rejected" | "collapsed";

export type TransferNegotiation = {
  id: string;
  playerId: string;
  kind: "signing" | "renewal";
  status: TransferNegotiationStatus;
  attemptsRemaining: number;
  lastPackage?: NegotiationPackage;
  offeredSquadRole?: import("./player").SquadRole;
  offeredContractSeasons?: number;
  offeredWagePerWeek?: number;
  transferFee?: number;
  willingnessScore?: number;
  message?: string;
};

export type TransferOffer = {
  id: string;
  playerId: string;
  buyingClubId: string;
  sellingClubId: string;
  amount: number;
  strategy: SaleStrategy;
  createdWeek: number;
  expiresAfterWeek: number;
  status: "pending" | "accepted" | "rejected" | "expired";
};

export type TransferMarketState = {
  status: TransferWindowStatus;
  currentWeek: number;
  totalWeeks: number;
  actionsRemaining: number;
  listedPlayerIds: string[];
  freeAgentPlayerIds: string[];
  scoutedOpportunityPlayerIds: string[];
  negotiations: Record<string, TransferNegotiation>;
  incomingOffers: TransferOffer[];
};
