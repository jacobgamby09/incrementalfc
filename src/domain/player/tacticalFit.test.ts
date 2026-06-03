import { describe, expect, it } from "vitest";
import { lowestLeagueStatRange } from "../../data/constants/leagueProfiles";
import { generatePlayer } from "../generation/generatePlayer";
import { getBestPlayerTacticalFit, getLineupTacticalFits, getPlayerTacticalFits } from "./tacticalFit";

describe("player tactical fit", () => {
  it("recommends fast breaks for pacey direct attackers", () => {
    const player = generatePlayer({ clubId: "club", position: "ST", statRange: lowestLeagueStatRange, kitNumber: 9 });
    player.currentStats = { PAS: 3, SHO: 8, TAC: 2, CRO: 3, HEA: 5, ACC: 10, STA: 7, DRI: 9, POS: 8, TEC: 7, PHY: 5, MEN: 6 };

    const bestFit = getBestPlayerTacticalFit(player);

    expect(bestFit.focus).toBe("fast_breaks");
    expect(bestFit.score).toBeGreaterThan(70);
    expect(bestFit.primaryStats).toEqual(expect.arrayContaining(["ACC", "DRI"]));
  });

  it("recommends control or tiki-taka for technical possession midfielders", () => {
    const player = generatePlayer({ clubId: "club", position: "CM", statRange: lowestLeagueStatRange, kitNumber: 8 });
    player.currentStats = { PAS: 10, SHO: 3, TAC: 5, CRO: 4, HEA: 3, ACC: 4, STA: 7, DRI: 8, POS: 10, TEC: 10, PHY: 4, MEN: 9 };

    const fits = getPlayerTacticalFits(player, 3);

    expect(fits.map((fit) => fit.focus)).toEqual(expect.arrayContaining(["control", "tiki_taka"]));
    expect(fits[0].score).toBeGreaterThan(75);
  });

  it("returns ordered top fits with readable labels", () => {
    const player = generatePlayer({ clubId: "club", position: "CB", statRange: lowestLeagueStatRange, kitNumber: 5 });
    player.currentStats = { PAS: 4, SHO: 1, TAC: 10, CRO: 2, HEA: 9, ACC: 4, STA: 7, DRI: 2, POS: 10, TEC: 5, PHY: 9, MEN: 8 };

    const fits = getPlayerTacticalFits(player, 3);

    expect(fits).toHaveLength(3);
    expect(fits[0].score).toBeGreaterThanOrEqual(fits[1].score);
    expect(fits[1].score).toBeGreaterThanOrEqual(fits[2].score);
    expect(fits[0]).toEqual(expect.objectContaining({
      label: expect.any(String),
      score: expect.any(Number),
      primaryStats: expect.any(Array)
    }));
  });

  it("aggregates selected XI tactical fit from lineup starters", () => {
    const players = Array.from({ length: 11 }, (_, index) => {
      const position = index === 0 ? "GK" : index <= 4 ? "CB" : index <= 7 ? "CM" : "ST";
      const player = generatePlayer({ clubId: "club", position, statRange: lowestLeagueStatRange, kitNumber: index + 1 });
      if (position === "GK") {
        player.currentStats = { REF: 7, HAN: 8, DIS: 9, TEC: 8, PHY: 6, MEN: 8 };
      } else if (position === "CB") {
        player.currentStats = { PAS: 8, SHO: 2, TAC: 9, CRO: 3, HEA: 8, ACC: 4, STA: 7, DRI: 4, POS: 10, TEC: 7, PHY: 8, MEN: 9 };
      } else if (position === "CM") {
        player.currentStats = { PAS: 10, SHO: 4, TAC: 6, CRO: 4, HEA: 4, ACC: 5, STA: 8, DRI: 8, POS: 10, TEC: 10, PHY: 5, MEN: 9 };
      } else {
        player.currentStats = { PAS: 7, SHO: 7, TAC: 3, CRO: 4, HEA: 5, ACC: 6, STA: 7, DRI: 7, POS: 8, TEC: 8, PHY: 5, MEN: 8 };
      }
      return player;
    });
    const lineup = {
      tacticId: "tactic",
      starters: players.map((player) => ({ playerId: player.id, position: player.primaryPosition })),
      bench: []
    };
    const fits = getLineupTacticalFits(lineup, Object.fromEntries(players.map((player) => [player.id, player])), 3);

    expect(fits).toHaveLength(3);
    expect(fits.map((fit) => fit.focus)).toEqual(expect.arrayContaining(["control"]));
    expect(fits[0].score).toBeGreaterThanOrEqual(fits[1].score);
  });
});
