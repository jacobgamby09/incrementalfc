export const economyProfile = {
  startingPlayerCash: 180_000,
  weeklyBaselineIncome: 6_500,
  staffWagePlaceholder: 2_000,
  ticketBasePrice: 12,
  reserveWarningWeeks: 3,
  offseasonWeeks: 2,
  attendance: {
    baseRate: 0.4,
    minimumRate: 0.28,
    maximumRate: 0.92,
    reputationRatePerPointAboveTen: 0.008,
    hypeRateAtMaximum: 0.22,
    opponentRatePerReputation: 0.003
  },
  resultBonuses: {
    win: 1_200,
    draw: 500,
    loss: 200
  },
  forecastScenarios: {
    conservative: {
      label: "Conservative",
      gateReceiptMultiplier: 0.85,
      resultBonusPerFixture: 250
    },
    expected: {
      label: "Expected",
      gateReceiptMultiplier: 1.0,
      resultBonusPerFixture: 650
    },
    optimistic: {
      label: "Optimistic",
      gateReceiptMultiplier: 1.12,
      resultBonusPerFixture: 1050
    }
  }
} as const;
