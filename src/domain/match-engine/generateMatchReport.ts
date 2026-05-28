import type {
  ChanceType,
  MatchProblem,
  MatchRecommendation,
  MatchReport,
  MatchTeamStats
} from "../types/match";

type GenerateMatchReportOptions = {
  reportingClubName: string;
  opponentClubName: string;
  reportingStats: MatchTeamStats;
  opponentStats: MatchTeamStats;
  reportingGoals: number;
  opponentGoals: number;
};

function addRecommendation(
  recommendations: MatchRecommendation[],
  problemCode: string,
  text: string,
  category: MatchRecommendation["category"]
): void {
  recommendations.push({ problemCode, text, category });
}

function chanceCount(stats: MatchTeamStats, chanceType: ChanceType): number {
  return stats.chanceTypeBreakdown[chanceType] ?? 0;
}

function labelChanceType(chanceType: ChanceType): string {
  if (chanceType === "fast_breakaway") return "fast breakaways";
  if (chanceType === "wide_cross") return "wide crosses";
  if (chanceType === "rebound_big_chance") return "rebounds and big chances";
  return "sustained pressure";
}

function dominantChanceType(stats: MatchTeamStats): [ChanceType, number] {
  return (Object.entries(stats.chanceTypeBreakdown) as Array<[ChanceType, number]>).sort(
    (a, b) => b[1] - a[1]
  )[0];
}

export function generateMatchReport({
  reportingClubName,
  opponentClubName,
  reportingStats,
  opponentStats,
  reportingGoals,
  opponentGoals
}: GenerateMatchReportOptions): Pick<MatchReport, "summary" | "keyProblems" | "recommendations"> {
  const keyProblems: MatchProblem[] = [];
  const recommendations: MatchRecommendation[] = [];
  const xgDifference = reportingStats.xg - opponentStats.xg;
  const [ownDominantType, ownDominantCount] = dominantChanceType(reportingStats);
  const [opponentDominantType, opponentDominantCount] = dominantChanceType(opponentStats);

  if (Math.abs(xgDifference) >= 0.75) {
    const deservedText =
      xgDifference > 0
        ? reportingGoals >= opponentGoals
          ? "The xG advantage suggests the result was deserved."
          : "The xG advantage suggests we were unlucky not to get more from the match."
        : reportingGoals <= opponentGoals
          ? "The xG numbers suggest the opponent created the better chances."
          : "The scoreline was kind to us compared with the chance quality.";
    keyProblems.push({
      code: xgDifference > 0 ? "clear_xg_advantage" : "clear_xg_deficit",
      severity: xgDifference > 0 ? "low" : "medium",
      text: deservedText
    });
  }

  if (reportingStats.eventsWon >= opponentStats.eventsWon && reportingStats.chancesCreated <= 2) {
    keyProblems.push({
      code: "events_without_big_chances",
      severity: "medium",
      text: "We created many events but few big chances."
    });
    addRecommendation(recommendations, "events_without_big_chances", "Improve SHO and TEC in attacking roles.", "training");
    addRecommendation(
      recommendations,
      "events_without_big_chances",
      "Try a focus that creates more decisive chance types.",
      "tactics"
    );
  }

  if (reportingStats.eventsWon >= opponentStats.eventsWon + 4 && reportingStats.chancesCreated < reportingStats.eventsWon * 0.18) {
    keyProblems.push({
      code: "low_chance_quality",
      severity: "medium",
      text: "We had enough possession phases, but too few became meaningful chances."
    });
    addRecommendation(recommendations, "low_chance_quality", "Use a focus that better matches your strongest attackers.", "tactics");
  }

  if (chanceCount(opponentStats, "fast_breakaway") >= 3) {
    keyProblems.push({
      code: "allowed_fast_breaks",
      severity: "high",
      text: "We allowed too many fast breakaways."
    });
    addRecommendation(recommendations, "allowed_fast_breaks", "Use a more conservative risk level.", "tactics");
    addRecommendation(recommendations, "allowed_fast_breaks", "Add faster defenders or midfield cover.", "transfers");
  }

  if (opponentDominantCount >= 3 && opponentDominantCount >= opponentStats.chancesCreated * 0.5) {
    keyProblems.push({
      code: "opponent_main_threat",
      severity: opponentStats.goals > reportingStats.goals ? "high" : "medium",
      text: `Most of the opponent threat came from ${labelChanceType(opponentDominantType)}.`
    });
    addRecommendation(recommendations, "opponent_main_threat", "Adjust shape or personnel to reduce that chance route.", "tactics");
  }

  if (ownDominantCount >= 3 && reportingStats.goals > 0) {
    keyProblems.push({
      code: "effective_chance_route",
      severity: "low",
      text: `Our most effective route was ${labelChanceType(ownDominantType)}.`
    });
    addRecommendation(recommendations, "effective_chance_route", "Keep using this route when the opponent profile allows it.", "tactics");
  }

  if (opponentStats.shots >= 8) {
    keyProblems.push({
      code: "goalkeeper_under_pressure",
      severity: "medium",
      text: "Our goalkeeper faced too many shots."
    });
    addRecommendation(recommendations, "goalkeeper_under_pressure", "Improve midfield control and defensive structure.", "lineup");
    addRecommendation(recommendations, "goalkeeper_under_pressure", "Lower the risk level against stronger opponents.", "tactics");
  }

  if (chanceCount(reportingStats, "wide_cross") >= 3 && reportingStats.goals === 0) {
    keyProblems.push({
      code: "ineffective_wide_attacks",
      severity: "low",
      text: "Our wide attacks were ineffective."
    });
    addRecommendation(recommendations, "ineffective_wide_attacks", "Improve crossing and heading profiles.", "training");
    addRecommendation(recommendations, "ineffective_wide_attacks", "Consider sustained pressure if crosses are not landing.", "tactics");
  }

  if (keyProblems.length === 0) {
    const balancedText =
      Math.abs(xgDifference) < 0.35 && Math.abs(reportingStats.shots - opponentStats.shots) <= 2
        ? "The match was genuinely close, with both teams creating similar shot volume and chance quality."
        : "The match hinged on a small number of decisive chances rather than one clear tactical failure.";
    keyProblems.push({
      code: "balanced_performance",
      severity: "low",
      text: balancedText
    });
    addRecommendation(recommendations, "balanced_performance", "Keep improving squad quality and tactical familiarity.", "training");
  }

  const resultText =
    reportingGoals > opponentGoals ? "beat" : reportingGoals < opponentGoals ? "lost to" : "drew with";

  return {
    summary: `${reportingClubName} ${resultText} ${opponentClubName} ${reportingGoals}-${opponentGoals}.`,
    keyProblems,
    recommendations
  };
}
