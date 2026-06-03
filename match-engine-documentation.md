# Match Engine Documentation: Football Manager Incremental

This document describes the mathematical and logical foundation for the game's match engine. The goal is to produce fast, believable football results with noticeable tactical depth, without losing the pace and clarity expected from an incremental game.

The match engine should not simulate every pass, run, and positional movement like a full football manager game. Instead, it should convert team strength, player profiles, tactics, and match dynamics into a small number of readable events that still feel like football.

Sections marked `[Planned]` describe intended extensions rather than active simulation logic. The current engine already includes contextual duels, readiness and fatigue, goalkeeper pressure, rebounds, creator/finisher attribution, and contextual set pieces.

---

## 1. Data Foundation (Inputs)

Before a match is simulated, the engine loads the following data for both teams.

### Outfield Players (12 Stats, Scale 0-99)

**Skills:** `Passing (PAS)`, `Shooting (SHO)`, `Tackling (TAC)`, `Crossing (CRO)`, `Heading (HEA)`, `Acceleration (ACC)`, `Stamina (STA)`, `Dribbling (DRI)`, `Positioning (POS)`.

**Core attributes:** `Technique (TEC)` (general quality/multiplier), `Physicality (PHY)` (duel strength/stamina), `Mentality (MEN)` (performance under pressure).

`PHY` and `ACC` should be balanced against each other in progression, so it is expensive or difficult to build players who are both extremely fast and extremely physically dominant.

### Goalkeepers (6 Stats, Scale 0-99)

**Goalkeeper skills:** `Reflexes (REF)`, `Handling / Area Control (HAN)`, `Distribution (DIS)`.

**Core attributes:** `Technique (TEC)`, `Physicality (PHY)`, `Mentality (MEN)`.

### Tactics & External Factors

**Formation:** Formations weight positions and chance types differently. They should not primarily work as a hard rock-paper-scissors table. Instead, each formation should create natural structural strengths and weaknesses.

Examples:

| Formation | Strengths | Weaknesses |
| --- | --- | --- |
| `5-4-1` | Strong against breakaways and sustained pressure | Lower chance production |
| `4-3-3` | Strong wide play and attacking pressure | More vulnerable to fast transitions |
| `4-4-2` | Good for crosses, duels, and box presence | Can be outnumbered centrally |
| `3-5-2` | Strong central midfield control | Can be vulnerable against wide attacks |

**Tactical familiarity (0-100%):** A multiplier on tactical effectiveness. Low familiarity should mainly hurt chance production, defensive structure, and the team's ability to benefit from its formation.

**Home advantage:** Avoid giving the home team a flat bonus to every stat. Home advantage should mostly affect control, mentality, and close situations.

Recommended model:

- `+5% MEN`
- `+3%` midfield/event control
- a small advantage in close duel rolls
- optionally, a slightly lower card risk in 50/50 situations

**Weather (Wildcard) [Planned]:** Weather can later affect match style. Example: heavy rain can apply `-15% TEC`, `+10% PHY`, lower passing quality, and increase loose-ball/rebound situations.

**Staff (Upgrades) [Planned]:** Staff can later provide small bonuses to specific stat categories. These bonuses should stay small enough that they do not overpower player quality or tactical choices.

---

## 2. Pre-Match: Phase Strength Calculation

When the match begins, player stats, formation, tactics, and external factors are combined into three main phase strengths for each team.

### Midfield Strength

Primarily used to decide how often a team gains control of match events.

```text
Midfield Strength = weighted average/sum of PAS + TEC + MEN for relevant midfield and build-up players
```

### Attack Strength

Used to decide how dangerous the team's chances become.

```text
Attack Strength = weighted average/sum of SHO + CRO + ACC + TEC + relevant HEA profiles
```

### Defence Strength

Used to stop or reduce the opponent's chances before a shot happens.

```text
Defence Strength = weighted average/sum of TAC + PHY + HEA + MEN for defensive players
```

### Goalkeeper Strength

The goalkeeper should be calculated separately, so a strong defence and a strong goalkeeper feel like different assets.

```text
Goalkeeper Strength = REF + HAN + MEN, adjusted by current in-match goalkeeper pressure
```

---

## 3. Core Match Loop

The full match can be calculated instantly, but the result should be presented across roughly 10 seconds in the UI so the match can visually swing back and forth for the player.

The core chain is:

```text
Event volume -> event distribution -> chance creation -> shot quality/xG -> goal
```

### Step 1: Match Event Volume

Instead of rolling only 3-9 direct chances, the match should first roll a number of smaller match events. This creates more stability and avoids extreme randomness from only a few all-or-nothing rolls.

```text
Total events = Random Integer between 20 and 40
```

Event volume is currently adjusted by match style, formations, and both teams' attacking/defensive balance. Weather and red-card effects are planned extensions.

Examples:

- Two defensive teams: fewer events.
- Two aggressive teams: more events.
- Planned red-card effect: more events for the opponent.
- Planned weather effect: fewer technical chances, more loose balls.

### Step 2: Event Distribution

For each event, the engine rolls which team gets attacking control, based on midfield strength, home control, and tactical familiarity.

```text
Chance of event control =
Own Midfield Strength / (Own Midfield Strength + Opponent Midfield Strength)
```

Midfield should control volume and control, but it should not single-handedly decide how dangerous the chances are. A team with a strong midfield but weak forwards should be able to dominate the match without automatically scoring many goals.

### Step 3: Chance Creation

Not every event becomes a real chance. When a team wins an event, the engine rolls whether the event develops into a chance.

```text
Chance creation =
Attacking structure + relevant chance-type strength
versus
Opponent defensive structure
```

Possible outcomes:

- no chance
- half chance
- normal chance
- big chance

This layer makes the match less binary than "won duel = shot".

### Step 4: Chance Type

When an event becomes dangerous, the engine chooses a chance type. The choice should be weighted by the team's formation, tactics, and player profiles.

Chance creation and finishing are separate contributions. A winger creating a cross is evaluated primarily through `CRO`, `DRI`, `ACC`, and `TEC`, while the player attacking the delivery is evaluated through `HEA`, `POS`, `PHY`, `SHO`, and `MEN`. The engine also weights positional involvement: centre-backs rarely finish open-play attacks, while strikers, attacking midfielders, and wide forwards appear in realistic attacking contexts.

| Chance type | Attacking stats | Defensive counter-stats | Typical base xG |
| --- | --- | --- | --- |
| Fast breakaway | `ACC` + `TEC` + `SHO` | `ACC` + `TAC` + defensive `MEN` | `0.20 - 0.35` |
| Wide cross | `CRO` + attacking `HEA` + `PHY` | defensive `HEA` + `HAN` + `TAC` | `0.08 - 0.18` |
| Sustained pressure | `PAS` + `TEC` + `SHO` | `TAC` + `PHY` + defensive structure | `0.10 - 0.25` |
| Rebound/big chance | `SHO` + `ACC` + attacking positioning | `REF` + `HAN`, reduced by the situation | `0.35 - 0.60` |

Base xG is not the final goal probability. It is the starting point, then adjusted by player quality, goalkeeper quality, mentality, and match dynamics.

### Step 5: Set Pieces

Set pieces are generated as a separate family of dangerous events. They do not sit inside the ordinary open-play tactic weight table.

- corners can follow saved or deflected shots
- free kicks can follow failed attacking events and defensive fouls
- penalties are a rare outcome of defensive mistakes in dangerous areas
- aggressive defending slightly increases foul and penalty exposure

| Set piece type | Delivery / taker stats | Finisher stats | Defensive / goalkeeper stats | Typical base xG |
| --- | --- | --- | --- | --- |
| Corner | `CRO` + `TEC` + `MEN` | `HEA` + `PHY` + `POS` + `MEN` | defensive `HEA` + `PHY` + `POS`, keeper `HAN` + `MEN` | `0.06 - 0.13` |
| Indirect free kick | `CRO` + `PAS` + `TEC` | `HEA` + `POS` + `PHY` | defensive `HEA` + `POS` + `PHY`, keeper `HAN` + `MEN` | `0.05 - 0.12` |
| Direct free kick | `SHO` + `TEC` + `MEN` | same player | keeper `REF` + `MEN` | `0.06 - 0.15` |
| Penalty | `SHO` + `MEN` + a little `TEC` | same player | keeper `REF` + `MEN` | `0.72 - 0.82` |

Position weighting is deliberately contextual. Centre-backs are low-probability finishers in open play, but high-probability aerial targets at corners and indirect free kicks. This preserves believable defender goals without allowing an unusually technical centre-back to become the default open-play scorer.

### Step 6: Shot Quality and Goal Probability

The previous direct formula:

```text
SHO / (SHO + REF)
```

should not stand alone, because it creates goal probabilities that are too high when player quality is similar. Instead, use it as a quality modifier on top of base xG.

Recommended model:

```text
Skill Ratio = Attacker SHO / (Attacker SHO + Goalkeeper effective REF)
Skill Modifier = 0.75 + Skill Ratio * 0.5
Final Goal Chance = Base xG * Skill Modifier
```

Example:

```text
SHO 60 vs REF 60:
Skill Ratio = 0.50
Skill Modifier = 1.00
Normal chance with base xG 0.18 becomes an 18% goal chance

SHO 80 vs REF 50:
Skill Ratio = 0.62
Skill Modifier = 1.06
Normal chance with base xG 0.18 becomes roughly a 19% goal chance
```

If a larger gap between elite and weak players is desired, `Skill Modifier` can be widened, but it should still be constrained by base xG so ordinary shots do not become 50% goal chances.

### Step 7: Player Contribution Tracking

To support realistic player ratings and later performance-based XP, the match engine should track which players contributed to important events.

The engine does not need full pass-by-pass simulation, but it should consistently attach player involvement to generated events.

Examples:

```text
Chance created:
- primary player: chance creator / key passer / carrier
- secondary player: receiver or shooter if relevant

Shot:
- primary player: shooter
- xG value
- chance type

Goal:
- primary player: scorer
- secondary player: assister if applicable
- xG value

Save:
- primary player: goalkeeper
- xG faced

Defensive stop:
- primary player: defender or midfielder stopping the chance
- chance type stopped

Error:
- primary player: player responsible for a high-risk mistake
```

This contribution layer should stay lightweight. The goal is not to simulate every touch, but to make player ratings and match reports feel grounded in what happened.

### Step 8: Player Match Ratings

Player ratings should be derived from match contributions after the match is simulated.

Recommended rating scale:

```text
Minimum: 3.0
Average baseline: 6.0
Excellent: 8.0+
Maximum: 10.0
```

Suggested rating logic:

```text
Base rating = 6.0
```

Then apply modifiers based on role and contribution.

Attackers:

- goals
- assists/key passes
- shots
- xG
- finishing above/below xG
- chance involvement

Midfielders:

- events won
- chance creation involvement
- key passes
- duel contribution
- tactical control

Defenders:

- defensive stops
- duels won
- blocked/cleared chances
- errors leading to chance or goal
- goals conceded while on pitch

Goalkeepers:

- saves
- xG faced
- goals prevented
- goals conceded
- rebound/handling events

Context modifiers:

- small boost for strong team result
- small penalty for heavy defeat
- bonus for underdog overperformance
- penalty for red cards or major mistakes

Ratings should use contribution versus expectation where possible.

Examples:

```text
Striker scores 1 goal from 0.85 xG:
Good, but not extraordinary.

Striker scores 1 goal from 0.08 xG:
Excellent finish, larger rating boost.

Striker scores 0 goals from 1.20 xG:
Poor finishing, rating penalty.

Goalkeeper concedes 2 from 2.50 xG:
Reasonable performance.

Goalkeeper concedes 2 from 0.60 xG:
Poor performance.

Goalkeeper saves 5 shots worth 1.80 xG:
Strong performance.
```

Player ratings should later feed into match XP:

```text
Match XP = minutes component + performance/rating component + opponent difficulty component
```

---

## 4. Anti-Exploit & Live Dynamics

To keep the match engine believable and prevent unrealistic exploits, live dynamics should be noticeable without creating uncontrollable snowball effects.

### A. Goalkeeper Pressure

The goalkeeper is gradually affected if he constantly faces shots, but he should not lose large chunks of stats permanently after every save.

Recommended model:

```text
Goalkeeper Pressure starts at 0.
Each save adds +1 Goalkeeper Pressure.
Each big save or rebound situation adds +2 Goalkeeper Pressure.
Each period without shots can reduce pressure by 1.
```

Effect:

```text
Effective REF/HAN = base REF/HAN * (1 - PressurePenalty)
PressurePenalty = min(Goalkeeper Pressure * 0.02, 0.15)
```

This means the goalkeeper can lose at most roughly 15% effectiveness from pressure during a match. `MEN` can reduce this effect, so mentally strong goalkeepers keep their level better.

### B. Rebound Risk (Second Chance)

When the goalkeeper saves a shot, a rebound can happen if the defence fails to clear the ball.

```text
Rebound duel =
Defence TAC/PHY/HEA
versus
Attackers SHO/ACC/positioning
```

If the attacking team wins the rebound, it triggers a big chance. The goalkeeper should not simply be halved, because that becomes too extreme when combined with goalkeeper pressure. Use this instead:

```text
Big chance base xG = 0.35 - 0.60
Goalkeeper effectiveness penalty = 20% - 35%
```

This makes the situation extremely dangerous, but not an automatic goal.

### C. Red Cards [Planned]

Cards are not yet simulated by the current match engine. When implemented, there should be a very small base probability of a red card, either directly or through two yellow cards.

Yellow cards can initially be cosmetic, but later they can increase red card risk or make a player less aggressive in duels.

A red card should affect the team's structure depending on where it happens.

Example:

| Card to | Primary effect |
| --- | --- |
| Defender | `-20%` Defence Strength, higher opponent xG |
| Midfielder | `-20%` Midfield Strength, fewer own events |
| Forward | `-15%` Attack Strength, lower chance creation |

The red card affects the remaining events in the match and should also shift event volume slightly in the opponent's favour.

### D. Mentality Under Pressure

`MEN` should be used as a stabilising stat, not only as a hidden general multiplier.

Possible effects:

- reduces goalkeeper pressure
- reduces negative effects after conceding
- improves chance conversion in the final minutes
- makes the team less vulnerable after a red card
- improves close duel rolls

This makes mentality valuable without letting it take over the entire model.

### E. Player Readiness & Fatigue

Pre-match fitness (represented in the UI as "Readiness") directly influences in-match attributes and late-match performance:
1. **Starting Fitness Modifier**: Applies a mild penalty to team phase contributions and goalkeeper strength based on the player's readiness score before kick-off:
   - `>= 85`: `1.0` (no penalty)
   - `70-84`: `0.98` (tiny penalty)
   - `55-69`: `0.94` (visible penalty)
   - `< 55`: `0.88` (meaningful penalty)
2. **Match-Local Fatigue Penalty**: Starting fitness affects late-match fatigue decline. A starting fitness penalty `startingFitnessPenalty = clamp((100 - fitness) / 100 * 0.10, 0, 0.10)` is added to late-match fatigue loss, accelerating performance decline after the 55th minute and allowing fatigue loss to increase up to `0.22` (capping the final fatigue modifier at `0.78` instead of `0.82` for fully fit players).

---

## 5. UI Presentation (10 Seconds of Tension)

Even though everything is calculated instantly, the results are fed into a visual timeline that plays out across roughly 10 seconds.

The UI should show the flow of the match without exposing too much math.

The engine should keep detailed raw events for ratings, stats, and debugging, but the live timeline should show grouped display highlights. Raw engine events are not the same as user-facing timeline rows.

Example flow:

- minute counter from `0'` to `90'`
- grouped highlights distributed across the timeline
- dangerous chances get stronger emphasis than normal events
- goals and big chances appear in the live feed
- cards and injuries can join the feed when those systems are implemented
- rebound/big chance situations feel like dramatic double moments

### Raw Events vs Display Events

Raw events can include internal simulation steps:

```text
chance setup
shot
save
rebound
goal
defensive stop
error
```

The UI should group related raw events into cleaner display events where possible.

Example raw sequence:

```text
20' Kingsport create sustained pressure.
20' Ben Spencer tests the goalkeeper. xG 0.19
20' Rhys Young saves. xG 0.19
```

Preferred display event:

```text
20' Rhys Young saves Ben Spencer's effort after sustained pressure. xG 0.19
```

Example raw sequence:

```text
26' Kingsport create sustained pressure.
26' Finn Barker gets a shot away. xG 0.14
26' Finn Barker scores. xG 0.14
```

Preferred display event:

```text
26' GOAL - Finn Barker scores from sustained pressure. xG 0.14
```

The match simulation interface separates these events to create a modern broadcast dashboard experience:
1. **Live Match Stats**: Displays real-time updating comparison (tug-of-war) stats for both teams including Possession, Shots, Shots on Target, Expected Goals (xG), Saves, and Defensive Stops.
2. **Key Moments**: A high-level highlight feed showing goals (with assister context) and big chances. Cards and injuries can join this feed when those systems are implemented.
3. **Detailed Event Log**: A collapsible section containing the full timeline of grouped commentary events for debuggers and detail lovers, closed by default.

The UI presents this simulation dramatically, updating stats and moments minute-by-minute, but never alters the calculated match outcomes.

### Player Identity in Match UI

Player names are clickable in both the Key Moments list and the Detailed Event Log. Clicking a player's name opens their detailed match stats sheet.

---

## 6. Balancing Design Principles

### Avoid Flat Bonuses

Flat bonuses to every stat are easy, but they can quickly feel artificial. Bonuses should usually target a specific part of the match engine:

- home advantage affects control and mentality
- planned weather can affect technique/physicality and chance types
- formation affects event types and structural strengths
- planned staff upgrades can affect specific stat categories

### Separate Volume and Quality

The match engine should always distinguish between:

- how many events a team gets
- how many events become chances
- how dangerous those chances are
- how well the team finishes
- how well the goalkeeper saves

This creates multiple meaningful ways to build a team.

### Keep Randomness Controlled

Football should be unpredictable, but the player should feel that stronger teams usually perform better. Because of that, the engine should use several smaller rolls instead of a few huge rolls.

A match with 20-40 events and 4-10 real shots will usually feel more stable than a match with 3-9 all-or-nothing chances.

### Make Tactics Readable

The player should be able to understand why a tactic worked or failed.

Good feedback:

```text
Your 4-3-3 created many crosses, but the opponent's strong centre-backs won the aerial duels.
```

Bad feedback:

```text
You lost because 4-3-3 had -8% against 5-4-1.
```

---

## 7. First Implementable Version

A good first version of the match engine can stay simple:

1. Calculate phase strengths.
2. Roll 20-40 events.
3. Distribute events through midfield strength.
4. Roll whether each event becomes a chance.
5. Pick chance type from tactics/formation.
6. Calculate base xG.
7. Adjust xG with attacker `SHO`, goalkeeper effective `REF`, `MEN`, pressure, and situation.
8. Roll goal outcome.
9. Track player contributions for shots, goals, saves, chance creation, defensive actions, and errors.
10. Calculate player match ratings.
11. Handle rebounds, contextual corners, free kicks, penalties, and goalkeeper pressure.
12. Generate grouped display timeline events for the UI while preserving raw events for ratings/stats/debugging.
13. Add cards, injuries, weather, and staff effects as later extensions.

This version should create a believable football feel while staying small enough for an incremental game.
