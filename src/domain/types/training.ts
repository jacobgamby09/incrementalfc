export type TrainingFocus =
  | "technical"
  | "passing"
  | "finishing"
  | "defending"
  | "physical"
  | "goalkeeping";

export type FocusedTrainingAssignment = {
  slotIndex: number;
  playerId: string;
  focus: TrainingFocus;
};

export type ClubTraining = {
  focusedAssignments: FocusedTrainingAssignment[];
};
