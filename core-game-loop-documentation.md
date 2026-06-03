# Core Game Loop Documentation: Football Manager Incremental

This document describes the core progression loop for the game. The goal is to combine the satisfying progression of an incremental/idle game with the decision-making fantasy of managing a football club.

The match engine is the heart of the game, but the season structure, economy, player development, scouting, staff, and promotion system are what turn individual matches into a long-term club-building experience.

---

## 1. Core Philosophy

The game should feel like this:

```text
Matches generate income, information, and development.
Seasons create structure, stakes, and rewards.
Promotion raises the competitive and economic environment.
Players have fixed potential, but the club's ability to unlock that potential improves over time.
Money is fully player-directed, creating tradeoffs between short-term results and long-term growth.
```

The player is not just increasing numbers. They are building a football club.

---

## 2. Primary Core Loop

The main loop is match-based:

```text
Prepare for match
-> Simulate match
-> Read match report
-> Earn rewards
-> Develop players and club
-> Adjust squad/tactics
-> Progress through season
```

Each match should give the player three things:

- resources
- information
- development

Resources let the player improve the club. Information helps the player understand what to improve. Development makes players and tactics grow over time.

---

## 3. Season Structure

The game should be season-based, not only a chain of disconnected matches.

Recommended starting structure:

```text
Teams per league: 10
Matches per season: 18
Format: each team plays every other team home and away
Promotion: top 2, optionally top 3
Relegation: bottom 2, optionally bottom 3
Lowest league: no relegation
```

This keeps seasons short enough for incremental pacing while still making the league table meaningful.

### Season Flow

```text
Pre-season
-> Budget planning
-> Transfers
-> Staff changes
-> Facility upgrades
-> Training focus
-> Tactical setup

Regular season
-> Play 18 matches
-> Earn per-match rewards
-> Adjust lineup and tactics
-> Develop players
-> React to opponent reports

End of season
-> Final placement rewards
-> Promotion/relegation
-> League ecosystem update
-> Contract and wage review
-> Transfer candidate generation
-> Sponsor/reputation update
-> New league standards if promoted
```

It should be realistic and expected that a player may spend multiple seasons in the same league before being strong enough to promote.

### League Ecosystem Principle

The league should feel alive without becoming a parallel incremental grind for every AI club.

AI clubs should not simply train every week at the same pace as the player. That creates a "Red Queen" effect where the player upgrades but never feels relatively stronger.

Instead, the world should use bounded ecosystem progression:

```text
Division strength bands define the natural level of each league.
AI clubs move within those bands based on ambition, finances, promotion/relegation, and squad churn.
The player can outsmart and outbuild the league through better tactics, development, scouting, and spending.
Lower divisions should not inflate forever just because many seasons pass.
```

This preserves the incremental fantasy:

```text
The player can become too strong for a division,
but the entire division should not automatically rise in lockstep.
```

### Milestone 4.2.4 Persistent Football World

The league ecosystem now exists as one persistent five-division English pyramid:

| Level | Division | Clubs |
| --- | --- | ---: |
| 1 | Local League | 10 |
| 2 | Regional League | 10 |
| 3 | National League | 10 |
| 4 | Championship | 10 |
| 5 | Premier League | 10 |

All 50 fictional clubs are generated at new-game creation and remain in the save. Promotion and relegation exchange existing clubs between adjacent divisions instead of generating replacement opponents. Club identity, squads, facilities, finances, and history follow the club.

The player's division continues to use the full match engine. The four offscreen divisions use lightweight strength-based standings during rollover so the wider world remains alive without simulating every fixture in detail.

Player generation is nationality-aware. Lower divisions remain predominantly English with a smaller Home Nations and Irish presence. Higher divisions gradually become more international, using configurable country weights inspired by the composition of English top-flight football. Nationality is currently an identity and scouting foundation rather than a gameplay modifier.

Recommended timing:

```text
During season:
- AI form updates through match results.
- AI may make very light tactical reactions.
- AI squad strength should not meaningfully grind upward every week.

End of season:
- Aging and decline.
- AI squad refresh.
- Promotion/relegation adjustment.
- Financial pressure updates.
- Transfer candidate generation.
- Division band correction.
```

### Milestone 3.4 Implementation Details

In Milestone 3.4, the season rollover and league ecosystem were fully implemented:

1. **Division Strength Bands**:
   Each of the 5 league tiers has defined boundaries:
   - `targetOvrRange` (e.g., Tier 1: [1, 10], Tier 5: [40, 70])
   - `targetPotentialRange` (e.g., Tier 1: [6, 10], Tier 5: [60, 80])
   - `facilityCap` (Tier 1: 10, Tier 5: 50)
   - `typicalWageRange` and `typicalValueRange`

2. **AI Club Archetypes**:
   Every AI club has an archetype (`ambitious`, `stable`, `youth_development`, `veteran`, `financially_cautious`) that influences squad composition and rollover behavior.

3. **Season Rollover Execution**:
   - **Financials**: Distributes placement rewards (participation, champion, and promotion bonuses).
   - **Promotion/Relegation**: Shifts teams between divisions, adjusting their economics and facility caps.
   - **Aging**: Increments all player ages. Players >= 30 suffer physical decline (`ACC`, `STA`, `PHY` drop by 1-2 points) and small mental/technical decay chances.
   - **Squad Refresh**: AI clubs retire players >= 35, list/remove division outliers, and recruit young prospects (age 17-20) matching the division profile to maintain at least 16 players.
   - **Transfer Pool**: A curated pool of Free Agents and Listed Players is generated and tracked in `gameState.transferMarket`.

### Milestone 3.4.1 Stabilization Details

In Milestone 3.4.1, the league identity and season rollover were stabilized:

1. **Fixed Divisions Hierarchy**:
   The game formalised five divisions:
   * Level 1: **Local League** (no relegation, starting tier)
   * Level 2: **Regional League**
   * Level 3: **National League**
   * Level 4: **Championship**
   * Level 5: **Premier League** (no promotion, top tier)

2. **Premier League and Local League Safeguards**:
   * Premier League champion stays in the division instead of being removed from the active league. Promotion spots are set to 0.
   * Local League clubs cannot relegate. Relegation spots are set to 0.

3. **Ecosystem & Roll Over Corrections**:
   * **State Purity**: Deep clones all mutable data structures (clubs, players, economics, facilities, stats) to ensure `rollOverSeason` is pure.
   * **Exemption from Aging**: Newly generated opponent clubs and mid-rollover replacement players do not age or receive decline notes immediately on their generation rollover.
   * **Preservation of Decline Notes**: Veteran decline notes are preserved instead of being immediately cleared.
   * **Canonical Table Sorting**: Leverages `sortTableCanonically` to ensure table sorting is stable and consistent across UI ranks and payouts.

### Milestone 4.2.0 Transfer Window Foundation

Season rollover now has a staged offseason:

1. The completed season pays rewards, applies league shifts, ages players, processes contract expiry, and prepares the next season.
2. A 3-week transfer window opens with 5 configured future transfer actions.
3. The Dashboard allows the player to inspect the market, advance weeks, and finalize the window.
4. Prepared fixtures remain locked until the transfer window closes.
5. Contracts are displayed and processed in seasons rather than weeks.

Selling and lightweight AI offers are added in Milestone 4.2.3.

### Milestone 4.2.1 Player Context

Players now carry readable context for future transfer decisions:

- `marketReputation`: a visible 1-100 profile value distinct from OVR.
- `squadRole`: Key Player, Regular Starter, Rotation, Backup, or Prospect.
- `morale`: stored internally from 0-100 and displayed as Thriving, Happy, Content, Frustrated, or Disengaged.

After each matchday, morale responds moderately to the result, expected playing time, and expiring contracts. Market reputation changes slowly after notable ratings, goals, and assists. All tuning values live in `playerContextProfiles.ts`.

### Milestone 4.2.2 Buying and Contract Renewals

The offseason market now supports curated purchases and squad contract renewals:

1. The player opens a listed player, free agent, or existing squad player from the Market screen.
2. The player chooses a promised squad role, a 1-3 season contract, and one of four offer packages: Lowball, Cautious, Fair, or Statement.
3. Every submitted offer consumes one offseason action.
4. Willingness is calculated from readable football context: interest or morale, club reputation, league movement, promised role, contract length, and package strength.
5. Accepted signings immediately update the squad, wage, contract, transfer fee, and curated market pool.
6. Lowball offers consume more negotiation patience and can collapse talks.

All tuning values live in `transferProfiles.ts`.

### Milestone 4.2.3 Selling and Lightweight AI Activity

The player can now turn squad assets into offseason income without entering a heavy negotiation simulator:

1. Open `My Listings` and select a contracted squad player.
2. Choose `Quick Sale`, `Market Price`, or `Hold Out`.
3. AI clubs that can afford the player may submit a one-week offer. Buyer priority responds to squad need, squad depth, and club archetype.
4. Accepting an offer moves the player, updates both squads and cash balances, and records both finance-ledger entries.
5. Selling does not consume a limited signing action.
6. A sale cannot leave the player club with fewer than 11 contracted players.

AI tactical reactions remain lightweight and temporary. A poor run can trigger a conservative `defensive_shape` response, but the club returns to its saved tactical identity when the crisis passes. This prevents long saves from drifting toward a league-wide defensive lock.

### Milestone 4.2.2.2 Season Loop Stabilization

Longer playtests added a small but important offseason safety pass:

1. All active squads recover to `100` readiness during the offseason.
2. Fixture schedules remain round-robin home-and-away schedules, but no club receives more than two consecutive fixtures at the same venue.
3. Player-club contracts that reach zero seasons receive an offseason grace period instead of removing the player immediately.
4. The next season cannot begin while expired player-club contracts remain unresolved or fewer than 11 contracted players are available.
5. Contract-renewal offers keep their negotiation patience but no longer consume the limited signing-action pool.
6. Player sheets expose current season performance and compact prior-season history.

---

## 4. Promotion as Prestige

Promotion is the game's prestige system, but it should not feel like a hard reset.

Promotion should mean:

- stronger opponents
- higher income potential
- better sponsorships
- higher reputation
- access to better players
- higher facility upgrade caps
- better scouting and academy opportunities
- higher expectations

Promotion should not mean:

- existing players magically gain higher potential
- all previous progress is reset
- the player is guaranteed to compete immediately

The player should often promote and then discover that their old squad is no longer enough. This creates a natural new challenge without deleting the progress they already earned.

### Promotion/Relegation and AI Clubs

Promotion and relegation should gradually change an AI club's environment, not instantly rewrite its entire squad.

Promoted AI clubs:

- gain access to better income and attraction
- may slowly move toward the new division strength band
- can still struggle if their squad is below the new level

Relegated AI clubs:

- may face financial pressure
- may list or lose players above the lower division's level
- should not instantly become weak, but should gradually adapt downward

This supports realistic multi-season movement without making all divisions converge to the same quality.

### Long-Term Challenge Metric

The game can naturally support a challenge such as:

```text
How few seasons does it take to win the top league?
```

This should emerge from the systems rather than requiring a separate mode.

---

## 4.5 Game Modes and Board Pressure

The game should eventually support two main modes:

### Club Builder Mode

```text
No firing.
Infinite seasons.
Promotion/relegation still exists.
Board expectations are advisory.
Best for relaxed incremental progression and experimentation.
```

### Career Challenge Mode

```text
Firing enabled.
Goal: win the top league as fast as possible.
Season count is tracked.
Board expectations matter.
Poor performance can end the run.
```

Board pressure should create stakes without making the game feel unfair or too swingy.

### Season Expectations

Before each season, the board sets expectations based on the club's current situation.

Inputs:

- squad strength compared to the league
- wage bill compared to the league
- club reputation
- facilities
- staff quality
- previous season result
- league level
- recent promotion or relegation
- financial health

Possible expectations:

```text
Fight bravely
Avoid relegation
Finish mid-table
Finish top half
Challenge for promotion
Win promotion
Win the league
```

Examples:

```text
Your squad is ranked 8th by strength.
Your wage bill is ranked 7th.
Your reputation is low.
Board expectation: Avoid relegation.
```

```text
Your squad is ranked 1st by strength.
Your wage bill is ranked 1st.
Your reputation is high for the league.
Board expectation: Win promotion.
```

High spending should raise expectations. If the player builds the strongest and most expensive squad in the league, the board should expect results.

### Board Confidence

Board confidence should be tracked from `0-100`.

```text
70-100: Safe
50-69: Stable
30-49: Under pressure
15-29: At risk
0-14: Fired in Career Challenge Mode
```

In Club Builder Mode, confidence can still exist as feedback, but it should not end the game.

### Match-to-Match Updates

Board confidence should update after each match, but changes should be smoothed so one bad result does not create an unrealistic crisis.

Typical update ranges:

```text
Expected win: +0.5 to +1
Normal win: +1 to +3
Unexpected win: +2 to +5
Draw when expected to win: -1 to -3
Loss when expected to win: -2 to -5
Heavy loss: extra -1 to -3
```

Losing streaks should matter, especially when the club is below expectations.

```text
3 losses in a row: pressure modifier starts
4 losses in a row: board warning possible
5 losses in a row: significant pressure if below expectations
```

Core principle:

```text
Bad results create pressure.
Bad results below expectations create danger.
Bad results while overspending create serious danger.
```

The board should be more forgiving when the club is newly promoted, has a weak squad, or is meeting the expected pace.

### Board Warnings

Before firing the player in Career Challenge Mode, the game should usually issue warnings.

Example:

```text
Board Warning:
You are below the expected pace for a top-half finish.
Improve results over the next 5 matches.
```

Warnings create tension without feeling random. They also give the player a clear short-term objective.

### Timing

Board pressure should be documented now, but it does not need to be implemented in the first prototype.

Recommended implementation timing:

```text
After player development, economy, facility upgrades, and full season progression are working.
```

---

## 5. Player Potential and Development Caps

Player potential is fixed per player and per stat. A player's potential should not increase simply because the club gets promoted.

Instead, the game separates:

```text
Player Potential = the player's natural maximum for each stat
Club Development Cap = the maximum level the current club setup can train a stat to
```

Example:

```text
Player:
Current SHO: 7
Potential SHO: 16

Club Training Facility Cap:
Max trainable SHO: 10
```

The player can develop from `7 -> 10`, but then stops because the club cannot currently unlock the rest of his potential.

When the club improves its facilities, staff, or league environment, the development cap can rise:

```text
New Training Facility Cap:
Max trainable SHO: 15
```

The same player can now continue developing up to `15`, still limited by his personal potential of `16`.

### UI Feedback

The game should clearly explain when a player has untapped potential above the club's current development cap.

Example:

```text
This player has untapped potential above your current training facilities.
Upgrade Training Facilities to continue development.
```

This creates meaningful choices:

- keep the player and wait for better facilities
- sell the player for profit
- invest heavily in training infrastructure
- use the player now even while development is temporarily capped

### Fixed Potential and Development Windows

Personal potential is a fixed talent ceiling generated independently of the player's current league and the club's facilities. A rare Local League prospect can therefore carry elite upside even when his current club can only train stats to `10-12`.

Facilities remain the natural short-term restriction. Age controls the speed and availability of development rather than rewriting a player's innate ceiling. Players aged `30+` retain their historical real POT but receive no further normal stat growth.

Signed players reveal their exact `POT`. External transfer targets and unsigned academy prospects show a scout-based `Est. POT` interval instead. Better Scouting Department levels narrow the interval and increase report confidence.

---

## 6. Player Stat Ranges by League

Lower leagues should naturally contain weaker players and lower development ceilings.

Example starting point:

```text
Lowest league players:
Current stats: 1-10
Typical potential: 6-10
Rare high-potential outliers: 11-18
```

The rare outlier is important. A low-league club should occasionally discover a player with potential far beyond the current club's ability to train him. This creates excitement and long-term strategy without making every player endlessly scalable.

Potential should be stat-specific, not one global number.

Example:

```text
Player: Defensive Centre-Back

Current:
PAS 6, SHO 3, TAC 8, CRO 2, HEA 7, ACC 4, TEC 5, PHY 8, MEN 6

Potential:
PAS 8, SHO 4, TAC 10, CRO 3, HEA 9, ACC 5, TEC 7, PHY 10, MEN 8
```

This player can become a very good low-league defender, but will never become a technical playmaker or goal-scoring forward.

---

## 7. Match-Based Rewards

Each match should provide rewards based on performance, opponent strength, home/away status, attendance, reputation, and result.

Possible rewards:

- money
- fans
- reputation
- player XP
- tactical familiarity
- staff XP or department progress
- scouting data

### Reward Sources

```text
Base Match Income = league level + stadium size + attendance
Result Bonus = win/draw/loss modifier
Performance Bonus = optional small modifier from match quality
Reputation Gain = opponent strength + result + league importance
Player XP = minutes played + performance + opponent difficulty
Tactical Familiarity = tactic used + match minutes + coaching quality
```

The player should receive some reward even from losses, especially development and information, but winning should meaningfully accelerate progression.

---

## 8. End-of-Season Rewards

End-of-season rewards are a larger injection of resources based on final placement.

Examples:

- prize money
- sponsor bonus
- fan growth
- reputation gain
- promotion bonus
- board confidence

Placement rewards should be large enough to let the player make meaningful changes, but not so large that one good season removes all long-term constraints.

Example:

```text
1st place: major prize money + promotion + large reputation gain
2nd place: strong prize money + promotion + reputation gain
3rd place: medium prize money + possible promotion/playoff
Mid-table: modest prize money + stability
Bottom: low rewards + relegation risk
```

---

## 9. Economy and Budget Freedom

The player should have broad freedom over club finances. Money should not be locked too rigidly into predefined buckets.

The player should be able to choose between:

- transfer spending
- player wages
- staff wages
- training facilities
- youth academy
- scouting network
- stadium/commercial upgrades
- cash reserves

This creates strategic tension:

```text
Buy a proven striker now,
or upgrade training facilities so your high-potential youth players can grow?
```

### Recommended Economy Layers

Use two main financial concepts:

```text
Cash Balance = money currently available for one-time spending
Recurring Commitments = weekly/monthly wage and upkeep costs
```

Recurring commitments include:

- player wages
- staff wages
- facility upkeep
- scouting upkeep
- academy upkeep

This allows aggressive short-term spending, but creates risk if the club's wage commitments become too high.

### Milestone 4.0 Economy Foundation

The first playable club-building economy is config-driven. Balance values live in centralized profiles so playtesting can tune pacing without rewriting screens or domain logic.

The active facilities are:

| Facility | Main purpose |
| --- | --- |
| Training Ground | Development cap, baseline squad training XP bonus, focused training slots |
| Stadium | Capacity, home gate receipts, lost-demand signal |
| Medical Center | Readiness recovery |
| Scouting Department | Market pool size and future information quality |
| Youth Academy | Idle-style intake progress and prospect quality bias |

`Analytics Department` remains a deferred placeholder for future opposition-report depth.

Each upgrade has:

```text
upfront cost
weekly upkeep
construction duration in weeks
current and next-level effects
```

Construction advances once after each matchday. Season rollover advances exactly two offseason weeks. Those offseason weeks also process baseline income, wages, and facility upkeep, but no gate receipts.

Weekly finances are split into:

```text
baseline recurring income
+ home-only gate receipts
+ sporting result bonus
- player wages
- staff wage placeholder
- facility upkeep
```

Away fixtures produce no gate receipts. Stadium demand is intentionally visible:

```text
supporter base
hype from recent results
attendance rate
estimated demand
attendance
capacity
occupancy
lost demand
lost potential ticket revenue
```

Fans represent the club's long-term supporter base. They are not identical to match attendance. Reputation, opponent appeal, and short-term hype influence how much of the supporter base turns up for a specific home fixture. This prevents Stadium from becoming an automatic first-purchase money generator: capacity only matters when the club can create real demand.

The Youth Academy is the first explicit idle generator. When progress reaches `100%`, the club receives a pending prospect. The player must choose `Sign Prospect` or `Release`. Prospects never auto-join the squad.

### Financial Tradeoffs

```text
High transfer spend = immediate squad strength
High wage spend = better players/staff, lower recurring profit
High facility spend = long-term development speed
High youth spend = slow, risky, potentially high future value
High scouting spend = better recruitment information and reach
High cash reserve = safety and flexibility
```

---

## 10. Between-Match Agency

The player should have meaningful decisions between matches. This is where the game feels like football management rather than only incremental progression.

Before each match, the player can adjust:

- formation
- starting lineup
- tactical focus
- risk level
- youth minutes vs strongest XI
- player rest and rotation

Recommended first-version tactical controls:

```text
Formation
Tactical Focus
Starting Lineup
Risk Level
```

Possible Tactical Focus options:

- balanced
- wide play
- fast breaks
- sustained pressure
- defensive shape
- control
- tiki-taka

These choices should connect directly to the match engine's chance types.

Implemented formations:

- `4-4-2`
- `4-3-3`
- `4-2-3-1`
- `3-5-2`
- `5-4-1`
- `5-3-2`
- `3-4-3`
- `3-4-2-1`

---

## 11. Opposition Reports

Before a match, the player should receive an opponent report. The quality of the report depends on staff, scouting, and analytics.

The report should provide useful clues, not a perfect answer.

Bad report:

```text
Opponent seems stronger in midfield.
They may struggle against pace.
Their goalkeeper looks inconsistent.
```

Medium report:

```text
Opponent creates many chances from wide crosses.
Their centre-backs are strong aerially but slow.
Their midfield control is slightly above league average.
```

Strong report:

```text
Opponent chance profile:
- 42% wide crosses
- 31% sustained pressure
- 18% fast breakaways
- 9% rebounds/other

Weakness indicators:
- low defensive ACC
- high aerial strength
- goalkeeper weak under repeated pressure
```

The report should never say:

```text
Use 4-3-3 with these exact players to win.
```

The goal is to help the player make better decisions, not remove decision-making.

---

## 12. Staff as Information and Efficiency

Staff should be more than passive stat bonuses. Staff can improve both club efficiency and information quality.

Examples:

| Staff Role | Main Function |
| --- | --- |
| Assistant Manager | lineup suggestions, form insights, rotation warnings |
| Opposition Analyst | opponent strengths, weaknesses, chance profile |
| Scout | player recruitment info, hidden potential discovery |
| Coach | training efficiency, role development, tactical familiarity |
| Physio | fatigue and injury risk information |
| Data Analyst | deeper match reports, xG/event breakdown |

Low-quality staff gives vague information. High-quality staff gives more precise information, but should still leave room for player judgement.

---

## 13. Player XP Sources

Players should gain XP from both training and matches.

The long-term target should be approximately:

```text
50% of player development from training
50% of player development from match experience
```

This does not need to be exact every week or every player. It is a design target so both systems matter.

Development now uses manual stat allocation:

```text
Match XP + Training XP -> Development Point progress -> unspent Development Point -> player assigns +1 to an eligible stat
```

The match/training systems decide how quickly a player earns points. The player decides where those points are spent. Manual allocation is restricted by stat-specific potential, the current Training Ground development cap, and age. Players aged `30+` do not earn normal Development Points, while age decline can still reduce stats automatically.

### Training XP

Training XP is stable, controllable, and club-driven.

Every owned player receives baseline squad training XP each week. The Training Ground also unlocks a limited number of focused training slots. Assigned players receive a config-driven XP multiplier toward their next Development Point.

Focused slots accelerate selected development projects without replacing baseline squad training. They do not select a stat, force an automatic stat increase, or apply a program identity; they only speed up progress toward the next Development Point, which the player can then allocate manually.

Influenced by:

- training facilities
- coaching staff
- training focus
- player age
- player development rate
- current stat vs potential
- current stat vs club development cap

### Match XP

Match XP rewards players for actually playing.

Influenced by:

- minutes played
- player performance
- opponent difficulty
- match importance
- role involvement
- age/development curve

Recommended minutes scaling:

```text
90 minutes = 100% match XP
60 minutes = 70% match XP
45 minutes = 55% match XP
15 minutes = 20% match XP
Unused bench = 0-10% match XP
Not in squad = 0% match XP
```

This creates an important decision:

```text
Start the best player to win now,
or give minutes to a weaker high-potential player to develop him faster?
```

---

## 14. Youth Academy and Scouting

Youth academy and scouting should support different long-term strategies.

```text
Scouting = finds external players
Academy = generates internal prospects
Training = develops owned players
Facilities = raises development speed and development caps
Reputation = determines who wants to join
```

### Youth Academy

The academy is slow, risky, and potentially very profitable.

Investing in the academy improves:

- frequency of youth prospects
- average youth potential
- chance of rare high-potential prospects
- player development speed at youth level
- future resale value

Youth players should often start weak but may have high stat-specific potential.

### Scouting

Scouting helps the player find players outside the club.

Investing in scouting improves:

- number of discovered players
- accuracy of visible potential
- scouting range
- chance of finding undervalued players
- chance of discovering rare high-potential outliers

Scouting should reveal information gradually. A low scout might only show current stats. A better scout might estimate potential, wage expectations, personality, and role fit.

---

## 14.5 Transfers and Ecosystem Foundation

Transfers should eventually be one of the main bridges between football realism and incremental progression.

Recommended implementation path:

```text
Phase 1:
Generate a curated transfer candidate pool from the league ecosystem.

Phase 2:
Allow the player to buy from that curated market with wage and reputation gates.

Phase 3:
Allow "approach any player" with realistic club/player willingness checks.
```

The first transfer foundation should not be a random shop. Candidate players should emerge from realistic causes:

- free agents
- players listed by financially pressured clubs
- players from relegated clubs
- older players being moved on
- players above their current club's division level
- youth prospects or scouting finds
- squad surplus by position

Buying should eventually require both club and player agreement.

The player should not be able to simply buy the best players because they have enough cash. Willingness should consider:

- league level
- club reputation
- player wage expectation
- expected playing time
- current club ambition
- whether the move is a step up or down
- contract length and market value

The transfer system should reward scouting, financial planning, and timing, not brute-force spending.

---

## 15. Player Types

The squad-building game should support different player archetypes.

### Current Ability Players

Good right now, often older or more expensive, with limited future growth.

Use case:

```text
Win promotion this season.
```

### Development Players

Not always the best today, but have strong potential and need minutes/training.

Use case:

```text
Build a squad that peaks in 2-3 seasons.
```

### Asset Players

High resale value prospects who may not perfectly fit the current tactic.

Use case:

```text
Develop and sell to fund facilities or squad upgrades.
```

These archetypes help the player choose a club strategy:

- win now
- youth factory
- balanced development
- moneyball scouting
- tactical specialists

---

## 16. Match Reports and Problem-Solution Feedback

After each match, the game should explain what happened in football terms connected to the match engine.

Example problem:

```text
We created many events but few big chances.
```

Possible solutions:

- improve `SHO` / `TEC`
- change tactic to create better chance types
- upgrade attacking coach
- train tactical familiarity
- sign better forwards
- develop a high-potential attacker

Other examples:

```text
Problem:
We allowed too many fast breakaways.

Possible solutions:
- improve defensive ACC
- use a more conservative risk level
- upgrade defensive coaching
- sign faster defenders
- switch to a more compact formation
```

```text
Problem:
Our goalkeeper faced too many shots.

Possible solutions:
- improve midfield control
- strengthen defensive structure
- lower risk level
- sign stronger defenders
- improve tactical familiarity
```

The player should understand why they lost and what kinds of decisions could solve it.

---

## 17. First Implementable Version

A focused first version of the core loop should include:

1. 10-team league.
2. 18-match season.
3. Promotion and relegation rules.
4. Match-based income and XP.
5. End-of-season placement rewards.
6. Player current stats and stat-specific potential.
7. Club development caps from facilities.
8. Training XP and match XP.
9. Basic transfers and wages.
10. Basic facility upgrades.
11. Formation, lineup, tactical focus, and risk level.
12. Simple opposition reports.
13. Basic staff roles for information and efficiency.
14. Match report problem-solution feedback.

This version gives the game its main identity: a football club-building incremental where every match tells the player what their club needs next.
