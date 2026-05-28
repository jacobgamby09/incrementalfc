# Game Data Model Documentation: Football Manager Incremental

This document defines the core game objects, their responsibilities, and the data they should store. The goal is to create a clear bridge between the design documents and the first implementation.

The data model should be simple enough for an early prototype, but structured enough to support seasons, match simulation, player development, finances, scouting, youth development, and promotion-based progression.

---

## 1. Design Goals

The data model should support:

- match simulation through the match engine
- season-based league progression
- player current stats and stat-specific potential
- club development caps through facilities
- training XP and match XP
- tactical familiarity and between-match decisions
- staff-driven information quality
- flexible economy and wage commitments
- scouting and youth academy progression
- promotion/relegation and long-term history

The model should avoid unnecessary complexity in the first version. Add depth where it supports meaningful decisions, not just realism for its own sake.

---

## 2. Core Entity Overview

Recommended core entities:

```text
GameState
Club
BoardState
Player
StaffMember
FacilitySet
League
Season
Match
Fixture
Tactic
Lineup
ScoutingReport
YouthProspect
EconomyState
MatchReport
```

The first prototype does not need every system fully implemented, but these entities give the game a stable structure.

---

## 3. GameState

`GameState` is the top-level save object.

It stores the current state of the world and links together the player's club, leagues, seasons, and progression.

### Fields

```ts
type GameState = {
  gameId: string;
  createdAt: string;
  currentDate: GameDate;
  currentSeasonId: string;
  playerClubId: string;
  clubs: Record<string, Club>;
  leagues: Record<string, League>;
  seasons: Record<string, Season>;
  players: Record<string, Player>;
  staff: Record<string, StaffMember>;
  matches: Record<string, Match>;
  settings: GameSettings;
  history: GameHistory;
};
```

### Game Settings

```ts
type GameSettings = {
  gameMode: GameMode;
  difficulty: GameDifficulty;
};

type GameMode =
  | "club_builder"
  | "career_challenge";

type GameDifficulty =
  | "relaxed"
  | "standard"
  | "hard";
```

### Notes

`GameState` should be serializable. Avoid storing derived values that can be recalculated unless caching becomes necessary later.

---

## 4. GameDate

The game can use a simplified football calendar rather than real daily time.

### Fields

```ts
type GameDate = {
  seasonNumber: number;
  week: number;
  phase: "preseason" | "regularSeason" | "postseason";
};
```

### Notes

The first version can advance by match week instead of real days. This keeps the loop readable and avoids unnecessary calendar complexity.

---

## 5. Player

Players are the core of the game. Every player has current stats, stat-specific potential, development progress, contract information, and match availability.

### Fields

```ts
type Player = {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  nationality?: string;

  clubId: string | null;
  primaryPosition: PlayerPosition;
  secondaryPositions: PlayerPosition[];
  preferredRole?: PlayerRole;

  currentStats: OutfieldStats | GoalkeeperStats;
  potentialStats: OutfieldStats | GoalkeeperStats;

  development: PlayerDevelopment;
  contract: PlayerContract;
  status: PlayerStatus;
  personality?: PlayerPersonality;
  history: PlayerHistory;
};
```

### Outfield Stats

```ts
type OutfieldStats = {
  PAS: number;
  SHO: number;
  TAC: number;
  CRO: number;
  HEA: number;
  ACC: number;
  TEC: number;
  PHY: number;
  MEN: number;
};
```

### Goalkeeper Stats

```ts
type GoalkeeperStats = {
  REF: number;
  HAN: number;
  DIS: number;
  TEC: number;
  PHY: number;
  MEN: number;
};
```

### Player Positions

```ts
type PlayerPosition =
  | "GK"
  | "CB"
  | "LB"
  | "RB"
  | "WB"
  | "DM"
  | "CM"
  | "AM"
  | "LW"
  | "RW"
  | "ST";
```

### Player Roles

Roles can start simple and expand later.

```ts
type PlayerRole =
  | "goalkeeper"
  | "defensive_defender"
  | "ball_playing_defender"
  | "fullback"
  | "holding_midfielder"
  | "box_to_box_midfielder"
  | "playmaker"
  | "winger"
  | "inside_forward"
  | "target_forward"
  | "pressing_forward";
```

### Player Development

```ts
type PlayerDevelopment = {
  trainingXp: number;
  matchXp: number;
  developmentRate: number;
  ageCurveStage: "youth" | "developing" | "prime" | "declining";
  cappedStats: string[];
};
```

### Player Contract

```ts
type PlayerContract = {
  wagePerWeek: number;
  weeksRemaining: number;
  marketValue: number;
  releaseClause?: number;
};
```

### Player Status

```ts
type PlayerStatus = {
  fitness: number;
  morale: number;
  form: number;
  injuryWeeksRemaining: number;
  suspendedMatchesRemaining: number;
};
```

### Player Personality

Personality can be hidden or partially visible depending on staff quality.

```ts
type PlayerPersonality = {
  professionalism: number;
  ambition: number;
  pressureHandling: number;
  loyalty: number;
};
```

### Player History

```ts
type PlayerHistory = {
  seasonsPlayed: number;
  totalAppearances: number;
  totalGoals: number;
  totalAssists: number;
  totalCleanSheets?: number;
  previousClubIds: string[];
};
```

### Notes

Potential is fixed per stat. Promotion does not increase potential. Facilities and staff increase the club's ability to develop players toward their potential.

---

## 6. Club

`Club` represents a football club, including squad, staff, facilities, economy, reputation, tactics, and league membership.

### Fields

```ts
type Club = {
  id: string;
  name: string;
  shortName: string;
  leagueId: string;
  reputation: number;
  fans: number;

  squadPlayerIds: string[];
  staffIds: string[];

  economy: EconomyState;
  facilities: FacilitySet;
  tactics: ClubTactics;
  academy: YouthAcademy;
  scouting: ScoutingDepartment;
  board?: BoardState;

  seasonStats: ClubSeasonStats;
  history: ClubHistory;
};
```

### Club Season Stats

```ts
type ClubSeasonStats = {
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  formLastFive: MatchResult[];
};
```

### Club History

```ts
type ClubHistory = {
  foundedSeason?: number;
  promotions: number;
  relegations: number;
  highestLeagueLevel: number;
  trophies: string[];
  seasons: ClubSeasonRecord[];
};
```

### Notes

`board` can be optional until board pressure is implemented. Once Career Challenge Mode exists, the player-controlled club should always have a `BoardState`.

---

## 7. BoardState

`BoardState` stores the board's expectations, confidence, and pressure status.

Board pressure is a planned system. It should create stakes in Career Challenge Mode while remaining advisory in Club Builder Mode.

### Fields

```ts
type BoardState = {
  confidence: number;
  pressureStatus: BoardPressureStatus;
  seasonExpectation: SeasonExpectation;
  warnings: BoardWarning[];
  recentTrend: BoardRecentTrend;
};

type BoardPressureStatus =
  | "safe"
  | "stable"
  | "under_pressure"
  | "at_risk"
  | "fired";
```

### Season Expectation

```ts
type SeasonExpectation = {
  target: BoardExpectationTarget;
  reason: string;
  squadRank: number;
  wageRank: number;
  reputationRank: number;
  expectedFinishMin: number;
  expectedFinishMax: number;
};

type BoardExpectationTarget =
  | "fight_bravely"
  | "avoid_relegation"
  | "mid_table"
  | "top_half"
  | "promotion_challenge"
  | "win_promotion"
  | "win_league";
```

### Board Warnings

```ts
type BoardWarning = {
  id: string;
  createdMatchday: number;
  message: string;
  requiredResponse: string;
  reviewAfterMatches: number;
  resolved: boolean;
};
```

### Recent Trend

```ts
type BoardRecentTrend = {
  lastFiveResults: MatchResult[];
  losingStreak: number;
  unbeatenStreak: number;
  confidenceDeltaLastMatch: number;
  belowExpectationMatches: number;
};
```

### Update Principles

Board confidence should update after each match, but should not be extremely swingy.

Typical update ranges:

```text
Expected win: +0.5 to +1
Normal win: +1 to +3
Unexpected win: +2 to +5
Draw when expected to win: -1 to -3
Loss when expected to win: -2 to -5
Heavy loss: extra -1 to -3
```

Losing streaks should apply pressure only when combined with poor league position or underperformance against expectations.

```text
3 losses in a row: pressure modifier starts
4 losses in a row: board warning possible
5 losses in a row: significant pressure if below expectations
```

In Career Challenge Mode, confidence reaching the firing threshold can end the run. In Club Builder Mode, it should remain feedback only.

---

## 8. EconomyState

The economy should give the player freedom to make good or bad financial decisions.

### Fields

```ts
type EconomyState = {
  cashBalance: number;
  weeklyIncome: number;
  weeklyExpenses: number;
  playerWageTotal: number;
  staffWageTotal: number;
  facilityUpkeepTotal: number;
  scoutingUpkeep: number;
  academyUpkeep: number;
  sponsorIncomePerWeek: number;
  matchdayIncomeEstimate: number;
};
```

### Notes

The player should not be forced into rigid budget buckets. However, the game should clearly show recurring commitments, so wage-heavy strategies feel powerful but risky.

---

## 9. FacilitySet

Facilities control long-term development, income potential, and operational quality.

### Fields

```ts
type FacilitySet = {
  trainingGround: Facility;
  youthAcademy: Facility;
  scoutingNetwork: Facility;
  stadium: Facility;
  medicalCenter: Facility;
  analyticsDepartment: Facility;
};

type Facility = {
  level: number;
  upgradeCost: number;
  upkeepPerWeek: number;
  effects: FacilityEffects;
};

type FacilityEffects = {
  developmentCapBonus?: number;
  trainingXpBonus?: number;
  youthPotentialBonus?: number;
  scoutingAccuracyBonus?: number;
  matchdayIncomeBonus?: number;
  injuryRiskReduction?: number;
  reportDetailBonus?: number;
};
```

### Development Caps

Training facilities should define how far the club can train players.

```ts
type DevelopmentCaps = {
  outfield: Partial<OutfieldStats>;
  goalkeeper: Partial<GoalkeeperStats>;
};
```

Example:

```text
Training Ground Level 1:
Max trainable stat value: 10

Training Ground Level 2:
Max trainable stat value: 15
```

Players with potential above the current cap should be clearly marked as having untapped potential.

---

## 10. StaffMember

Staff improve efficiency, information quality, and development.

### Fields

```ts
type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  clubId: string | null;
  quality: number;
  wagePerWeek: number;
  contractWeeksRemaining: number;
  traits?: StaffTrait[];
};
```

### Staff Roles

```ts
type StaffRole =
  | "assistant_manager"
  | "head_coach"
  | "attacking_coach"
  | "defensive_coach"
  | "goalkeeper_coach"
  | "opposition_analyst"
  | "data_analyst"
  | "scout"
  | "physio"
  | "youth_coach";
```

### Staff Traits

```ts
type StaffTrait =
  | "youth_specialist"
  | "tactical_expert"
  | "talent_spotter"
  | "fitness_expert"
  | "low_wage"
  | "high_reputation";
```

### Notes

Staff should not only provide stat boosts. They should also affect how much information the player gets from opponent reports, scouting reports, match reports, and player development screens.

---

## 11. Tactic and Lineup

Tactics define how the team tries to create chances and protect against opponent chance types.

### Club Tactics

```ts
type ClubTactics = {
  activeTactic: Tactic;
  savedTactics: Tactic[];
  familiarityByTacticId: Record<string, number>;
};
```

### Tactic

```ts
type Tactic = {
  id: string;
  name: string;
  formation: Formation;
  focus: TacticalFocus;
  riskLevel: RiskLevel;
  instructions: TacticalInstruction[];
};
```

### Tactical Options

```ts
type Formation =
  | "4-4-2"
  | "4-3-3"
  | "4-2-3-1"
  | "3-5-2"
  | "5-4-1";

type TacticalFocus =
  | "balanced"
  | "wide_play"
  | "fast_breaks"
  | "sustained_pressure"
  | "defensive_shape";

type RiskLevel =
  | "conservative"
  | "balanced"
  | "aggressive";

type TacticalInstruction =
  | "press_high"
  | "sit_deep"
  | "overlap_wide"
  | "play_direct"
  | "short_passing"
  | "target_man"
  | "counter_attack";
```

### Lineup

```ts
type Lineup = {
  tacticId: string;
  starters: LineupSlot[];
  bench: string[];
  captainPlayerId?: string;
};

type LineupSlot = {
  position: PlayerPosition;
  playerId: string;
  role?: PlayerRole;
};
```

### Notes

The first version can use formation, tactical focus, risk level, and starting lineup only. Instructions and roles can be expanded later.

---

## 12. League

`League` defines a competitive tier.

### Fields

```ts
type League = {
  id: string;
  name: string;
  level: number;
  clubIds: string[];
  teamsCount: number;
  matchesPerSeason: number;
  promotionSpots: number;
  relegationSpots: number;
  playerStatRange: StatRangeProfile;
  rewardProfile: LeagueRewardProfile;
  facilityCapLimit: number;
  reputationRequirement?: number;
};
```

### Stat Range Profile

```ts
type StatRangeProfile = {
  typicalCurrentMin: number;
  typicalCurrentMax: number;
  typicalPotentialMin: number;
  typicalPotentialMax: number;
  rarePotentialMax: number;
};
```

### Notes

League level should raise the world's standards. It should not directly increase existing player potential.

---

## 13. Season

`Season` stores league tables, fixtures, and season-level progress.

### Fields

```ts
type Season = {
  id: string;
  seasonNumber: number;
  leagueId: string;
  clubIds: string[];
  fixtures: Fixture[];
  table: LeagueTableEntry[];
  currentMatchday: number;
  status: "preseason" | "active" | "completed";
  rewardsPaid: boolean;
};
```

### League Table Entry

```ts
type LeagueTableEntry = {
  clubId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};
```

### Notes

The first version should use 10 teams and 18 matches per season.

---

## 14. Fixture and Match

`Fixture` is the scheduled match. `Match` is the simulated result and event data.

### Fixture

```ts
type Fixture = {
  id: string;
  seasonId: string;
  matchday: number;
  homeClubId: string;
  awayClubId: string;
  matchId?: string;
  status: "scheduled" | "played";
};
```

### Match

```ts
type Match = {
  id: string;
  fixtureId: string;
  homeClubId: string;
  awayClubId: string;
  homeLineup: Lineup;
  awayLineup: Lineup;
  result: MatchResult;
  events: MatchEvent[];
  report: MatchReport;
  rewards: MatchRewards;
};
```

### Match Result

```ts
type MatchResult = {
  homeGoals: number;
  awayGoals: number;
  winnerClubId: string | null;
};
```

### Match Event

```ts
type MatchEvent = {
  minute: number;
  type:
    | "event_control"
    | "chance"
    | "shot"
    | "goal"
    | "save"
    | "defensive_stop"
    | "error"
    | "rebound"
    | "red_card"
    | "yellow_card";
  clubId: string;
  playerId?: string;
  secondaryPlayerId?: string;
  description: string;
  xg?: number;
  chanceType?: ChanceType;
  outcome?: MatchEventOutcome;
};
```

### Match Event Outcome

```ts
type MatchEventOutcome =
  | "created"
  | "missed"
  | "saved"
  | "scored"
  | "blocked"
  | "cleared"
  | "error_led_to_chance"
  | "error_led_to_goal";
```

### Chance Type

```ts
type ChanceType =
  | "fast_breakaway"
  | "wide_cross"
  | "sustained_pressure"
  | "rebound_big_chance";
```

### Display Timeline Event

Raw `MatchEvent` data should remain available for ratings, stats, and debugging. The match playback UI should use grouped display events where possible.

```ts
type DisplayTimelineEvent = {
  minute: number;
  type:
    | "highlight"
    | "shot"
    | "save"
    | "goal"
    | "rebound"
    | "red_card"
    | "error"
    | "half_time"
    | "full_time";
  clubId: string;
  playerIds: string[];
  description: string;
  xg?: number;
  chanceType?: ChanceType;
  sourceEventIds: string[];
  emphasis: "normal" | "important" | "major";
};
```

### Notes

`DisplayTimelineEvent` is presentation data. It should not replace raw `MatchEvent` records.

Use raw events for:

- player ratings
- player match stats
- team match stats
- detailed event logs
- debugging

Use display events for:

- live playback
- clean match commentary
- grouped goal/save/chance highlights

---

## 15. MatchReport

`MatchReport` explains what happened and provides problem-solution feedback.

### Fields

```ts
type MatchReport = {
  summary: string;
  homeStats: MatchTeamStats;
  awayStats: MatchTeamStats;
  playerStats: Record<string, PlayerMatchStats>;
  playerRatings: Record<string, PlayerMatchRating>;
  displayTimeline: DisplayTimelineEvent[];
  keyProblems: MatchProblem[];
  recommendations: MatchRecommendation[];
};
```

### Match Team Stats

```ts
type MatchTeamStats = {
  eventsWon: number;
  chancesCreated: number;
  shots: number;
  goals: number;
  xg: number;
  savesForced: number;
  reboundsWon: number;
  redCards: number;
  chanceTypeBreakdown: Record<ChanceType, number>;
};
```

### Player Match Stats

Player match stats are aggregated from match events and used to calculate ratings and later match XP.

```ts
type PlayerMatchStats = {
  playerId: string;
  clubId: string;
  position: PlayerPosition;
  minutes: number;

  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  xg: number;
  keyPasses: number;
  chanceInvolvements: number;

  eventsWon: number;
  duelsWon: number;
  duelsLost: number;
  defensiveActions: number;
  defensiveStops: number;
  errors: number;
  errorsLeadingToGoal: number;

  saves: number;
  xgFaced: number;
  goalsConceded: number;
  reboundsAllowed: number;
};
```

### Player Match Rating

```ts
type PlayerMatchRating = {
  playerId: string;
  clubId: string;
  rating: number;
  summary: string;
  positives: string[];
  negatives: string[];
};
```

Ratings should usually be clamped between `3.0` and `10.0`, with `6.0` as the baseline average performance.

Rating displays should always include club identity, because top performers can include players from both teams.

### Match Problem

```ts
type MatchProblem = {
  code: string;
  severity: "low" | "medium" | "high";
  text: string;
};
```

### Match Recommendation

```ts
type MatchRecommendation = {
  problemCode: string;
  text: string;
  category:
    | "training"
    | "tactics"
    | "transfers"
    | "staff"
    | "facilities"
    | "lineup";
};
```

### Example

```text
Problem:
We created many events but few big chances.

Recommendations:
- Improve SHO / TEC.
- Change tactical focus to create better chance types.
- Upgrade attacking coach.
- Train tactical familiarity.
- Sign better forwards.
```

---

## 16. MatchRewards

Match rewards connect the match engine to progression.

### Fields

```ts
type MatchRewards = {
  money: number;
  fans: number;
  reputation: number;
  playerXp: Record<string, PlayerXpReward>;
  tacticalFamiliarity: Record<string, number>;
};

type PlayerXpReward = {
  trainingXp?: number;
  matchXp: number;
  rating?: number;
  reason: string;
};
```

### Notes

Match rewards should include development and information even when the player loses, but winning should accelerate resource progression.

---

## 17. ScoutingReport

Scouting reports represent incomplete information about external players.

### Fields

```ts
type ScoutingReport = {
  id: string;
  playerId: string;
  scoutId?: string;
  reportingClubId: string;
  accuracy: number;
  visibleCurrentStats: Partial<OutfieldStats | GoalkeeperStats>;
  estimatedPotentialStats: Partial<OutfieldStats | GoalkeeperStats>;
  estimatedWage?: number;
  estimatedMarketValue?: number;
  roleFit?: PlayerRole[];
  notes: string[];
};
```

### Notes

Better scouts and scouting facilities should reveal more accurate information. Low-quality scouting should leave uncertainty.

---

## 18. YouthAcademy and YouthProspect

The academy generates internal prospects over time.

### Youth Academy

```ts
type YouthAcademy = {
  level: number;
  weeklyUpkeep: number;
  prospectGenerationProgress: number;
  prospectGenerationRate: number;
  youthCoachBonus: number;
};
```

### Youth Prospect

Youth prospects can either be represented as normal `Player` objects with `clubId`, or as a separate preview object before being promoted to the squad.

```ts
type YouthProspect = {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  primaryPosition: PlayerPosition;
  currentStatsPreview: Partial<OutfieldStats | GoalkeeperStats>;
  potentialStatsPreview: Partial<OutfieldStats | GoalkeeperStats>;
  accuracy: number;
  signCost: number;
  notes: string[];
};
```

### Notes

Academy investment should improve prospect frequency, average potential, rare high-potential chance, and preview accuracy.

---

## 19. OppositionReport

Opposition reports support between-match agency.

### Fields

```ts
type OppositionReport = {
  fixtureId: string;
  opponentClubId: string;
  reportQuality: number;
  summary: string;
  estimatedStrengths: string[];
  estimatedWeaknesses: string[];
  chanceProfile?: Partial<Record<ChanceType, number>>;
  recommendedConsiderations: string[];
};
```

### Example

```text
Opponent creates many chances from wide crosses.
Their centre-backs are strong aerially but slow.
Consider pace against their back line, but avoid relying only on crosses.
```

### Notes

Opposition reports should provide clues, not perfect answers.

---

## 20. Values That Should Be Derived

Some values should usually be calculated from existing data instead of stored permanently.

Derived values:

- phase strengths
- attack strength
- midfield strength
- defence strength
- goalkeeper strength
- current wage total
- facility upkeep total
- tactical familiarity modifiers
- player market value estimate
- promotion/relegation status before season end

Store derived values only when useful for historical records, match reports, or performance.

---

## 21. First Implementable Version

The first implementation can use a smaller subset of this model:

1. `GameState`
2. `Player`
3. `Club`
4. `EconomyState`
5. `FacilitySet`
6. `StaffMember`
7. `Tactic`
8. `Lineup`
9. `League`
10. `Season`
11. `Fixture`
12. `Match`
13. `MatchReport`
14. `MatchRewards`
15. `OppositionReport`

The first version can postpone:

- detailed personality effects
- injuries
- complex contracts
- transfer negotiations
- full youth intake system
- advanced scouting uncertainty
- detailed tactical instructions
- board pressure and firing logic

The goal of the first version is to prove the main game loop:

```text
Build squad
-> prepare for match
-> simulate match
-> get rewards and feedback
-> develop players/club
-> progress through season
-> promote to a harder league
```
