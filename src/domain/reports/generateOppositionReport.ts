import type { Club } from "../types/club";
import type { GameState } from "../types/game";
import type { ChanceType } from "../types/match";
import type { OppositionReport } from "../types/reports";
import { autoSelectLineup } from "../lineup/selectLineup";
import { calculatePhaseStrengths } from "../match-engine/calculatePhaseStrengths";

type GenerateOppositionReportOptions = {
  gameState: GameState;
  fixtureId: string;
  playerClubId: string;
};

function strongestChanceProfile(club: Club): Partial<Record<ChanceType, number>> {
  const profile: Record<ChanceType, number> = {
    fast_breakaway: 20,
    wide_cross: 25,
    sustained_pressure: 25,
    rebound_big_chance: 8,
    corner: 8,
    indirect_free_kick: 5,
    direct_free_kick: 3,
    penalty: 1
  };

  if (club.tactics.activeTactic.focus === "fast_breaks") profile.fast_breakaway += 20;
  if (club.tactics.activeTactic.focus === "wide_play") profile.wide_cross += 20;
  if (club.tactics.activeTactic.focus === "sustained_pressure") profile.sustained_pressure += 20;
  if (club.tactics.activeTactic.formation === "4-3-3") profile.wide_cross += 10;
  if (club.tactics.activeTactic.formation === "3-5-2") profile.sustained_pressure += 10;
  if (club.tactics.activeTactic.formation === "5-4-1") profile.fast_breakaway += 10;

  return profile;
}

export function generateOppositionReport({
  gameState,
  fixtureId,
  playerClubId
}: GenerateOppositionReportOptions): OppositionReport {
  const season = gameState.seasons[gameState.currentSeasonId];
  const fixture = season.fixtures.find((candidate) => candidate.id === fixtureId);
  if (!fixture) {
    throw new Error(`Fixture ${fixtureId} was not found.`);
  }

  const opponentClubId = fixture.homeClubId === playerClubId ? fixture.awayClubId : fixture.homeClubId;
  const opponent = gameState.clubs[opponentClubId];
  const playerClub = gameState.clubs[playerClubId];
  const opponentLineup = autoSelectLineup(opponent, gameState, opponent.tactics.activeTactic);
  const playerLineup = autoSelectLineup(playerClub, gameState, playerClub.tactics.activeTactic);
  const opponentPhase = calculatePhaseStrengths(
    opponent,
    gameState,
    opponentLineup,
    opponent.tactics.activeTactic,
    fixture.homeClubId === opponent.id
  );
  const playerPhase = calculatePhaseStrengths(
    playerClub,
    gameState,
    playerLineup,
    playerClub.tactics.activeTactic,
    fixture.homeClubId === playerClub.id
  );
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (opponentPhase.midfield > playerPhase.midfield + 0.6) strengths.push("They look slightly stronger in midfield control.");
  if (opponentPhase.attack > playerPhase.defence + 0.6) strengths.push("Their attacking unit can create dangerous chances.");
  if (opponentPhase.defence > playerPhase.attack + 0.6) strengths.push("Their defensive structure is above our current attacking level.");
  if (opponentPhase.goalkeeper > playerPhase.attack + 0.6) strengths.push("Their goalkeeper looks reliable for this level.");

  if (opponentPhase.midfield < playerPhase.midfield - 0.6) weaknesses.push("Their midfield can be out-controlled.");
  if (opponentPhase.defence < playerPhase.attack - 0.6) weaknesses.push("Their back line may struggle under pressure.");
  if (opponentPhase.goalkeeper < playerPhase.attack - 0.6) weaknesses.push("Their goalkeeper may be vulnerable if tested repeatedly.");
  if (weaknesses.length === 0) weaknesses.push("No obvious weakness from this basic report.");
  if (strengths.length === 0) strengths.push("No single standout strength, but they are organized enough to punish mistakes.");

  return {
    fixtureId,
    opponentClubId,
    reportQuality: Math.round((playerClub.scouting.reportAccuracy + playerClub.facilities.analyticsDepartment.effects.reportDetailBonus! + 0.2) * 100),
    summary: `${opponent.name} usually set up in a ${opponent.tactics.activeTactic.formation} with a ${opponent.tactics.activeTactic.focus.replace("_", " ")} focus.`,
    estimatedStrengths: strengths,
    estimatedWeaknesses: weaknesses,
    chanceProfile: strongestChanceProfile(opponent),
    recommendedConsiderations: [
      "Treat this as scouting guidance, not a guaranteed solution.",
      "Match their strongest phase or target the clearest weakness.",
      "Risk level will affect how many transitions both sides see."
    ]
  };
}
