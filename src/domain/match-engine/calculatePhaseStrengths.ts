import type { Club } from "../types/club";
import type { GameState } from "../types/game";
import { isGoalkeeperStats, type GoalkeeperStats, type OutfieldStats, type Player } from "../types/player";
import type { Lineup, Tactic } from "../types/tactics";
import { getPositionFitModifier } from "../lineup/positionFit";
import { getTacticFamiliarity, getTacticFamiliarityModifier } from "../tactics/tacticFamiliarity";

export type PhaseStrengths = {
  midfield: number;
  attack: number;
  defence: number;
  goalkeeper: number;
  familiarity: number;
  averageMentality: number;
};

function average(values: number[]): number {
  if (values.length === 0) return 1;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function outfieldStats(player: Player): OutfieldStats | undefined {
  return isGoalkeeperStats(player.currentStats) ? undefined : player.currentStats;
}

function goalkeeperStats(player: Player): GoalkeeperStats | undefined {
  return isGoalkeeperStats(player.currentStats) ? player.currentStats : undefined;
}

export function calculatePhaseStrengths(
  club: Club,
  gameState: GameState,
  lineup: Lineup,
  tactic: Tactic,
  isHome = false
): PhaseStrengths {
  const starterSlots = lineup.starters
    .map((slot) => ({ slot, player: gameState.players[slot.playerId] }))
    .filter(({ player }) => Boolean(player));
  const starters = starterSlots.map(({ player }) => player);
  const outfieldSlots = starterSlots.filter(({ player }) => !isGoalkeeperStats(player.currentStats));
  const goalkeeperSlot = starterSlots.find(({ slot, player }) => slot.position === "GK" && isGoalkeeperStats(player.currentStats));
  const familiarity = getTacticFamiliarity(club, tactic);
  const familiarityModifier = getTacticFamiliarityModifier(familiarity);
  const homeMentalityModifier = isHome ? 1.05 : 1;

  const midfield = average(
    outfieldSlots.map(({ slot, player }) => {
      const stats = outfieldStats(player);
      if (!stats) return 1;
      const positionWeight = ["DM", "CM", "AM", "WB"].includes(player.primaryPosition) ? 1.15 : 0.85;
      return average([stats.PAS, stats.TEC, stats.MEN]) * positionWeight * getPositionFitModifier(player, slot.position);
    })
  );

  const attack = average(
    outfieldSlots.map(({ slot, player }) => {
      const stats = outfieldStats(player);
      if (!stats) return 1;
      const positionWeight = ["LW", "RW", "ST", "AM"].includes(player.primaryPosition) ? 1.2 : 0.85;
      return average([stats.SHO, stats.CRO, stats.ACC, stats.TEC, stats.HEA]) * positionWeight * getPositionFitModifier(player, slot.position);
    })
  );

  const defence = average(
    outfieldSlots.map(({ slot, player }) => {
      const stats = outfieldStats(player);
      if (!stats) return 1;
      const positionWeight = ["CB", "LB", "RB", "WB", "DM"].includes(player.primaryPosition) ? 1.2 : 0.8;
      return average([stats.TAC, stats.PHY, stats.HEA, stats.MEN]) * positionWeight * getPositionFitModifier(player, slot.position);
    })
  );

  const goalkeeperStrength = goalkeeperSlot ? goalkeeperStats(goalkeeperSlot.player) : undefined;

  return {
    midfield: midfield * familiarityModifier * (isHome ? 1.03 : 1),
    attack: attack * familiarityModifier,
    defence: defence * familiarityModifier,
    goalkeeper: goalkeeperStrength
      ? average([goalkeeperStrength.REF, goalkeeperStrength.HAN, goalkeeperStrength.MEN]) * homeMentalityModifier
      : 1,
    familiarity,
    averageMentality:
      average(
        starters.map((player) =>
          isGoalkeeperStats(player.currentStats) ? player.currentStats.MEN : player.currentStats.MEN
        )
      ) * homeMentalityModifier
  };
}
