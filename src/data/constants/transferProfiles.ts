export const transferWindowProfile = {
  totalWeeks: 3,
  actionsPerWindow: 5,
  negotiationPatience: 3,
  acceptanceThreshold: 55
} as const;

export const negotiationPackageProfiles = {
  lowball: {
    label: "Lowball",
    description: "Protect the budget, but risk ending talks quickly.",
    patienceCost: 2,
    wageMultiplier: 0.9,
    transferFeeMultiplier: 0.9,
    willingnessModifier: -20
  },
  cautious: {
    label: "Cautious",
    description: "A restrained offer with a modest chance of success.",
    patienceCost: 1,
    wageMultiplier: 1,
    transferFeeMultiplier: 0.96,
    willingnessModifier: -5
  },
  fair: {
    label: "Fair",
    description: "A competitive offer that should suit realistic targets.",
    patienceCost: 1,
    wageMultiplier: 1.12,
    transferFeeMultiplier: 1,
    willingnessModifier: 12
  },
  statement: {
    label: "Statement",
    description: "Spend heavily to make the player feel wanted.",
    patienceCost: 0,
    wageMultiplier: 1.3,
    transferFeeMultiplier: 1.08,
    willingnessModifier: 30
  }
} as const;

export const transferWillingnessProfile = {
  baseScore: 25,
  interestLevelWeight: 0.35,
  clubReputationWeight: 2,
  leagueLevelWeight: 6,
  longerContractBonusPerSeason: 2,
  renewalMoraleWeight: 0.2,
  squadRoleModifiers: {
    key_player: 18,
    regular_starter: 12,
    rotation: 4,
    backup: -8,
    prospect: 2
  }
} as const;

export const saleStrategyProfiles = {
  quick_sale: {
    label: "Quick Sale",
    description: "Invite faster bids by accepting a discount below market value.",
    askingPriceMultiplier: 0.85,
    weeklyOfferChance: 0.9
  },
  market_price: {
    label: "Market Price",
    description: "Seek a fair fee with a balanced chance of attracting a buyer.",
    askingPriceMultiplier: 1,
    weeklyOfferChance: 0.65
  },
  hold_out: {
    label: "Hold Out",
    description: "Ask for a premium and accept that a suitable offer may never arrive.",
    askingPriceMultiplier: 1.2,
    weeklyOfferChance: 0.38
  }
} as const;

export const aiTransferActivityProfile = {
  minimumBuyerCashReserve: 15_000,
  offerVariationMinimum: 0.96,
  offerVariationMaximum: 1.04,
  neededPositionChanceBonus: 0.12,
  thinSquadChanceBonus: 0.08,
  ambitiousClubChanceBonus: 0.05,
  financiallyCautiousChancePenalty: 0.12
} as const;
