import { describe, expect, it } from "vitest";
import { lowestLeagueStatRange } from "../../data/constants/leagueProfiles";
import { generatePlayer } from "../generation/generatePlayer";
import { getSquadStatValue, sortSquadPlayers } from "./squadTableView";

describe("squad table view", () => {
  it("sorts squad players by age, position, OVR, and estimated POT", () => {
    const younger = generatePlayer({ clubId: "club", position: "ST", statRange: lowestLeagueStatRange, kitNumber: 9 });
    const older = generatePlayer({ clubId: "club", position: "GK", statRange: lowestLeagueStatRange, kitNumber: 1 });
    younger.age = 18;
    older.age = 33;
    younger.currentStats = { PAS: 1, SHO: 10, TAC: 1, CRO: 1, HEA: 8, ACC: 10, STA: 7, DRI: 9, POS: 8, TEC: 9, PHY: 1, MEN: 8 };
    younger.potentialStats = { PAS: 10, SHO: 10, TAC: 10, CRO: 10, HEA: 10, ACC: 10, STA: 10, DRI: 10, POS: 10, TEC: 10, PHY: 10, MEN: 10 };
    older.currentStats = { REF: 2, HAN: 2, DIS: 2, TEC: 2, PHY: 2, MEN: 2 };
    older.potentialStats = { REF: 10, HAN: 10, DIS: 10, TEC: 10, PHY: 10, MEN: 10 };

    expect(sortSquadPlayers([older, younger], { column: "Age", direction: "asc" })[0].id).toBe(younger.id);
    expect(sortSquadPlayers([younger, older], { column: "Position", direction: "asc" })[0].primaryPosition).toBe("GK");
    expect(sortSquadPlayers([older, younger], { column: "OVR", direction: "desc" })[0].id).toBe(younger.id);
    expect(sortSquadPlayers([younger, older], { column: "Est. POT", direction: "desc" })[0].id).toBe(younger.id);
  });

  it("shows missing role stats as dashes and sorts numeric stat values before dashes", () => {
    const outfield = generatePlayer({ clubId: "club", position: "ST", statRange: lowestLeagueStatRange, kitNumber: 9 });
    const goalkeeper = generatePlayer({ clubId: "club", position: "GK", statRange: lowestLeagueStatRange, kitNumber: 1 });
    outfield.currentStats = { PAS: 4, SHO: 8, TAC: 2, CRO: 3, HEA: 5, ACC: 9, STA: 6, DRI: 7, POS: 5, TEC: 6, PHY: 7, MEN: 5 };
    goalkeeper.currentStats = { REF: 9, HAN: 7, DIS: 6, TEC: 4, PHY: 5, MEN: 6 };

    expect(getSquadStatValue(outfield, "REF")).toBe("-");
    expect(getSquadStatValue(outfield, "HAN")).toBe("-");
    expect(getSquadStatValue(outfield, "DIS")).toBe("-");
    expect(getSquadStatValue(goalkeeper, "PAS")).toBe("-");
    expect(getSquadStatValue(goalkeeper, "SHO")).toBe("-");
    expect(getSquadStatValue(goalkeeper, "TAC")).toBe("-");
    expect(getSquadStatValue(goalkeeper, "CRO")).toBe("-");
    expect(getSquadStatValue(goalkeeper, "HEA")).toBe("-");
    expect(getSquadStatValue(goalkeeper, "ACC")).toBe("-");
    expect(getSquadStatValue(goalkeeper, "STA")).toBe("-");
    expect(getSquadStatValue(goalkeeper, "DRI")).toBe("-");
    expect(getSquadStatValue(goalkeeper, "POS")).toBe("-");
    expect(sortSquadPlayers([goalkeeper, outfield], { column: "SHO", direction: "asc" })[0].id).toBe(outfield.id);
    expect(sortSquadPlayers([outfield, goalkeeper], { column: "SHO", direction: "desc" })[0].id).toBe(outfield.id);
  });
});
