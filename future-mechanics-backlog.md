# Future Mechanics Backlog: Football Manager Incremental

This document captures future mechanic ideas that should not be lost while near-term prototype work continues.

The goal is to give the game its own identity: a realistic football management simulation with incremental/idle-inspired progression, visible progress bars, meaningful long-term upgrades, and satisfying "one more match" momentum.

These ideas are not immediate implementation requirements. They should be considered after the current core loop, player development visibility, economy, facilities, and season progression are stable.

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

## 2. Training Slots and Focused Development

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

## 5. Matchday Attendance Forecast

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

## 6. Hype vs Reputation

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

## 7. Youth Intake Progress

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

When the bar fills, the club receives a youth prospect.

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

## 9. Facility Upgrade Timers

Facility upgrades should not always complete instantly.

When a facility upgrade is purchased:

```text
Training Ground Level 2
Construction: 2 / 5 weeks
```

This makes upgrades feel physical and creates anticipation.

Recommended facility timer targets:

- Training Ground
- Youth Academy
- Stadium
- Scouting Network
- Medical Center
- Analytics Department

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

## 14. Recommended Priority

Suggested order after Milestone 3 visibility and core season progression:

1. Training Slots and Focused Development
2. Dashboard Progress Bars
3. Matchday Attendance Forecast
4. Youth Intake Progress
5. Facility Upgrade Timers
6. Scouting Network Progress
7. Club Identity Perks
8. Breakthrough Moments
9. Training Momentum
10. Player Sale Loop

This order adds incremental identity without derailing the immediate prototype.

---

## 15. Near-Term Backlog Candidates

These should become Linear issues or implementation prompts later:

- Design/Implement Training Slots
- Design/Implement Development Focus Paths
- Design/Implement Dashboard Progress Bars
- Design/Implement Matchday Attendance Forecast
- Design/Implement Youth Intake Progress
- Design/Implement Scouting Assignment Progress
- Design/Implement Facility Upgrade Timers
- Design/Implement Hype vs Reputation
- Design/Implement Club Identity Perks
- Design/Implement Breakthrough Moments
- Design/Implement Training Momentum
- Design/Implement Player Sale Loop
