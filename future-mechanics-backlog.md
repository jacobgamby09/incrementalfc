# Future Mechanics Backlog: Football Manager Incremental

This document captures future mechanic ideas that should not be lost while near-term prototype work continues.

The goal is to give the game its own identity: a realistic football management simulation with incremental/idle-inspired progression, visible progress bars, meaningful long-term upgrades, and satisfying "one more match" momentum.

This is a living roadmap. Some ideas have now been implemented as foundations, while deeper interactions remain future work. Status labels distinguish shipped foundations from the remaining design work.

---

## 1. Design Principle

The game should not become "Football Manager 0.5".

It should feel like:

```text
Realistic football logic underneath.
Incremental club-building progression on top.
Fast feedback after every match.
Long-term bars, caps, timers, and unlocks that make the club feel alive.
```

The incremental mechanics must stay grounded in football concepts. Avoid fantasy terms or abstract idle-game currencies when a realistic football equivalent exists.

Good:

- training progress
- tactical familiarity
- youth intake progress
- scouting network progress
- matchday attendance
- facility construction
- hype and reputation

Avoid:

- talent essence
- magic stat points
- unexplained global multipliers

---

## Transfer System V1 Roadmap - Milestones 4.2.0 to 4.2.3

### Design Goals

Transfers should create meaningful offseason decisions without turning the game into a negotiation simulator.

- Transfers only happen between seasons.
- Each offseason transfer window lasts 3 weeks.
- The player has a limited number of transfer actions per window.
- Player value is shaped by football logic: ability, age, potential, contract, and market reputation.
- Club hype does not change when buying or selling players in V1.
- Existing contracts are tracked in seasons, not weeks.
- All tuning values live in configuration files so balance can be adjusted after playtests.

### Milestone 4.2.0 - Transfer Window Foundation

- Replace contract weeks with seasons remaining.
- Add config-driven transfer-window and contract profiles.
- Add an offseason transfer-window state machine: closed, open, advance week, finalize.
- Prepare next-season fixtures during rollover but lock matches until the window closes.
- Keep purchases, sales, morale behavior, and negotiation outcomes out of this foundation patch.

### Milestone 4.2.1 - Player Context - Implemented

- Show player market reputation on the player sheet near wage and value.
- Add visible squad role: Key Player, Regular Starter, Rotation, Backup, Prospect.
- Add five readable morale bands:
  - Thriving: double upward green arrow
  - Happy: upward green arrow
  - Content: neutral yellow arrow
  - Frustrated: downward red arrow
  - Disengaged: double downward dark-red arrow
- Add lightweight morale inputs from playing time, squad role expectations, results, and contract state.

Implemented notes:

- Market reputation is initialized from current ability, potential, and prime-age context, then moves slowly after notable performances.
- Morale remains a 0-100 internal value but is presented through readable arrow bands.
- Matchday morale changes are intentionally moderate and config-driven.

### Milestone 4.2.2 - Buying and Renewals - Implemented

- Expand the market into tabs: Listed Players, Free Agents, Scouted Opportunities, My Listings, Negotiations.
- Add contract renewals for existing players.
- Add four negotiation packages: Lowball, Cautious, Fair, Statement.
- Limit negotiation patience so Lowball is a meaningful risk rather than a free first click.
- Let interest depend on player ambition, squad role, wage, club reputation, league level, and expected playing time.

Implemented notes:

- Every submitted offer spends one offseason action.
- Offers are deterministic and config-driven so acceptance can be tuned during playtests.
- Accepted signings move immediately into the squad, deduct any transfer fee, and receive the promised role and season-based contract.
- `My Listings` is visible but remains read-only until Milestone 4.2.3 adds sale strategies and AI offers.

### Milestone 4.2.2.1 - Economy Overview & Finance Ledger - Implemented

- Add a dedicated Economy Screen in the top navigation.
- Implement a Finance Ledger tracking all cash flow events (baseline income, gate receipts, result bonuses, wages, facility construction upgrades, transfer purchases/sales, and season rollover placement rewards).
- Integrate dynamic wage calculation and operating reserve runway weeks.
- Centralize config-driven scenario forecasts (Conservative, Expected, Optimistic) over remaining scheduled fixtures.
- Bump save game schema version to 4.

Implemented notes:

- Forecasts are limited to the remaining scheduled fixtures of the active season.
- Scenario forecast helpers remain available for tuning, but the expanded projection panel is intentionally hidden from the Economy screen after UX review.
- Cash-flow history shows a double-sided progress bar chart.
- Older saves are safely rejected and reset to version 4 format.

### Milestone 4.2.3 - Selling and AI Activity - Implemented

- Add player listing and sale strategy: Quick Sale, Market Price, Hold Out.
- Generate lightweight AI offers across transfer weeks.
- Let AI clubs recruit against squad needs and division strength bands.
- Keep the system readable: the player chooses strategy and responds to offers rather than manually negotiating every detail.

Implemented notes:

- `Quick Sale`, `Market Price`, and `Hold Out` are config-driven price/speed tradeoffs.
- Player listings can attract lightweight AI bids immediately and when transfer weeks advance.
- Incoming offers expire after their active week and can be accepted or rejected from a dedicated Market tab.
- AI buyers are filtered by affordability and prioritized by squad need, squad depth, and club archetype.
- Accepted sales update player ownership, both squads, both cash balances, and both finance ledgers without consuming a signing action.
- Squad safeguards prevent sales that would leave fewer than 11 contracted players.

---

## Persistent Football World - Implemented in Milestone 4.2.4

- The save contains 50 permanent fictional English clubs across five 10-team divisions.
- Promotion and relegation move existing clubs through the pyramid.
- Offscreen divisions use lightweight standings simulation during rollover.
- Every club retains its identity, squad, facilities, economy, and history.
- Player generation uses configurable nationality weights and nationality-specific name pools.
- Lower divisions are predominantly English; higher divisions become increasingly international.

Future extensions:

- Club pages for browsing opponents and rival histories.
- Richer offscreen club transfer activity.
- Scouting-region unlocks that interact with nationality pools.
- Nationality flags and squad-composition summaries.

---

## 2. Training Slots and Focused Development - Implemented in Milestone 4.1

### Concept

The club has limited focused training capacity. Every player receives some general training, but only selected players receive focused development.

```text
General Team Training = small XP for the whole squad
Focused Training Slots = extra XP and better stat targeting for selected players
```

### Why It Works

This creates a strong incremental decision:

```text
Do I spend a slot on a high-potential youth player,
or on a current first-team player who can help win promotion now?
```

### Facility Progression

Training Ground upgrades can unlock:

- more focused training slots
- higher training XP per slot
- better development cap
- better focus efficiency
- role-specific development focuses
- later: lower injury/fatigue risk

Example:

```text
Training Ground Level 1:
2 focused slots
basic XP rate
development cap 10

Training Ground Level 2:
3 focused slots
improved XP rate
development cap 15

Training Ground Level 3:
4 focused slots
role focus training
development cap 20
```

---

## 3. Development Focus Instead of Manual Stat Points

### Concept

Avoid direct RPG-style stat point allocation.

Instead of:

```text
Player levels up -> manually add +1 SHO
```

Use:

```text
Player reaches development breakpoint
-> choose development focus
-> future growth is weighted toward relevant stats
```

### Why

Manual stat points are satisfying, but too gamey for a realistic football manager.

Development focus keeps agency while staying realistic:

```text
The manager/coaches guide training priorities.
The player still develops within personal potential and club facility caps.
```

### Examples

Striker development focus:

- finishing
- movement
- aerial game
- pressing
- technical growth

Centre-back development focus:

- tackling
- aerial dominance
- physical duels
- ball playing
- defensive mentality

Winger development focus:

- pace
- crossing
- inside forward finishing
- technique
- work rate

---

## 4. Progress Bars as the Visual Language

Progress bars should be the main incremental feedback language.

Use bars for:

- player XP / development progress
- focused training slot progress
- tactical familiarity
- scouting progress
- youth intake progress
- facility construction
- matchday attendance
- fan milestone progress
- board confidence
- hype / momentum

The goal is to make every match feel like it moves several systems forward.

```text
Play match
-> players gain XP
-> tactics gain familiarity
-> youth intake progresses
-> scouting progresses
-> hype changes
-> attendance forecast changes
-> facilities continue construction
```

---

## 5. Matchday Attendance Forecast [Foundation Implemented]

### Concept

Before each home match, show an attendance forecast:

```text
Expected Attendance:
8,200 / 10,000

Expected Matchday Revenue:
£41,000 / £50,000 max
```

### Inputs

- fan count
- hype
- club reputation
- opponent reputation
- league level
- recent form
- ticket price if implemented later
- stadium capacity

### Why It Works

This creates a natural incremental signal:

```text
If attendance regularly reaches 95-100% capacity,
stadium size is now limiting income.
```

The player understands why a stadium upgrade matters without needing an artificial warning.

---

## 6. Hype vs Reputation [Foundation Implemented]

Separate short-term hype from long-term reputation.

### Hype

Fast-moving, volatile.

Affected by:

- recent results
- winning streaks
- big wins
- derby/top-of-table matches later
- youth player breakthrough moments

Effects:

- attendance boost
- small morale boost
- media/fan excitement

### Reputation

Slow-moving, durable.

Affected by:

- promotions
- league finishes
- long-term performance
- facility quality
- player sales/development reputation

Effects:

- player attraction
- sponsor quality
- staff attraction
- broader club standing

This gives the game both short-term momentum and long-term progression.

---

## 7. Youth Intake Progress [Foundation Implemented]

### Concept

The youth academy has a visible pipeline bar.

```text
Youth Intake Progress:
72% toward next academy prospect
```

### Inputs

- youth academy level
- youth coaching quality
- club reputation
- scouting/academy investment
- league level

### Output

When the bar fills, the club receives a youth prospect decision. The player can sign or release the prospect; prospects do not join the squad automatically.

Prospects should have:

- low current stats
- stat-specific potential
- uncertain potential visibility
- position/role profile
- possible traits later

### Why It Works

This creates a realistic idle-style generator:

```text
Invest in academy
-> generate better prospects
-> develop or sell them
-> reinvest into the club
```

---

## 8. Scouting Network Progress

### Concept

Scouting should also have a visible progress loop.

```text
Scouting Assignment:
Regional lower leagues
Progress: 63%
Expected finds: 2-4 players
```

### Upgrade Effects

Scouting Network upgrades can improve:

- scouting speed
- number of players found
- potential estimate accuracy
- range of leagues/regions
- chance of undervalued players
- chance of rare high-potential outliers

### Design Rule

Scouting should reveal clues, not perfect truth, especially early.

---

## 9. Facility Upgrade Timers [Implemented]

Facility upgrades should not always complete instantly.

When a facility upgrade is purchased:

```text
Training Ground Level 2
Construction: 2 / 5 weeks
```

This makes upgrades feel physical and creates anticipation.

Implemented facility timer targets:

- Training Ground
- Youth Academy
- Stadium
- Scouting Network
- Medical Center
- Analytics Department remains deferred

Avoid making timers annoying. They should create satisfying progress, not block the game too often.

---

## 10. Club Identity Perks

### Concept

Over time, clubs can develop an identity based on the player's choices.

Possible identities:

- Youth Factory
- Defensive Machine
- High Press Club
- Wide Play Academy
- Moneyball Scouting
- Talent Trader
- Physical Powerhouse

### Example Perks

Youth Factory:

- extra youth-focused training slot
- better youth potential visibility
- faster development for under-21 players

Defensive Machine:

- better defensive tactical familiarity growth
- small boost to defensive coaching efficiency
- improved low-block reports

Moneyball Scouting:

- better value estimates
- higher chance of undervalued players
- improved wage/value comparison

### Design Rule

Club identity perks should reward long-term strategy. They should not become magical buffs detached from realistic club behaviour.

---

## 11. Breakthrough Moments

### Concept

Young or developing players can trigger breakthrough events after strong performances.

Example trigger:

```text
Under-21 player records 3 matches above 7.2 rating within 5 appearances.
```

Possible effect:

- temporary development momentum boost
- morale/form boost
- fan hype increase
- player value increase

### Why It Works

This creates memorable player stories:

```text
The 17-year-old winger earned minutes, performed well, and suddenly became a real first-team option.
```

---

## 12. Training Momentum

### Concept

Players gain development momentum when performance and training align.

Inputs:

- good recent ratings
- focused training slot
- match minutes
- age/development curve
- morale/form

Effects:

- small development speed modifier
- better chance of role-relevant growth

Momentum should decay if the player stops playing or training well.

This encourages the player to manage minutes and training together.

---

## 13. Player Sale Loop

Youth/scouting becomes much more interesting if player sales are part of progression.

Loop:

```text
Find/develop talent
-> sell for profit
-> upgrade facilities
-> attract/find better talent
-> repeat at a higher level
```

This is both realistic and strongly incremental.

Important:

- selling should be optional
- sentimental attachment should matter
- market value should respond to age, OVR, POT, form, league level, and contract length

---

## 14. League Ecosystem and Transfer Foundation [Implemented in Milestone 3.4]

### Concept

The league should remain believable over many seasons without turning every AI club into an invisible incremental grinder.

AI clubs are maintained by a bounded ecosystem:

```text
Division strength bands
+ club archetypes
+ aging/decline
+ promotion/relegation effects
+ squad refresh
+ transfer candidate generation
```

### Why It Works

This prevents two bad outcomes:

- static leagues where opponents feel like scenery
- power-creep leagues where every division becomes equally strong by season 10

The player should be able to outbuild and outsmart a division. AI clubs should react and refresh, but they should not scale one-to-one with the player's upgrades.

### Transfer Foundation

Before full transfer gameplay, the ecosystem should be able to identify:

- players likely to leave
- clubs under financial pressure
- clubs with squad needs
- players above their current club's level
- aging players likely to be released
- prospects worth scouting

This can later power a curated transfer market.

Recommended transfer path:

```text
Curated market
-> buy/listed/free-agent interactions
-> scouting uncertainty
-> approach any player
-> full club/player willingness model
```

---

## 15. Recommended Priority

Suggested order after the current economy and facilities foundation:

1. [Completed] League Ecosystem and Transfer Foundation
2. [Foundation completed] Dashboard Progress Bars
3. [Foundation completed] Matchday Attendance Forecast
4. [Foundation completed] Youth Intake Progress
5. [Completed] Facility Upgrade Timers
6. Training Slots and Focused Development
7. Scouting Assignment Progress
8. Club Identity Perks
9. Breakthrough Moments
10. Training Momentum
11. Player Sale Loop

This order adds incremental identity without derailing the immediate prototype.

---

## 16. Near-Term Backlog Candidates

These should become Linear issues or implementation prompts later:

- [Implemented] Design/Implement League Ecosystem and Strength Bands
- [Implemented] Design/Implement AI Club Archetypes
- [Implemented] Design/Implement Season Rollover Foundation
- [Implemented] Design/Implement Transfer Candidate Generation
- Design/Implement Training Slots
- Design/Implement Development Focus Paths
- [Foundation implemented] Design/Implement Dashboard Progress Bars
- [Foundation implemented] Design/Implement Matchday Attendance Forecast
- [Foundation implemented] Design/Implement Youth Intake Progress
- Design/Implement Scouting Assignment Progress
- [Implemented] Design/Implement Facility Upgrade Timers
- [Foundation implemented] Design/Implement Hype vs Reputation
- Design/Implement Club Identity Perks
- Design/Implement Breakthrough Moments
- Design/Implement Training Momentum
- Design/Implement Player Sale Loop
- Design/Implement Substitutions & In-Match Rotation (combining starting fitness with mid-match stamina loss)
- Design/Implement Injury System (where lower readiness increases the risk of muscle injuries)
- Design/Implement Fixture Congestion (double-match weeks requiring extensive squad depth rotation)
- [Foundation implemented] Design/Implement Medical Center Upgrade Effects (readiness recovery)
