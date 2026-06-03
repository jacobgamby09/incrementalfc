import { getFacilityLevelConfig } from "../../data/constants/facilityProfiles";
import { getEligibleTrainingPrograms } from "../../data/constants/trainingPrograms";
import type { Club } from "../types/club";
import type { Player } from "../types/player";
import type { FocusedTrainingAssignment, TrainingFocus } from "../types/training";

export function getFocusedTrainingSlotCount(club: Club): number {
  return getFacilityLevelConfig("trainingGround", club.facilities.trainingGround.level).effects.focusedTrainingSlots ?? 0;
}

export function getFocusedTrainingAssignment(club: Club, slotIndex: number): FocusedTrainingAssignment | undefined {
  return club.training.focusedAssignments.find((assignment) => assignment.slotIndex === slotIndex);
}

export function updateFocusedTrainingAssignment(options: {
  club: Club;
  players: Record<string, Player>;
  slotIndex: number;
  playerId?: string;
  focus?: TrainingFocus;
}): Club {
  const { club, players, slotIndex, playerId, focus } = options;
  const slotCount = getFocusedTrainingSlotCount(club);
  if (slotIndex < 0 || slotIndex >= slotCount) return club;

  const assignmentsWithoutSlot = club.training.focusedAssignments.filter(
    (assignment) => assignment.slotIndex !== slotIndex
  );
  if (!playerId) {
    return {
      ...club,
      training: { focusedAssignments: assignmentsWithoutSlot }
    };
  }

  const player = players[playerId];
  if (!player || !club.squadPlayerIds.includes(playerId)) return club;
  const assignmentsWithoutDuplicate = assignmentsWithoutSlot.filter(
    (assignment) => assignment.playerId !== playerId
  );
  const eligiblePrograms = getEligibleTrainingPrograms(player);
  const selectedFocus = eligiblePrograms.some((program) => program.id === focus)
    ? focus!
    : eligiblePrograms[0].id;

  return {
    ...club,
    training: {
      focusedAssignments: [
        ...assignmentsWithoutDuplicate,
        { slotIndex, playerId, focus: selectedFocus }
      ].sort((a, b) => a.slotIndex - b.slotIndex)
    }
  };
}
