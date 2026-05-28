# First Prototype Scope: Football Manager Incremental

This document defines the scope for the first playable prototype. The goal is to build a small but complete version of the game loop, not a full football manager simulation.

The prototype should prove that the core idea works:

```text
Build a squad
-> prepare for matches
-> simulate matches
-> read feedback
-> earn rewards
-> improve players and club
-> complete a season
-> promote or stay in the league
```

---

## 1. Prototype Goal

Version `0.1` should let the player complete one full season in a simple 10-team league.

The player should be able to:

- manage a basic squad
- choose lineup and tactics before matches
- simulate each match
- receive a post-match report
- earn money, reputation, fans, player XP, and tactical familiarity
- train and develop players
- spend money on basic club improvements
- progress through an 18-match season
- receive end-of-season rewards
- promote, stay in the same league, or face relegation logic

The prototype is successful if the player can understand:

```text
Why did I win or lose?
What should I improve next?
Can I build toward promotion over multiple seasons?
```

---

## 2. Target Experience

The first prototype should feel like a compact football management loop with incremental progression.

The player should spend most of their time in this rhythm:

```text
Review next opponent
-> adjust lineup/tactic
-> simulate match
-> read result and diagnosis
-> collect rewards
-> improve squad/club
-> advance to next match
```

The UI can be simple, but the loop must be clear and satisfying.

---

## 3. Must-Have Systems

### League and Season

Required:

- 10-team league
- 18-match season
- each team plays every other team home and away
- 3 points for win, 1 for draw, 0 for loss
- league table with played, wins, draws, losses, goals for, goals against, goal difference, points
- end-of-season placement rewards
- promotion spots for top teams
- relegation spots for bottom teams, except in the lowest league

Can be simplified:

- only one active player-controlled league needs to be simulated in detail
- other leagues can be abstracted or ignored in `0.1`
- promotion can move the player to a stronger generated league profile

### Squad and Players

Required:

- generated squad for the player club
- generated squads for opponent clubs
- outfield and goalkeeper stat models
- current stats
- stat-specific potential
- age
- position
- wage
- market value estimate
- fitness, form, and morale can exist as simple values

Initial low-league range:

```text
Current stats: 1-10
Typical potential: 6-10
Rare high-potential outliers: 11-18
```

Required player development rule:

```text
Player potential is fixed.
Club facilities determine how much of that potential can currently be trained.
```

### Tactics and Lineup

Required:

- choose formation
- choose tactical focus
- choose risk level
- select starting lineup
- basic bench selection

Recommended first formations:

- `4-4-2`
- `4-3-3`
- `4-2-3-1`
- `3-5-2`
- `5-4-1`

Recommended tactical focus options:

- `balanced`
- `wide_play`
- `fast_breaks`
- `sustained_pressure`
- `defensive_shape`

Recommended risk levels:

- `conservative`
- `balanced`
- `aggressive`

Can be simplified:

- no advanced roles in `0.1`
- no detailed tactical instructions in `0.1`
- no substitutions during the match in `0.1`

### Match Engine

Required:

- calculate phase strengths
- roll match event volume
- distribute events through midfield strength
- roll chance creation
- select chance type
- calculate base xG
- adjust xG with attacker skill, goalkeeper skill, mentality, and situation
- roll goals
- generate timeline events
- generate match stats

Required chance types:

- fast breakaway
- wide cross
- sustained pressure
- rebound/big chance

Can be simplified:

- red cards can be included as simple rare events
- yellow cards can be cosmetic or omitted
- goalkeeper pressure can be implemented in a basic form
- rebound logic can be simple

### Match Reports

Required:

- final score
- goals
- shots
- xG
- events won
- chances created
- chance type breakdown
- key problems
- recommendations
- player ratings, once player contribution tracking is implemented

Example report feedback:

```text
We created many events but few big chances.
```

Possible recommendations:

- improve `SHO` / `TEC`
- adjust tactical focus
- improve attacking coach
- sign better forwards
- train tactical familiarity

Reports are important. They connect the math to player decisions.

### Player Match Ratings

Player match ratings should be implemented before full player development.

Reason:

```text
Match XP should eventually depend on both minutes played and performance.
Player ratings provide the performance component.
```

Required:

- track player involvement in match events
- aggregate player match stats
- calculate player ratings on a `3.0 - 10.0` scale
- show ratings in the match report
- store ratings so they can be used by match XP later

Minimum useful player stats:

- goals
- assists/key passes
- shots
- xG
- chance involvement
- defensive actions
- saves
- xG faced
- goals conceded
- errors

Ratings should start from a `6.0` baseline and adjust based on role-specific contributions.

Examples:

```text
Striker scores from low xG: strong rating boost.
Striker misses several high-xG chances: rating penalty.
Goalkeeper saves high xG shots: strong rating boost.
Defender makes errors leading to goals: rating penalty.
```

### Rewards

Required per-match rewards:

- money
- fans
- reputation
- player match XP
- tactical familiarity

Required end-of-season rewards:

- prize money based on placement
- reputation gain based on placement
- promotion bonus if promoted

Can be simplified:

- sponsor logic can be a simple income value
- fan growth can be a simple number
- board confidence can be omitted in `0.1`

### Player Development

Required:

- training XP
- match XP
- stat growth limited by personal potential
- stat growth limited by club development cap
- match XP based on minutes played
- training XP based on facility level and training focus

Target design:

```text
Long-term development should come roughly 50% from training and 50% from match experience.
```

Required minutes scaling:

```text
90 minutes = 100% match XP
60 minutes = 70% match XP
45 minutes = 55% match XP
15 minutes = 20% match XP
Unused bench = 0-10% match XP
Not in squad = 0% match XP
```

Can be simplified:

- first version can treat all starters as 90-minute players
- bench XP can be omitted until substitutions exist
- training can happen automatically after each match week

### Economy

Required:

- cash balance
- match income
- prize money
- player wages
- staff wages
- facility upkeep
- weekly profit/loss display
- ability to spend money on upgrades

Required spending categories:

- player transfers or simple player signings
- training facility upgrade
- scouting upgrade
- youth academy upgrade
- staff upgrade or staff quality level

Can be simplified:

- no complex negotiations
- no loans
- no release clauses
- no sponsorship selection
- no debt system

### Facilities

Required:

- training ground
- scouting network
- youth academy
- stadium

Prototype effects:

```text
Training Ground = raises development cap and training XP
Scouting Network = improves available signing options and information
Youth Academy = improves prospect generation quality
Stadium = improves matchday income
```

Can be simplified:

- each facility can start as a level number with upgrade cost and simple effects
- detailed facility upkeep can be added but does not need deep balancing yet

### Staff

Required:

- at least a simplified staff quality model

Recommended first staff categories:

- coaching
- scouting
- analytics
- medical

Prototype effects:

```text
Coaching = training XP and tactical familiarity
Scouting = player discovery and report accuracy
Analytics = opponent reports and match report detail
Medical = fitness recovery and injury prevention
```

Can be simplified:

- no individual staff hiring market in `0.1`
- staff can be upgraded as department levels

### Opposition Reports

Required:

- pre-match opponent summary
- estimated strengths
- estimated weaknesses
- chance profile clues
- no perfect solution

Report quality should depend on analytics/scouting/staff quality.

Example:

```text
Opponent creates many chances from wide crosses.
Their centre-backs are strong aerially but slow.
Consider pace against their back line, but avoid relying only on crosses.
```

---

## 4. Nice-to-Have Systems

These are useful but not required for the first playable prototype:

- substitutions
- injuries
- suspensions
- yellow card accumulation
- player personalities
- player morale effects
- detailed contract negotiations
- transfer windows
- youth intake events
- individual training plans
- advanced tactical roles
- advanced staff hiring
- sponsor choices
- multiple playable countries
- cups
- playoffs
- board expectations and board pressure
- achievements
- save slots

---

## 5. Explicitly Out of Scope for Version 0.1

Do not build these in the first prototype:

- real-time 2D match visualization
- full Football Manager-style tactical editor
- complex transfer negotiation system
- agent interactions
- press conferences
- detailed player personality simulation
- detailed injury model
- complex youth academy pipeline
- international competitions
- multiplayer
- real player or club data
- licensed league structures
- firing/game over logic

The prototype should stay focused on proving the core loop.

---

## 5.5 Planned Later: Game Modes and Board Pressure

Board pressure is a planned stakes system, but it should not be implemented in version `0.1`.

The game should eventually support two modes:

```text
Club Builder Mode:
No firing. Infinite club-building. Board expectations are advisory.

Career Challenge Mode:
Firing enabled. Goal is to win the top league as fast as possible.
```

Before each season, the board should set expectations based on the club's setup:

- squad strength compared to the league
- wage bill compared to the league
- reputation
- facilities
- staff quality
- previous season result
- recent promotion/relegation
- financial health

Board confidence should update after each match, but should be smoothed so it is not too swingy.

Core principle:

```text
Bad results create pressure.
Bad results below expectations create danger.
Bad results while overspending create serious danger.
```

Losing streaks should matter:

```text
3 losses in a row: pressure modifier starts
4 losses in a row: board warning possible
5 losses in a row: significant pressure if below expectations
```

This system should be implemented after:

```text
player development
economy
facility upgrades
full season progression
```

Reason:

Board expectations only become meaningful when the game can evaluate squad strength, wage spending, league position, and season progress.

---

## 6. Required Screens

The UI can be simple, but the following screens are needed.

### Dashboard

Purpose:

- show current club status
- show next fixture
- show league position
- show cash and weekly finances
- show main call to action

Required elements:

- next match card
- league table snippet
- cash balance
- weekly profit/loss
- club reputation
- current season and matchday

### Squad Screen

Purpose:

- inspect players
- compare current stats and potential
- see development caps
- select lineup candidates
- compare performance and form

Required elements:

- player list
- current stats
- potential stats or visible potential estimate
- position
- age
- wage
- fitness/form
- capped potential indicator
- OVR and estimated POT
- recent form based on last 5 match ratings
- season average rating
- configurable table presets

Recommended table presets:

- Overview
- Attributes
- Performance
- Contract
- Development Placeholder

Player names should open the shared player detail sheet wherever they appear.

### Tactics / Lineup Screen

Purpose:

- choose how to approach the next match

Required elements:

- formation selector
- tactical focus selector
- risk level selector
- starting lineup
- bench
- basic team strength preview

### Opponent Report Screen

Purpose:

- support between-match decisions

Required elements:

- opponent summary
- estimated strengths
- estimated weaknesses
- chance profile clues
- report quality indicator

This can also be part of the pre-match screen.

### Match Simulation Screen

Purpose:

- present match events and result

Required elements:

- scoreline
- minute/timeline
- live event feed
- goals
- red cards if implemented
- final result state

The first version can be text-heavy. It does not need animation beyond a simple event timeline.

The visible timeline should use grouped display highlights rather than exposing every raw match-engine event. Raw events should remain available for ratings, stats, and a collapsed detailed event log.

Good display event:

```text
26' GOAL - Finn Barker scores from sustained pressure. xG 0.14
```

Avoid exposing noisy internal sequences by default:

```text
26' Player opens up pressure.
26' Player shoots.
26' Player scores.
```

### Match Report Screen

Purpose:

- explain what happened and what the player can improve

Required elements:

- final score
- xG
- shots
- events won
- chance type breakdown
- key problems
- recommendations
- player XP gained
- money/reputation/fan rewards
- player ratings with club identity
- top performers and underperformers

Player names in the report should open the shared player detail sheet.

### Club Upgrades Screen

Purpose:

- let the player spend money on long-term improvements

Required elements:

- training ground level and upgrade
- scouting network level and upgrade
- youth academy level and upgrade
- stadium level and upgrade
- staff/department levels if implemented here

### Finance Screen

Purpose:

- show financial freedom and consequences

Required elements:

- cash balance
- weekly income
- weekly expenses
- player wages
- staff wages
- facility upkeep
- projected weeks of cash remaining if losing money

Can be merged with Dashboard for early prototype.

### League Screen

Purpose:

- show season progress and stakes

Required elements:

- full league table
- fixtures/results
- promotion/relegation spots
- remaining matchdays
- end-of-season reward preview

---

## 7. Prototype Data Generation

The first version should generate fictional clubs and players.

### Clubs

Generate:

- 10 clubs in the starting league
- simple names
- reputation values
- basic facilities
- generated squads

### Players

Generate:

- enough players for each club to field a full lineup
- at least 16 players per squad
- position coverage
- current stats based on league range
- stat-specific potential
- wages based on current ability and potential
- market value estimates

### Opponent Squads

Opponent clubs do not need full management logic in `0.1`, but they need:

- squad strength
- generated lineup
- tactic profile
- match engine compatibility

---

## 8. Save/Load Requirement

The first prototype should support saving and loading the game state.

Required:

- save current season progress
- save player club state
- save squad development
- save finances
- save facilities/staff
- save league table and fixtures

Can be simple:

- local JSON storage
- one save slot
- no cloud sync

---

## 9. Prototype Balance Targets

These are early targets, not final balance.

### Match Scores

Most matches should end with believable football scores:

```text
Common: 0-0, 1-0, 1-1, 2-1, 2-0
Occasional: 3-2, 3-0, 4-1
Rare: 5+ goals for one team
```

### Season Progression

The player should not automatically promote in season 1.

Target:

```text
Season 1: survival/mid-table is normal
Season 2-3: promotion challenge becomes realistic with good decisions
Season 4+: promotion should be likely if the player has managed well
```

Strong play, good scouting luck, or risky financial decisions can accelerate this.

### Economy

The player should feel financially constrained but not stuck.

Target:

```text
Early game: every major spend matters
Mid league: player can specialize strategy
Promotion: bigger income, bigger costs, stronger pressure
```

### Development

Youth and prospects should not become instant stars.

Target:

```text
Good prospect: useful after 1-2 seasons
Rare prospect: major asset after 2-4 seasons
Low-potential player: caps out quickly
```

---

## 10. Implementation Order

Recommended build order:

1. Static data types and generated game state.
2. Player and club generation.
3. League fixture generation.
4. Basic tactic and lineup model.
5. Match engine implementation.
6. Match report generation.
7. Player contribution tracking and match ratings.
8. Match rewards and player XP.
9. Training and development caps.
10. Economy and facility upgrades.
11. Season progression and end-of-season rewards.
12. Promotion/relegation.
13. Basic UI screens.
14. Save/load.
15. Balance pass.

The first internal milestone should be:

```text
Generate a league, simulate one match, produce a readable match report.
```

The second milestone should be:

```text
Play through a full 18-match season and resolve promotion/rewards.
```

---

## 11. Success Criteria

The prototype is successful if:

- a full season can be completed without manual data editing
- the match engine produces believable scores
- the player can make lineup and tactic choices
- match reports explain outcomes clearly
- players gain XP and develop within potential/cap limits
- money can be spent on meaningful upgrades
- promotion feels like a natural prestige layer
- the player has a reason to continue into the next season

If these are true, the prototype has proven the game's foundation.
