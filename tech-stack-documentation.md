# Tech Stack Documentation: Football Manager Incremental

> **Status:** Stack decision record and architectural guide. The stack remains current, but the project structure below is illustrative rather than an exact filesystem inventory. Shipped milestones are tracked in [CHANGELOG.md](./CHANGELOG.md).

This document defines the recommended tech stack for the first playable prototype and the architectural principles that should guide implementation.

The goal is to build a fast, testable, browser-based single-player prototype with a strong simulation core and a clear management UI.

---

## 1. Recommended Stack

```text
Language: TypeScript
Frontend: React
Build Tool: Vite
State Management: Zustand
Styling: Tailwind CSS
Testing: Vitest
Save/Load: localStorage first, IndexedDB later if needed
Deployment: Vercel later
```

This stack fits the game because the first version is:

- state-heavy
- UI-heavy
- simulation-heavy
- data-model-heavy
- not graphically demanding
- well suited for a browser-based incremental/management game

---

## 2. Why TypeScript

The game has many interconnected data models:

- `Player`
- `Club`
- `League`
- `Season`
- `Match`
- `Tactic`
- `Lineup`
- `FacilitySet`
- `StaffMember`
- `ScoutingReport`
- `YouthProspect`
- `MatchReport`

TypeScript makes these models explicit and helps prevent the match engine, UI, economy, and progression systems from drifting apart.

TypeScript should be used for:

- domain types
- match engine inputs/outputs
- generated game state
- save/load validation
- UI props
- test fixtures

---

## 3. Why React + Vite

React is a strong fit because the game is primarily made of management screens:

- dashboard
- squad table
- tactics/lineup screen
- opposition report
- match simulation timeline
- match report
- club upgrades
- finances
- league table

Vite is preferred for the prototype because it is lightweight, fast to start, and simple to configure.

The first version does not need a backend framework. A local single-player prototype is the fastest way to prove the core loop.

---

## 4. Why Zustand

Zustand is recommended for game state because it is simple, lightweight, and works well with React.

It should store:

- current `GameState`
- selected screen/view
- current fixture/match flow state
- UI selections such as selected tactic, lineup, or player
- save/load actions

The store should not contain complex simulation logic. It should call domain functions that live outside React.

Good pattern:

```text
UI action -> Zustand action -> domain function -> updated GameState
```

Avoid putting match engine calculations directly inside React components.

---

## 5. Why Tailwind CSS

Tailwind is recommended for fast UI iteration.

The game will need many dense management screens, so the visual style should be:

- clear
- compact
- readable
- data-first
- responsive enough for common desktop/laptop sizes

The prototype should avoid overly decorative layouts. This is a management game, so the UI should prioritize scanning, comparison, and repeated decision-making.

---

## 6. Testing Stack

Use `Vitest` for unit tests.

The most important systems to test are domain systems, not UI details.

Priority test targets:

- player generation
- fixture generation
- match engine
- xG/goal probability calculations
- season table updates
- rewards
- player XP and development caps
- promotion/relegation
- economy calculations
- save/load serialization

Example test goals:

```text
A 10-team league generates 18 fixtures per club.
A player cannot train beyond personal potential.
A player cannot train beyond the current club development cap.
A match produces a valid score and match report.
Promotion moves top teams to the next league profile.
Weekly expenses include player wages, staff wages, and facility upkeep.
```

---

## 7. Save/Load Strategy

Start with local browser persistence.

Version `0.1`:

```text
localStorage
one save slot
manual or automatic save after key actions
JSON serialized GameState
```

Later versions can move to:

```text
IndexedDB for larger saves
cloud saves if accounts are added
leaderboards/challenge runs if online features are added
```

Save data should include:

- game state
- current season
- player club
- squads
- league table
- fixtures/results
- finances
- facilities
- staff/departments
- player development

---

## 8. Deployment

The prototype can run locally first.

When ready to share, deploy as a static web app.

Recommended deployment target:

```text
Vercel
```

The first version should not require a server.

---

## 9. Recommended Project Structure

The repository has grown beyond this initial outline. Keep using it as an ownership guide rather than a literal directory manifest.

```text
src/
  app/
    App.tsx
    routes.ts

  domain/
    types/
      game.ts
      player.ts
      club.ts
      league.ts
      match.ts
      tactics.ts
      economy.ts

    generation/
      generateGameState.ts
      generateClub.ts
      generatePlayer.ts
      generateLeague.ts
      generateFixtures.ts

    match-engine/
      calculatePhaseStrengths.ts
      simulateMatch.ts
      chanceCreation.ts
      goalProbability.ts
      generateMatchReport.ts

    season/
      advanceMatchday.ts
      updateLeagueTable.ts
      resolveSeasonEnd.ts
      promotionRelegation.ts

    development/
      awardMatchXp.ts
      runTraining.ts
      applyStatGrowth.ts
      developmentCaps.ts

    economy/
      calculateWeeklyFinances.ts
      applyMatchRewards.ts
      upgradeFacility.ts

    reports/
      generateOppositionReport.ts
      generateRecommendations.ts

  store/
    gameStore.ts

  ui/
    components/
      layout/
      tables/
      player/
      match/
      finance/

    screens/
      DashboardScreen.tsx
      SquadScreen.tsx
      TacticsScreen.tsx
      OpponentReportScreen.tsx
      MatchSimulationScreen.tsx
      MatchReportScreen.tsx
      ClubUpgradesScreen.tsx
      FinanceScreen.tsx
      LeagueScreen.tsx

  data/
    constants/
      statNames.ts
      formations.ts
      leagueProfiles.ts
      facilityProfiles.ts
      balance.ts

  persistence/
    saveGame.ts
    loadGame.ts
    clearSave.ts

  utils/
    random.ts
    math.ts
    format.ts
```

---

## 10. Architecture Principles

### Keep Domain Logic Separate From UI

The simulation should be plain TypeScript functions.

Good:

```text
simulateMatch(input) -> Match
applyMatchRewards(gameState, match) -> GameState
runTraining(gameState) -> GameState
```

Bad:

```text
React component calculates goals, rewards, and stat growth directly.
```

Keeping domain logic separate makes the game easier to test, balance, and eventually port.

### Prefer Pure Functions

Most domain functions should receive data and return updated data.

Example:

```ts
const match = simulateMatch(matchInput, rng);
const nextState = applyMatchRewards(gameState, match);
```

This makes debugging and testing much easier.

### Use Seeded Randomness

The match engine and generation systems should eventually support seeded randomness.

Benefits:

- reproducible tests
- easier debugging
- possible challenge runs
- easier balancing

Version `0.1` can start with a simple random utility, but the design should allow replacing it with a seeded RNG.

### Store Source Data, Derive Calculated Values

Avoid storing values that can be recalculated unless needed for history or performance.

Usually derive:

- phase strengths
- wage totals
- facility upkeep totals
- team strength previews
- promotion/relegation status before season end

Store:

- match results
- match reports
- player current stats
- player potential stats
- finances
- facilities
- league table
- fixtures

---

## 11. UI Principles

The UI should feel like a football management tool, not a marketing landing page.

Priorities:

- readable tables
- clear comparison
- compact decision surfaces
- obvious next action
- useful feedback after every match
- minimal decorative clutter

Required first screens:

- Dashboard
- Squad
- Tactics / Lineup
- Opponent Report
- Match Simulation
- Match Report
- Club Upgrades
- Finance
- League Table

The first UI can be simple, but it must make the core loop playable.

---

## 12. First Implementation Milestones

### Milestone 1: Generated World

```text
Create a new game
Generate player club
Generate 9 opponent clubs
Generate squads
Generate an 18-match fixture list
Show dashboard and league table
```

### Milestone 2: One Match

```text
Pick lineup and tactic
Generate opposition report
Simulate one match
Show timeline/result
Show match report
Apply match rewards
```

### Milestone 3: Player Development

```text
Award match XP
Run training after match week
Apply stat growth within potential and facility caps
Show capped potential indicators
```

### Milestone 4: Economy and Upgrades

```text
Apply match income
Apply weekly expenses
Upgrade facilities
Upgrade staff/departments
Show weekly profit/loss
```

### Milestone 5: Full Season

```text
Advance through all 18 matches
Update league table
Pay end-of-season rewards
Resolve promotion/relegation
Start next season
```

### Milestone 6: Save/Load

```text
Save GameState locally
Load GameState
Continue season after reload
Clear save/new game
```

---

## 13. Alternatives Considered

### Next.js

Next.js is a strong option if the game needs accounts, cloud saves, server-side APIs, or online leaderboards early.

For version `0.1`, it adds complexity that is not necessary. Vite is better for fast local prototyping.

### Unity or Godot

Unity or Godot would make sense if the core experience were a visual 2D/3D match simulation.

This game is primarily a management simulation with dense UI and data-heavy systems, so a web stack is a better fit for the first version.

### Backend Database

A backend database is not needed for the first local prototype.

Use local save storage first. Add backend persistence only when online features become part of the product.

---

## 14. Recommended Version 0.1 Stack Lock

Use this stack for the first implementation:

```text
Vite
React
TypeScript
Zustand
Tailwind CSS
Vitest
localStorage
```

This gives the project the fastest path from design documents to a playable prototype.
