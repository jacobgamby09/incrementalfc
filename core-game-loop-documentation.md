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
-> Contract and wage review
-> Sponsor/reputation update
-> New league standards if promoted
```

It should be realistic and expected that a player may spend multiple seasons in the same league before being strong enough to promote.

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

These choices should connect directly to the match engine's chance types.

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

### Training XP

Training XP is stable, controllable, and club-driven.

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
