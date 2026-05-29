import type { Club } from "../types/club";
import type { GameState } from "../types/game";
import { isGoalkeeperStats, type GoalkeeperStats, type OutfieldStats, type Player } from "../types/player";
import type { Lineup, Tactic } from "../types/tactics";
import { getPositionFitModifier } from "../lineup/positionFit";
import { getTacticFamiliarity, getTacticFamiliarityModifier } from "../tactics/tacticFamiliarity";
import { focusProfiles, formationProfiles, riskProfiles, type PhaseKey } from "../tactics/tacticalProfiles";
import type { PlayerPosition } from "../types/player";
import { getOutfieldStatValue } from "../player/statAccess";

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

export const slotPhaseWeights: Record<PlayerPosition, Record<PhaseKey, number>> = {
  GK: { defence: 0, midfield: 0, attack: 0 },
  CB: { defence: 1.45, midfield: 0.35, attack: 0.25 },
  LB: { defence: 1.2, midfield: 0.7, attack: 0.45 },
  RB: { defence: 1.2, midfield: 0.7, attack: 0.45 },
  WB: { defence: 1.1, midfield: 1.1, attack: 0.8 },
  DM: { defence: 1.25, midfield: 1.2, attack: 0.45 },
  CM: { defence: 0.7, midfield: 1.35, attack: 0.75 },
  AM: { defence: 0.45, midfield: 1.15, attack: 1.2 },
  LW: { defence: 0.5, midfield: 0.75, attack: 1.25 },
  RW: { defence: 0.5, midfield: 0.75, attack: 1.25 },
  ST: { defence: 0.3, midfield: 0.35, attack: 1.45 }
};

function tacticalPhaseModifier(tactic: Tactic, phase: PhaseKey): number {
  return (
    formationProfiles[tactic.formation].phaseModifiers[phase] *
    focusProfiles[tactic.focus].phaseModifiers[phase] *
    riskProfiles[tactic.riskLevel].phaseModifiers[phase]
  );
}

function phaseContribution(
  player: Player,
  slotPosition: PlayerPosition,
  phase: PhaseKey
): number {
  const stats = outfieldStats(player);
  if (!stats) return 0;
  const fitModifier = getPositionFitModifier(player, slotPosition);
  const slotWeight = slotPhaseWeights[slotPosition][phase];
  const value = (key: keyof OutfieldStats) => getOutfieldStatValue(stats, key);

  if (phase === "midfield") {
    return average([value("PAS"), value("TEC"), value("POS"), value("MEN")]) * slotWeight * fitModifier;
  }
  if (phase === "attack") {
    return average([value("SHO"), value("CRO"), value("ACC"), value("DRI"), value("POS"), value("TEC"), value("HEA")]) * slotWeight * fitModifier;
  }
  return average([value("TAC"), value("POS"), value("PHY"), value("HEA"), value("STA"), value("MEN")]) * slotWeight * fitModifier;
}

function calculateOutfieldPhase(
  slots: Array<{ slot: Lineup["starters"][number]; player: Player }>,
  tactic: Tactic,
  phase: PhaseKey
): number {
  const rawPhase = average(slots.map(({ slot, player }) => phaseContribution(player, slot.position, phase)));
  return rawPhase * 1.18 * tacticalPhaseModifier(tactic, phase);
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

  const midfield = calculateOutfieldPhase(outfieldSlots, tactic, "midfield");
  const attack = calculateOutfieldPhase(outfieldSlots, tactic, "attack");
  const defence = calculateOutfieldPhase(outfieldSlots, tactic, "defence");

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
