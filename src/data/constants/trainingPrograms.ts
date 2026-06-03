import type { Player } from "../../domain/types/player";
import type { TrainingFocus } from "../../domain/types/training";
import { isGoalkeeperStats } from "../../domain/types/player";

export type TrainingProgram = {
  id: TrainingFocus;
  name: string;
  description: string;
  statKeys: string[];
  goalkeeperEligible: boolean;
  outfieldEligible: boolean;
};

export const trainingPrograms: TrainingProgram[] = [
  {
    id: "technical",
    name: "Technical",
    description: "Improves close control and execution under pressure.",
    statKeys: ["TEC", "DRI"],
    goalkeeperEligible: true,
    outfieldEligible: true
  },
  {
    id: "passing",
    name: "Passing",
    description: "Develops distribution and chance-building quality.",
    statKeys: ["PAS", "TEC", "CRO"],
    goalkeeperEligible: false,
    outfieldEligible: true
  },
  {
    id: "finishing",
    name: "Finishing",
    description: "Targets shooting, movement and composure in dangerous areas.",
    statKeys: ["SHO", "POS", "MEN"],
    goalkeeperEligible: false,
    outfieldEligible: true
  },
  {
    id: "defending",
    name: "Defending",
    description: "Builds tackling, positioning and physical resilience.",
    statKeys: ["TAC", "POS", "PHY", "HEA"],
    goalkeeperEligible: false,
    outfieldEligible: true
  },
  {
    id: "physical",
    name: "Physical",
    description: "Develops athletic qualities and repeat-effort capacity.",
    statKeys: ["STA", "ACC", "PHY"],
    goalkeeperEligible: true,
    outfieldEligible: true
  },
  {
    id: "goalkeeping",
    name: "Goalkeeping",
    description: "Specialist work for reflexes, handling and distribution.",
    statKeys: ["REF", "HAN", "DIS"],
    goalkeeperEligible: true,
    outfieldEligible: false
  }
];

export function getTrainingProgram(focus: TrainingFocus): TrainingProgram {
  return trainingPrograms.find((program) => program.id === focus) ?? trainingPrograms[0];
}

export function getEligibleTrainingPrograms(player: Player): TrainingProgram[] {
  const isGoalkeeper = isGoalkeeperStats(player.currentStats);
  return trainingPrograms.filter((program) =>
    isGoalkeeper ? program.goalkeeperEligible : program.outfieldEligible
  );
}
