# Football Manager Incremental

A browser-based incremental football management prototype.

The game combines a fast football match simulation with club-building progression: generated leagues, tactical preparation, live match playback, player ratings, player development, readiness-driven rotation, a five-division ecosystem, and a config-driven facilities economy.

## Current Prototype Status

Implemented:

- generated 10-team leagues with 18-match seasons
- promotion, relegation, staged offseason transfer windows, season rollover, and AI squad refresh
- tactical preparation with eight formations and seven tactical focuses
- live match playback, match reports, player ratings, and contextual set pieces
- player XP, stat development, fixed potential, facility caps, and readiness
- player squad roles, morale bands, and visible market reputation
- dedicated Training screen with assignable focused development slots
- weekly finances, stadium attendance, facility construction, youth intake decisions, and a detailed Finance Ledger with Economy overview and forecasts
- transfer-market interactions with 3-week offseason windows, season-based contracts, curated targets, purchases, and renewals
- manual browser save/load with versioned local save slots (up to version 4)

Planned next:

- player listings, sales, and lightweight AI transfer offers
- substitutions and in-match tactical changes
- injuries, cards, staff hiring, and scouting assignments

## Tech Stack

- Vite
- React
- TypeScript
- Zustand
- Tailwind CSS
- Vitest

## Scripts

```bash
npm install
npm run dev
npm test
npm run build
```

## Design Documents

- [Changelog](./CHANGELOG.md)
- [Match Engine Documentation](./match-engine-documentation.md)
- [Core Game Loop Documentation](./core-game-loop-documentation.md)
- [Game Data Model Documentation](./game-data-model-documentation.md)
- [First Prototype Scope](./first-prototype-scope.md)
- [Tech Stack Documentation](./tech-stack-documentation.md)
- [Future Mechanics Backlog](./future-mechanics-backlog.md)
