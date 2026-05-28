export type SquadTablePresetId = "overview" | "attributes" | "performance" | "contract" | "development";

export type SquadTablePreset = {
  id: SquadTablePresetId;
  label: string;
  columns: string[];
};

export const squadTablePresets: SquadTablePreset[] = [
  {
    id: "overview",
    label: "Overview",
    columns: ["Player", "Age", "Position", "OVR", "Est. POT", "Form", "Avg Rating", "Wage", "Value"]
  },
  {
    id: "attributes",
    label: "Attributes",
    columns: ["Player", "Position", "PAS", "SHO", "TAC", "CRO", "HEA", "ACC", "REF", "HAN", "DIS", "TEC", "PHY", "MEN"]
  },
  {
    id: "performance",
    label: "Performance",
    columns: ["Player", "Position", "Apps", "Goals", "Assists/Key Passes", "Avg Rating", "Form", "Last Rating"]
  },
  {
    id: "contract",
    label: "Contract",
    columns: ["Player", "Age", "Position", "Wage", "Value", "Contract Remaining"]
  },
  {
    id: "development",
    label: "Development",
    columns: ["Player", "Age", "Position", "OVR", "Est. POT", "Match XP", "Training XP", "Last XP", "Recent Growth", "Cap Status"]
  }
];
