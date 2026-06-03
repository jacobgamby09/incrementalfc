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
    columns: ["Player", "Age", "Position", "Squad Role", "Best Focus", "OVR", "POT", "Dev Points", "Readiness", "Form", "Avg Rating"]
  },
  {
    id: "attributes",
    label: "Attributes",
    columns: ["Player", "Position", "PAS", "SHO", "TAC", "CRO", "HEA", "ACC", "STA", "DRI", "POS", "REF", "HAN", "DIS", "TEC", "PHY", "MEN"]
  },
  {
    id: "performance",
    label: "Performance",
    columns: ["Player", "Position", "Apps", "Goals", "Assists/Key Passes", "Avg Rating", "Form", "Last Rating"]
  },
  {
    id: "contract",
    label: "Contract",
    columns: ["Player", "Age", "Position", "Squad Role", "Morale", "Market Rep", "Wage", "Value", "Contract Remaining"]
  },
  {
    id: "development",
    label: "Development",
    columns: ["Player", "Age", "Position", "OVR", "POT", "Dev Points", "Match XP", "Training XP", "Last XP", "Recent Growth", "Development Status"]
  }
];
