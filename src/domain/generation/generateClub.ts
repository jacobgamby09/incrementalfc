import type { Club, ClubHubTheme, ClubKitStyle, ClubVisualIdentity } from "../types/club";
import type { EconomyState, Facility, FacilitySet } from "../types/economy";
import type { League } from "../types/league";
import type { Player, PlayerPosition } from "../types/player";
import type { ClubTactics, Formation, RiskLevel, TacticalFocus, Tactic } from "../types/tactics";
import { createId, pickOne, randomInt, type RandomSource } from "../../utils/random";
import { generatePlayer } from "./generatePlayer";
import { formations, tacticalFocuses } from "../../data/constants/formations";

const squadTemplate: PlayerPosition[] = [
  "GK",
  "GK",
  "CB",
  "CB",
  "CB",
  "LB",
  "RB",
  "DM",
  "CM",
  "CM",
  "AM",
  "LW",
  "RW",
  "ST",
  "ST",
  "WB",
  "CM",
  "CB"
];

const riskLevels: RiskLevel[] = ["conservative", "balanced", "aggressive"];
const kitStyles: ClubKitStyle[] = ["classic", "sash", "stripes", "hoops", "quarters"];
const hubThemes: ClubHubTheme[] = ["community", "industrial", "coastal", "market_town", "academy"];
const colorPalettes = [
  ["#236b36", "#f8fafc", "#d4a017"],
  ["#1f4e79", "#f2f4f8", "#c23b22"],
  ["#7c2d12", "#fff7ed", "#2563eb"],
  ["#4338ca", "#f8fafc", "#16a34a"],
  ["#111827", "#e5e7eb", "#eab308"],
  ["#0f766e", "#f0fdfa", "#f97316"],
  ["#991b1b", "#fafafa", "#1d4ed8"],
  ["#365314", "#f7fee7", "#a855f7"],
  ["#854d0e", "#fffbeb", "#0284c7"],
  ["#334155", "#f1f5f9", "#dc2626"]
] as const;
const preferredKitNumbers: Record<PlayerPosition, number[]> = {
  GK: [1, 13],
  CB: [4, 5, 15, 18],
  LB: [3],
  RB: [2],
  WB: [12],
  DM: [6],
  CM: [8, 16, 22],
  AM: [10],
  LW: [11],
  RW: [7],
  ST: [9, 14]
};

export type GeneratedClub = {
  club: Club;
  players: Record<string, Player>;
};

type GenerateClubOptions = {
  name: string;
  shortName: string;
  league: League;
  isPlayerClub?: boolean;
  rng?: RandomSource;
};

function createFacility(level: number, assetBaseKey: string, effects: Facility["effects"]): Facility {
  return {
    level,
    upgradeCost: 30_000 * level,
    upkeepPerWeek: 250 * level,
    effects,
    visualState: {
      visualTier: level,
      assetKey: `${assetBaseKey}_tier_${level}`,
      upgradeState: "idle"
    }
  };
}

function createFacilities(): FacilitySet {
  return {
    trainingGround: createFacility(1, "training_ground", {
      developmentCapBonus: 10,
      trainingXpBonus: 0.05
    }),
    youthAcademy: createFacility(1, "youth_academy", { youthPotentialBonus: 0.03 }),
    scoutingNetwork: createFacility(1, "scouting_network", { scoutingAccuracyBonus: 0.05 }),
    stadium: createFacility(1, "stadium", { matchdayIncomeBonus: 0.05 }),
    medicalCenter: createFacility(1, "medical_center", { injuryRiskReduction: 0.02 }),
    analyticsDepartment: createFacility(1, "analytics_department", { reportDetailBonus: 0.05 })
  };
}

function normalizeSeedPart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function hashString(value: string): number {
  return [...value].reduce((hash, character) => hash + character.charCodeAt(0), 0);
}

function createVisualIdentity(
  name: string,
  shortName: string,
  rng: RandomSource
): ClubVisualIdentity {
  const palette = colorPalettes[hashString(`${shortName}:${name}`) % colorPalettes.length];

  return {
    primaryColor: palette[0],
    secondaryColor: palette[1],
    accentColor: palette[2],
    badgeSeed: `${normalizeSeedPart(shortName)}_${normalizeSeedPart(name)}_badge`,
    kitStyle: pickOne(kitStyles, rng),
    hubTheme: pickOne(hubThemes, rng)
  };
}

function kitNumberForPosition(
  position: PlayerPosition,
  usedKitNumbers: Set<number>,
  fallbackNumber: number
): number {
  const preferredNumber = preferredKitNumbers[position].find((number) => !usedKitNumbers.has(number));
  if (preferredNumber) {
    usedKitNumbers.add(preferredNumber);
    return preferredNumber;
  }

  let nextNumber = fallbackNumber;
  while (usedKitNumbers.has(nextNumber) && nextNumber <= 99) {
    nextNumber += 1;
  }

  usedKitNumbers.add(nextNumber);
  return nextNumber;
}

function createTactic(clubId: string, rng: RandomSource, isPlayerClub: boolean): Tactic {
  return {
    id: `tactic_${clubId}_default`,
    name: isPlayerClub ? "Balanced XI" : `${pickOne(formations, rng)} Shape`,
    formation: isPlayerClub ? "4-4-2" : pickOne(formations, rng),
    focus: isPlayerClub ? "balanced" : pickOne(tacticalFocuses, rng),
    riskLevel: isPlayerClub ? "balanced" : pickOne(riskLevels, rng),
    instructions: []
  };
}

function createClubTactics(clubId: string, rng: RandomSource, isPlayerClub: boolean): ClubTactics {
  const activeTactic = createTactic(clubId, rng, isPlayerClub);

  return {
    activeTactic,
    savedTactics: [activeTactic],
    familiarityByTacticId: {
      [activeTactic.id]: 55
    }
  };
}

function calculateFacilityUpkeep(facilities: FacilitySet): number {
  return Object.values(facilities).reduce((sum, facility) => sum + facility.upkeepPerWeek, 0);
}

function createEconomy(
  playerWageTotal: number,
  facilities: FacilitySet,
  reputation: number,
  isPlayerClub: boolean
): EconomyState {
  const staffWageTotal = isPlayerClub ? 2_000 : 1_500;
  const facilityUpkeepTotal = calculateFacilityUpkeep(facilities);
  const sponsorIncomePerWeek = 1_000 + reputation * 120;
  const matchdayIncomeEstimate = 2_000 + reputation * 90 + facilities.stadium.level * 750;
  const weeklyIncome = sponsorIncomePerWeek;
  const weeklyExpenses = playerWageTotal + staffWageTotal + facilityUpkeepTotal;

  return {
    cashBalance: isPlayerClub ? 250_000 : 180_000,
    weeklyIncome,
    weeklyExpenses,
    playerWageTotal,
    staffWageTotal,
    facilityUpkeepTotal,
    scoutingUpkeep: 300,
    academyUpkeep: 300,
    sponsorIncomePerWeek,
    matchdayIncomeEstimate
  };
}

export function generateClub({
  name,
  shortName,
  league,
  isPlayerClub = false,
  rng = Math.random
}: GenerateClubOptions): GeneratedClub {
  const clubId = createId("club", rng);
  const usedKitNumbers = new Set<number>();
  const generatedPlayers = squadTemplate.map((position, index) => {
    const kitNumber = kitNumberForPosition(position, usedKitNumbers, index + 19);

    return generatePlayer({ clubId, position, statRange: league.playerStatRange, kitNumber, rng });
  });
  const players = Object.fromEntries(generatedPlayers.map((player) => [player.id, player]));
  const playerWageTotal = generatedPlayers.reduce(
    (sum, player) => sum + player.contract.wagePerWeek,
    0
  );
  const facilities = createFacilities();
  const reputation = isPlayerClub ? 12 : randomInt(7, 18, rng);

  return {
    club: {
      id: clubId,
      name,
      shortName,
      leagueId: league.id,
      reputation,
      fans: isPlayerClub ? 1_800 : randomInt(1_000, 2_800, rng),
      visualIdentity: createVisualIdentity(name, shortName, rng),
      squadPlayerIds: generatedPlayers.map((player) => player.id),
      staffIds: [],
      economy: createEconomy(playerWageTotal, facilities, reputation, isPlayerClub),
      facilities,
      tactics: createClubTactics(clubId, rng, isPlayerClub),
      academy: {
        level: 1,
        weeklyUpkeep: 300,
        prospectGenerationProgress: 0,
        prospectGenerationRate: 0.08,
        youthCoachBonus: 0
      },
      scouting: {
        level: 1,
        weeklyUpkeep: 300,
        reportAccuracy: 0.45
      },
      seasonStats: {
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        formLastFive: []
      },
      history: {
        foundedSeason: 1,
        promotions: 0,
        relegations: 0,
        highestLeagueLevel: league.level,
        trophies: []
      }
    },
    players
  };
}
