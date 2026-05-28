import type { Fixture } from "../types/league";

export function generateFixtures(clubIds: string[], seasonId: string): Fixture[] {
  if (clubIds.length % 2 !== 0) {
    throw new Error("Fixture generation requires an even number of clubs.");
  }

  const teams = [...clubIds];
  const rounds = teams.length - 1;
  const firstHalf: Fixture[] = [];

  for (let round = 0; round < rounds; round += 1) {
    for (let i = 0; i < teams.length / 2; i += 1) {
      const left = teams[i];
      const right = teams[teams.length - 1 - i];
      const homeClubId = (round + i) % 2 === 0 ? left : right;
      const awayClubId = homeClubId === left ? right : left;

      firstHalf.push({
        id: `fixture_${seasonId}_${round + 1}_${i + 1}`,
        seasonId,
        matchday: round + 1,
        homeClubId,
        awayClubId,
        status: "scheduled"
      });
    }

    const fixedTeam = teams[0];
    const rotatingTeams = teams.slice(1);
    rotatingTeams.unshift(rotatingTeams.pop() as string);
    teams.splice(0, teams.length, fixedTeam, ...rotatingTeams);
  }

  const secondHalf = firstHalf.map((fixture) => ({
    ...fixture,
    id: `${fixture.id}_reverse`,
    matchday: fixture.matchday + rounds,
    homeClubId: fixture.awayClubId,
    awayClubId: fixture.homeClubId
  }));

  return [...firstHalf, ...secondHalf];
}
