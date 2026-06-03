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

The current prototype serializes this object as versioned JSON in browser `localStorage`. Temporary UI state, such as the open screen or an unsaved match-preparation draft, is intentionally excluded. Loading returns the player to the Dashboard.

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
  transferMarket: TransferMarketState;
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

As of Milestone 4.2.4, a new save contains a persistent five-division pyramid with 50 clubs. Only the player's current division receives a detailed `Season` fixture schedule. The remaining leagues persist in `leagues` and are advanced through lightweight offseason standings so their clubs can promote, relegate, age, and refresh squads without full match simulation.

---

## 4. GameDate

The game can use a simplified football calendar rather than real daily time.

### Fields

```ts
type GameDate = {
  seasonNumber: number;
  week: number;
  phase: "preseason" | "regularSeason" | "postseason" | "transferWindow";
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
  nationality?: string; // Generated players receive a configured football nationality.

  clubId: string | null;
  primaryPosition: PlayerPosition;
  secondaryPositions: PlayerPosition[];
  preferredRole?: PlayerRole;
  squadRole: SquadRole;
  marketReputation: number; // Visible 1-100 market profile value.

  currentStats: OutfieldStats | GoalkeeperStats;
  potentialStats: OutfieldStats | GoalkeeperStats;

  development: PlayerDevelopment;
  contract: PlayerContract;
  status: PlayerStatus;
  personality?: PlayerPersonality;
  history: PlayerHistory;
  transferIntent: PlayerTransferIntent;
};

type PlayerTransferIntent = {
  isListed: boolean;
  listingReason?: "financial_pressure" | "player_unhappy" | "contract_declining" | "too_good_for_division" | "excess_squad" | "none";
  askingPrice: number;
  interestLevel: number;
};
```

### Derived Season Performance

Player sheets derive current and previous season summaries from retained fixtures, match reports, and player ratings:

```ts
type PlayerSeasonSummary = {
  seasonId: string;
  seasonNumber: number;
  apps: number;
  goals: number;
  assists: number;
  avgRating?: number;
};
```

These summaries are recalculated from match history rather than duplicated inside `Player`.

### Contract Expiry Grace Period

When a player-club contract reaches `0` seasons during rollover, the player remains attached to the squad throughout the offseason transfer window. The player can still negotiate a renewal, and renewals do not consume limited signing actions. The next season cannot begin while expired player-club contracts remain unresolved or fewer than 11 contracted players are available.

### Outfield Stats

```ts
type OutfieldStats = {
  PAS: number;
  SHO: number;
  TAC: number;
  CRO: number;
  HEA: number;
  ACC: number;
  STA: number;
  DRI: number;
  POS: number;
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
  unspentDevelopmentPoints: number;
  developmentPointProgress: number;
  cappedStats: string[];
  statProgress: Record<string, number>;
  lastMatchXpGained: number;
  lastTrainingXpGained: number;
  lastDevelopmentPointsGained: number;
  recentStatGrowth: PlayerStatGrowth[];
  recentDevelopmentNotes: string[];
};
```

Development uses a two-step flow:

```text
match/training XP -> Development Point -> manual +1 stat allocation
```

XP no longer increases stats automatically. When a player reaches the configured development threshold, they gain an unspent Development Point. The player can then assign that point to an eligible stat from the player detail sheet. Eligibility is limited by the player's age, stat-specific potential, and the club's current Training Ground development cap.

### Derived Tactical Fit

Player tactical fit is derived from current attributes and position. It is not stored on the player, because it should always reflect the latest stat changes.

```text
player current stats + position -> score each Tactical Focus -> top 1-3 fit recommendations
```

The score represents natural suitability for a focus, not pure player quality. A low-league winger can therefore be a strong `Wide Play` or `Fast Breaks` fit if his best relative strengths are crossing, pace, and dribbling. Player sheets show the top 3 fits, while compact squad and transfer tables can show the best fit.

Lineup tactical fit uses the same derived player-fit model, averaged across the currently selected starters. The Tactics screen can therefore show which focuses the selected XI naturally supports while keeping opponent-specific advice separate.

### Player Contract

```ts
type PlayerContract = {
  wagePerWeek: number;
  seasonsRemaining: number;
  marketValue: number;
  releaseClause?: number;
};
```

Contracts are tracked in seasons because the core loop is season-based. During offseason rollover, one season is deducted. Players whose contracts expire enter the free-agent pool.

### Player Status

```ts
type PlayerStatus = {
  fitness: number; // Persistent readiness from 0 to 100.
  morale: number;
  form: number;
  injuryWeeksRemaining: number;
  suspendedMatchesRemaining: number;
};
```

### Player Context

Squad roles communicate expected playing time:

```ts
type SquadRole =
  | "key_player"
  | "regular_starter"
  | "rotation"
  | "backup"
  | "prospect";
```

Morale remains a 0-100 internal value and is shown as five readable bands: `Thriving`, `Happy`, `Content`, `Frustrated`, and `Disengaged`. Matchday updates consider results, whether playing time matched the squad role, and whether the player's contract is expiring.

`marketReputation` is distinct from ability. It is initialized from ability, potential, and age context, then moves gradually after notable performances.

Fitness (represented in the UI as "Readiness") decreases after starting matches and recovers at the end of each matchday. It directly impacts in-match attributes and accelerates late-match fatigue.


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
  training: ClubTraining;
  ecosystem?: ClubEcosystemState;
  academy: YouthAcademy;
  scouting: ScoutingDepartment;
  board?: BoardState;

  seasonStats: ClubSeasonStats;
  history: ClubHistory;
};
```

### Club Training

```ts
type ClubTraining = {
  focusedAssignments: FocusedTrainingAssignment[];
};

type FocusedTrainingAssignment = {
  slotIndex: number;
  playerId: string;
  focus:
    | "technical"
    | "passing"
    | "finishing"
    | "defending"
    | "physical"
    | "goalkeeping";
};
```

Every squad player receives baseline training XP. Focused assignments add an XP multiplier for a limited number of players based on the Training Ground level. They do not target specific stats; they only speed progress toward the player's next manual Development Point.

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

### Club Ecosystem State

AI clubs should feel alive over many seasons without creating infinite power creep or matching the player's progression one-to-one.

```ts
type ClubEcosystemState = {
  archetype: ClubArchetype;
  ambition: number;
  financialPressure: number;
  squadNeedProfile: Partial<Record<PlayerPosition, number>>;
  transferIntent: TransferIntent;
};

type ClubArchetype =
  | "ambitious"
  | "stable"
  | "youth_development"
  | "veteran"
  | "financially_cautious";

type TransferIntent = {
  likelyToSellPlayerIds: string[];
  likelyToReleasePlayerIds: string[];
  targetPositions: PlayerPosition[];
};
```

This state should guide simplified AI squad refresh and future transfer markets. It should not make AI clubs train every week exactly like the player.

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
  lastWeeklySummary?: WeeklyFinanceSummary;
  financeWarnings: string[];
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
  visualState: FacilityVisualState;
  construction: FacilityConstruction | null;
};

type FacilityEffects = {
  developmentCapBonus?: number;
  trainingXpBonus?: number;
  focusedTrainingSlots?: number;
  youthPotentialBonus?: number;
  intakeProgressPerWeek?: number;
  scoutingAccuracyBonus?: number;
  marketPoolSize?: number;
  matchdayIncomeBonus?: number;
  stadiumCapacity?: number;
  matchdayIncomeMultiplier?: number;
  injuryRiskReduction?: number;
  readinessRecoveryBonus?: number;
  reportDetailBonus?: number;
};

type FacilityConstruction = {
  targetLevel: number;
  remainingWeeks: number;
  totalWeeks: number;
  startedAtSeason: number;
  startedAtMatchday: number;
};
```

All facility costs, upkeep values, construction durations, and effects are read from centralized typed config profiles. The runtime `Facility` state stores progress and visual metadata, while the config remains the source of truth for balance.

The first playable facility screen exposes five active facilities. `analyticsDepartment` remains a deferred placeholder.

Stadium demand is derived per fixture. `fans` represent the club's long-term supporter base, while reputation, opponent appeal, and derived short-term hype determine the percentage that attends a specific home match. Attendance is capped by the current Stadium capacity.

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

Personal potential is fixed independently of age, league level, and facilities. Facilities provide the natural trainable-stat cap. Players aged `30+` keep their historical real POT but have no further normal stat growth.

Signed players show exact `POT`. External market players and unsigned academy prospects show scout-based `Est. POT` intervals. Better scouting facilities narrow uncertainty without changing the underlying player.

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
  contractSeasonsRemaining: number;
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
  | "5-4-1"
  | "5-3-2"
  | "3-4-3"
  | "3-4-2-1";

type TacticalFocus =
  | "balanced"
  | "wide_play"
  | "fast_breaks"
  | "sustained_pressure"
  | "defensive_shape"
  | "control"
  | "tiki_taka";

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
  strengthBand: DivisionStrengthBand;
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

### Division Strength Band

Strength bands define a league's natural football level. They are not hard bans on outliers, but they act as the world's gravity for AI squad refresh, wages, market values, and promotion/relegation adjustment.

```ts
type DivisionStrengthBand = {
  targetOvrMin: number;
  targetOvrMax: number;
  targetPotentialMin: number;
  targetPotentialMax: number;
  rareOutlierPotentialMax: number;
  facilityLevelMin: number;
  facilityLevelMax: number;
  wageMin: number;
  wageMax: number;
  marketValueMin: number;
  marketValueMax: number;
};
```

### Notes

League level should raise the world's standards. It should not directly increase existing player potential.

AI clubs should usually remain within their division's strength band unless promoted, relegated, or temporarily carrying an outlier player. A lower-division club can have a standout player, but that player should become a natural future transfer candidate rather than causing permanent league inflation.

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
  | "rebound_big_chance"
  | "corner"
  | "indirect_free_kick"
  | "direct_free_kick"
  | "penalty";
```

The first four values describe open-play and second-ball routes. The final four values form the dangerous set-piece family. Set pieces are generated from match context rather than placed directly inside the ordinary open-play tactic weighting table.

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
  prospectGenerationProgress: number;
  pendingProspect: Player | null;
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

Facility config owns the academy level, upkeep, progress-per-week, and quality bias. Runtime academy state owns progress and the pending intake decision. Academy investment should improve prospect frequency, average potential, rare high-potential chance, and preview accuracy.

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

## 20. TransferMarket Foundation

Transfers should eventually connect the league ecosystem, player potential, wages, reputation, and scouting.

The recommended first transfer implementation is a curated market rather than full "approach any player" freedom.

```ts
type TransferMarketState = {
  status: "closed" | "open";
  currentWeek: number;
  totalWeeks: number;
  actionsRemaining: number;
  listedPlayerIds: string[];
  freeAgentPlayerIds: string[];
  scoutedOpportunityPlayerIds: string[];
  negotiations: Record<string, TransferNegotiation>;
  incomingOffers: TransferOffer[];
};

type TransferCandidateReason =
  | "free_agent"
  | "listed"
  | "relegated_club_pressure"
  | "financial_pressure"
  | "above_club_level"
  | "aging_veteran"
  | "youth_prospect"
  | "squad_surplus";
```

Future transfer willingness should consider:

- player quality compared with current club and buying club
- league level
- reputation
- wage offer
- expected playing time
- contract length
- club financial pressure
- whether the move is a step up, sideways step, or step down

The implemented 4.2.0 foundation generates candidate pools and opens a staged offseason transfer window.

Milestone 4.2.2 adds curated purchases and contract renewals. Every submitted offer spends one offseason action. The player selects a promised squad role, a 1-3 season contract, and one of four packages: `Lowball`, `Cautious`, `Fair`, or `Statement`. Negotiation willingness is deterministic and config-driven so playtests can tune the system without rewriting domain logic.

Accepted purchases deduct the transfer fee, move the player between clubs, apply the new wage and contract terms, and remove the player from market pools. Accepted renewals use the same offer model without a transfer fee.

Milestone 4.2.3 adds lightweight player-club sales. A listed player uses one of three config-driven strategies: `Quick Sale`, `Market Price`, or `Hold Out`. These strategies trade asking price against AI-offer probability. Affordable AI clubs are prioritized by squad need, squad depth, and archetype. Incoming offers expire after their active transfer week. Accepted sales move the player, update both squads and cash balances, record finance-ledger entries for both clubs, and do not consume a signing action.

---

## 21. Values That Should Be Derived

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

## 22. First Implementable Version

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
