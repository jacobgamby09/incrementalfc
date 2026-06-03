export const playerContextProfile = {
  morale: {
    initialMin: 55,
    initialMax: 75,
    resultDelta: {
      win: 2,
      draw: 0,
      loss: -2
    },
    expiringContractDelta: -1,
    rolePlayingTimeDelta: {
      key_player: { started: 2, omitted: -5 },
      regular_starter: { started: 2, omitted: -3 },
      rotation: { started: 1, omitted: 0 },
      backup: { started: 1, omitted: 0 },
      prospect: { started: 1, omitted: 0 }
    }
  },
  marketReputation: {
    currentAbilityWeight: 5,
    potentialWeight: 1.5,
    agePeakBonus: 5,
    strongRatingThreshold: 7.5,
    weakRatingThreshold: 5.5,
    strongRatingDelta: 1,
    weakRatingDelta: -1,
    goalDelta: 1,
    assistDelta: 0.5,
    maxMatchdayDelta: 3
  }
} as const;
