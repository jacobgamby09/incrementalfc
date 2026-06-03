# Incremental FC Patch Notes

This file tracks product-facing milestone notes for Incremental FC. It is meant to be a quick overview of what has been implemented, what changed in the design, and what remains intentionally out of scope.

## Unreleased / Current Work

### Name Generation Polish

Implemented:
- Expanded nationality-aware first-name and surname pools, especially for English players, to reduce repeated names across generated worlds and longer saves.
- Fixed the Republic of Ireland nationality profile lookup so Irish players use the intended Irish name pool instead of falling back to English names.
- Added a persistent player-name registry to prevent duplicate full names across the generated pyramid, youth prospects, offseason AI replacements, and free agents.
- Added a soft surname cap so common surnames can still appear naturally without dominating the player world.

---

### Milestone 4.3.0 - Manual Development Points

Implemented:
- Changed player development from automatic stat growth to manual stat allocation.
- Match XP and training XP now fill progress toward a **Development Point** instead of directly increasing a stat.
- Added `unspentDevelopmentPoints`, `developmentPointProgress`, and `lastDevelopmentPointsGained` to player development state.
- Added manual `+1` stat allocation from the player detail sheet, guarded by age, personal stat potential, and the club's Training Ground development cap.
- Surfaced development points in Squad overview, Squad development preset, Training screen, Dashboard player detail, Squad player detail, and Tactics player detail.
- Updated match rewards copy and badges to show newly earned Development Points instead of implying automatic stat increases.
- Kept player decline as automatic, so older players can still lose stats through age decline while normal development remains manual.
- Removed focused-training program selection from the Training screen. Focused slots are now presented as pure XP multipliers toward the next manual Development Point.
- Renamed vague `Cap Status` presentation to `Development Status`, with sharper labels: `Developing`, `Facility limited`, `Potential reached`, and `Declining`.
- Added player **Tactical Fit** recommendations. Player sheets now show the top 3 tactical focuses with fit percentages and key stats, while Squad overview shows each player's best focus.
- Added **Selected XI Tactical Fit** analysis to the Tactics screen, showing which tactical focuses best match the currently selected starters and how the current focus compares.

---

### Milestone 4.2.4 - Persistent Football World

Implemented:
- Replaced rollover-generated reserve opponents with a persistent five-division English pyramid: Local League, Regional League, National League, Championship, and Premier League.
- Generated 50 permanent fictional clubs at new-game creation. Every club keeps its identity, squad, facilities, economy, and history across promotion and relegation.
- Added lightweight offscreen standings for divisions outside the player's active league. Existing clubs exchange places with adjacent divisions during rollover instead of disappearing from the world.
- Extended offseason aging, contract processing, AI squad refresh, readiness recovery, and stat-band nudges across the complete pyramid.
- Added lightweight AI contract renewals so the persistent world does not flood the market with unrealistic free-agent churn.
- Expanded AI transfer buyers beyond the active division while filtering out players who are clearly below the buyer's division standard.
- Added configurable nationality-aware player generation with an English-majority distribution that becomes gradually more international in higher divisions.
- Added 25 nationality profiles with matching first-name and surname pools.
- Surfaced player nationality on the player detail sheet.
- Added colored country flag images dynamically fetched via FlagCDN on the player detail sheet to ensure proper rendering on Windows.
- Added dashed division boundaries in the league table: a green dashed line after position 2 (promotion) consistently across all 5 leagues, and a red dashed line before position 9 (relegation) in the 4 upper leagues where relegation applies.
- Made the league table subtitle dynamic to display accurate promotion and relegation counts according to the active league level.
- Added a detailed **Club Detail Modal** (`ClubDetailModal.tsx`) exposing stadium information, facility levels, historical promotions/relegations, and a full squad roster for any opponent team, accessible by clicking club names in the league table.
- Added a **Player Stats** sub-tab on the League Screen containing Top 10 tables for Goalscorers, Assisters, and Average Ratings across the active division, with interactive links to players and clubs.
- Leveraged the Scouting Department's facility accuracy configuration to dynamically show scouted potential range estimates (e.g. "65-75") instead of raw numbers on the player detail sheet for external/opponent squad players.
- Bumped browser saves to schema version `5`, intentionally discarding pre-pyramid saves.

---

### Milestone 4.2.3 - Selling and Lightweight AI Activity

Implemented:
- Added three config-driven sale strategies: `Quick Sale`, `Market Price`, and `Hold Out`. Each trades asking price against the chance of attracting a buyer.
- Turned `My Listings` into an actionable squad-sale view where player-club players can be listed or removed during the offseason window.
- Added lightweight AI offers from clubs that can afford the player. Buyer priority responds to squad needs, squad depth, and club archetype.
- Added an `Incoming Offers` view with clear accept/reject decisions and one-week offer expiry.
- Completed accepted player sales immediately: the player changes club, both squads and cash balances update, and both sides receive finance-ledger entries.
- Kept sales separate from limited signing actions.
- Added safeguards preventing expired-contract listings and sales that would leave fewer than 11 contracted players.
- Surfaced active player-club listings on the player detail sheet.
- Added a five-season Phase 4 diagnostic covering renewals, sales, readiness, cash flow, league movement, and squad viability.
- Fixed a long-save rollover issue where the reserve club-name pool could be exhausted, producing leagues with fewer than 10 active clubs.
- Fixed sticky AI crisis tactics. Defensive reactions now revert to the club's saved tactical identity when poor form passes instead of gradually locking the league into defensive football.

---

### Milestone 4.2.2.2 - Season Loop Stabilization

Implemented:
- Reset active squad readiness to `100` during the offseason so every club begins a new campaign fresh.
- Rebalanced the round-robin fixture generator to preserve home-and-away pairings while preventing long venue streaks. Clubs now receive at most two consecutive home or away fixtures.
- Added a player-club contract-expiry grace period. Expired contracts remain renewable during the offseason instead of immediately removing the player from the squad.
- Blocked manual transfer-window finalization while expired player-club contracts remain unresolved or fewer than 11 contracted players are available.
- Decoupled contract renewals from limited transfer actions. Renewal negotiations still use package strength and patience, but do not consume signing actions.
- Added current-season stats and compact multi-season history to the player detail sheet: appearances, goals, assists, and average rating.

---

### Milestone 4.2.2.1 - Economy Overview & Finance Ledger

Implemented:
- Added a dedicated **Economy Screen** ([EconomyScreen.tsx](file:///c:/Users/JacobGamby/IncrementalFC/src/ui/screens/EconomyScreen.tsx)) in the top-navigation bar for a quiet, information-dense football-club control panel.
- Implemented a pure **Finance Ledger** tracking all cash-flow events (baseline income, matchday gate receipts, result bonuses, player/staff wages, facility construction upgrades, transfer purchases/sales, and season rollover placement prizes).
- Integrated transaction logging seamlessly across weekly finances, facility start upgrades, offseason transfer signings, and season-end prize payouts.
- Created dynamic wage calculation for forecasts and dynamic reserve runway calculations (`operatingReserveWeeks`) derived from liquid reserves divided by active wage/upkeep commitments.
- Added config-driven scenario forecasts (Conservative, Expected, Optimistic) using multipliers over remaining scheduled fixtures in the current season.
- Kept scenario forecast helpers available for future tuning, but removed the expanded projection panel from the Economy screen after UX review.
- Bumped save game schema version to `4` (storage key `incremental-fc-save-v4`) to integrate the ledger state, automatically discarding legacy version 3 saves.
- Created a horizontal double-sided cash-flow history chart (using standard CSS bars) illustrating home/away matchday receipts volatility.
- Linked the Dashboard Economy card to route to the new Economy screen on click with hover animations.

---

### Milestone 4.2.2 - Buying and Contract Renewals

Implemented:
- Expanded the Transfer Market with `Transfer Listed`, `Free Agents`, `Scouted Opportunities`, `My Listings`, `Renew Contracts`, and `Negotiations` tabs.
- Added four config-driven negotiation packages: `Lowball`, `Cautious`, `Fair`, and `Statement`.
- Added readable negotiation patience. Aggressive lowball offers can collapse talks, while every submitted offer consumes one offseason action.
- Added deterministic willingness scoring based on player interest or morale, club reputation, league movement, promised squad role, contract length, and package strength.
- Added completed signings: accepted purchases deduct the fee, move the player between clubs, apply wage and contract terms, and remove the player from the curated market pool.
- Added contract renewals for existing squad players using the same package system without a transfer fee.
- Kept selling and AI-generated bids deferred to Milestone 4.2.3. `My Listings` is intentionally read-only for now.

---

### Milestone 4.2.1 - Player Context

Implemented:
- Added player `marketReputation` as a visible 1-100 value near wage, value, and contract length on the player sheet.
- Added visible squad roles: `Key Player`, `Regular Starter`, `Rotation`, `Backup`, and `Prospect`.
- Added five compact morale bands with arrows: `Thriving`, `Happy`, `Content`, `Frustrated`, and `Disengaged`.
- Added config-driven matchday morale changes from results, role-based playing-time expectations, and expiring contracts.
- Added slow market-reputation movement for notable match ratings, goals, and assists.
- Added sortable `Squad Role`, `Morale`, and `Market Rep` columns to relevant Squad presets.
- Added market reputation to the Transfer Market table.
- Bumped browser saves to schema version 3 because player context fields are now required.

---

### Milestone 4.2.0 - Transfer Window Foundation

Implemented:
- Added a staged offseason transfer window between completed seasons and the first playable fixture of the next season.
- Added a config-driven 3-week transfer window with 5 future transfer actions per offseason.
- Added Dashboard controls to open the transfer window, advance transfer weeks, inspect the market, and finalize the offseason.
- Prepared next-season fixtures during rollover but locked match preparation until the transfer window is finalized.
- Converted player contracts from weeks remaining to seasons remaining and surfaced the contract length on player sheets.
- Added contract expiry during rollover. Expired players leave their squad and enter the offseason free-agent pool.
- Added typed placeholders for negotiations, incoming offers, scouted opportunities, sale strategies, and four future negotiation packages.
- Bumped browser saves to schema version 2 because the contract and transfer-market models changed. Milestone 4.2.1 subsequently advances the active schema to version 3.
- Documented the complete Transfer V1 roadmap in `future-mechanics-backlog.md`.

Intentionally deferred:
- Buying, selling, renewals, morale behavior, squad roles, AI offers, and negotiation outcomes remain future 4.2.x work.

---

### Milestone 4.1.3 - Browser Save & Cleanup

Implemented:
- Added manual `Save Game` and `Load Game` actions to the Settings menu. Saves are stored as versioned JSON in browser `localStorage`.
- Loading a save resets temporary navigation and match-preparation state, returning the player to the Dashboard with a clean UI state.
- Added a confirmation before loading because the active unsaved session is replaced.
- Added an explicit `Declining` badge to the player detail sheet for players aged 30 or older.
- Removed remaining Danish labels from the compact Tactics screen.

---

### Milestone 4.1.2 - Tactics Screen Compaction

Implemented:
- Refactored the **Tactics** screen ([TacticsScreen.tsx](file:///c:/Users/JacobGamby/IncrementalFC/src/ui/screens/TacticsScreen.tsx)) to make the layout significantly more compact and fit standard viewports with minimal scrolling.
- Merged the match preparation header and tactical selector options (Formation, Focus, Risk) into a unified, responsive top header bar.
- Converted the bulky **Tactical Impact Preview** card into a collapsible section, hiding the detailed lists of benefits, tradeoffs, likely chances, and vulnerabilities by default, while keeping the critical tactical familiarity progress status visible.
- Redesigned the right-hand starting lineup selector slots from vertical card blocks into compact horizontal flex-row list items.
- Relocated detailed position effectiveness explanation texts (`fit.explanation`) into hoverable native HTML tooltips (`title` attribute) on the position fit badge.
- Streamlined the bench list layout to show all 7 players in a single responsive row on desktop screen widths.
- Added the stadium name (derived dynamically from the club name) and its seating capacity to the "Club" info card on the Dashboard screen ([DashboardScreen.tsx](file:///c:/Users/JacobGamby/IncrementalFC/src/ui/screens/DashboardScreen.tsx)).
- Added the net weekly economy (expected weekly income minus expenses) in parentheses next to the cash balance on the Dashboard screen ([DashboardScreen.tsx](file:///c:/Users/JacobGamby/IncrementalFC/src/ui/screens/DashboardScreen.tsx)), colored green (emerald) if positive and red (rose) if negative.
- Added an explicit `Declining` development status for players aged 30 or older. Veterans retain their historical POT but no longer appear as having unlockable untapped potential.

---

### Milestone 4.1.1 - Real POT & Scouted Estimates

Implemented:
- Preserved unrestricted fixed personal potential rolls regardless of player age or current league. Rare lower-league talents can carry exceptional upside even when the club cannot yet unlock it.
- Kept age as a development-window rule: players aged 30 or older retain their real historical POT but cannot receive further normal stat growth.
- Added scout-based `Est. POT` intervals with confidence labels for external market players and unsigned academy prospects. Scouting Department upgrades narrow the interval.
- Revealed exact `POT` for signed players in the player's own squad.
- Prevented AI clubs from applying hidden stat-growth nudges to players aged 30 or older.
- Added a clear player-development note for veterans: `No further stat growth after age 30.`
- Simplified player-facing OVR and POT presentation to rounded whole numbers while preserving internal decimal precision for calculations and sorting.
- Added a live filling animation to the matchday attendance progress bar on the **Opposition Report** screen, which slides from 0% to the target occupancy rate over 1.2s when the page is opened.
- Implemented a golden glowing pulsing transition (`bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500`) and a bouncing `SOLD OUT` badge for home matches when the stadium hits 100% capacity ("max").

---

### Milestone 4.1 - Training Screen & Focused Development

Implemented:
- Added a dedicated `Training` screen and top-menu route.
- Added persistent focused training assignments to clubs. Training Ground levels control how many focused slots are available.
- Added six targeted programs: `Technical`, `Passing`, `Finishing`, `Defending`, `Physical`, and `Goalkeeping`.
- Kept baseline squad training for every player and added config-driven `+30%` focused XP for assigned players.
- Added focused XP slots while preserving facility and personal potential caps.
- Added a squad development table with OVR, estimated potential, expected squad XP, focused slot, development status, and next-growth progress bars.
- Added focused-training domain tests for slot availability, duplicate assignment prevention, and bonus XP.

---

### Milestone 4.0.4 - Dashboard Progress Meters

Implemented:
- Renamed the Dashboard `Cash` summary to `Economy` and added compact weekly income and weekly expenses meters.
- Included expected gate receipts in the upcoming weekly income meter for home fixtures.
- Renamed Dashboard `Support` to `Fans` and added a persistent `Hype` meter based on the club's recent results and promotion momentum.

---

### Milestone 4.0.3 - Small Matchday UX Fixes

Implemented:
- Fixed squad attribute sorting so the visible stat labels (`PAS`, `SHO`, `TAC`, etc.) are the actual sortable header controls while retaining their hover/focus tooltips.
- Added an explicit `Save tactic` action on the tactics screen. It stores the current formation, tactical focus, risk level, and lineup as the club's active setup before the next match.
- Added a pre-match stadium occupancy panel to the opposition report:
  - home fixtures show expected attendance, stadium capacity, gate receipts, occupancy percentage, and a visible fill bar
  - away fixtures clearly state that there are no home gate receipts

---

### Milestone 4.0.2 - Scorer Attribution & Set-Piece Match Engine Pass

Implemented:
- Split chance creation from finishing so each action uses its own contextual stat recipe.
- Added position-weighted attacking involvement. Centre-backs now appear rarely as open-play finishers, while strikers and attacking roles receive the expected share of ordinary shots.
- Added four distinct dangerous set-piece routes: corners, indirect free kicks, direct free kicks, and penalties.
- Connected set-piece origins to the compressed match flow:
  - dangerous corners can follow saved shots
  - free kicks and rare penalties can follow failed attacks and defensive fouls
  - aggressive defending slightly increases dangerous foul exposure
- Added contextual set-piece recipes using existing stats:
  - corner and indirect-delivery quality uses `CRO`, `PAS`, `TEC`, and `MEN`
  - aerial finishing and defending uses `HEA`, `PHY`, `POS`, and `MEN`
  - direct free kicks use `SHO`, `TEC`, and `MEN`
  - penalties use `SHO`, `MEN`, and a smaller `TEC` contribution
  - goalkeeper response changes by dead-ball type, emphasizing `HAN` for deliveries and `REF` / `MEN` for direct shots
- Extended timeline copy, reports, opposition profile clues, and chance breakdowns to understand the new routes.
- Added seeded goal-distribution diagnostics and unit tests for position weights, set-piece classification, and penalty timeline rendering.

Balance notes:
- Across the seeded 600-match diagnostic, attacking positions scored `76.4%` of all goals.
- Open-play goals from the back line fell to `6.9%`.
- Set pieces produced `16.6%` of goals, inside the intended `15-25%` starting range.

### Milestone 4.0.1 - Opening Economy & Stadium Demand Tuning

Implemented:
- Reworked stadium demand so the fan count is a long-term supporter base rather than automatic attendance.
- Added derived short-term **Hype** from recent results. Winning streaks increase attendance demand, while poor runs reduce the pressure to expand.
- Added reputation and opponent appeal modifiers to the attendance rate.
- Added visible supporter base, hype, attendance rate, expected occupancy, and lost ticket revenue to the Facilities screen.
- Reduced starting player cash from `£250,000` to `£180,000`.
- Increased early facility upgrade prices to create clearer first-season tradeoffs.
- Made Training Ground value more concrete by showing squad training XP per player per week.
- Added a Youth Academy estimate for weeks until the next prospect.
- Added a reusable season-level economy diagnostics suite comparing no upgrades, focused investment, and broad investment strategies.
- Fixed the Facilities screen weekly commitments card so it always derives current upkeep from live facility levels.

Balance notes:
- A new club does not automatically fill its starting stadium on opening day.
- Strong form can reveal emerging stadium demand and make expansion attractive.
- Players can still pursue an aggressive broad upgrade strategy, but reserve warnings now reflect the financial risk.

### Milestone 4.0 - Club Facilities & Economy Foundation

Implemented:
- Added centralized typed balance profiles for Training Ground, Stadium, Medical Center, Scouting Department, and Youth Academy. Costs, upkeep, construction time, and effects now live in config rather than UI components.
- Added player-funded facility upgrades with immediate cash deduction, per-facility construction progress, concurrent building support, max-level safeguards, and operating-reserve warnings.
- Added a dedicated **Facilities** navigation screen showing current and next-level effects, construction timers, weekly commitments, projected season balance, stadium demand, and youth intake progress.
- Added weekly club finance processing:
  - recurring baseline income
  - player wages
  - staff wage placeholder
  - facility upkeep
  - home-only gate receipts
  - separate sporting result bonuses
- Removed away-match gate receipts and removed duplicate stadium revenue from generic match rewards.
- Added stadium demand calculations with capacity caps, lost demand, and lost potential ticket revenue.
- Migrated Training Ground caps/training XP and Medical Center readiness recovery to config lookups.
- Added a simple Youth Academy intake event. Prospects wait for an explicit **Sign Prospect** or **Release** decision instead of auto-joining the squad.
- Added two offseason finance/construction weeks during season rollover.
- Removed free player-club stadium upgrades on promotion. Player facilities now improve through player-directed spending.
- Preserved existing facility visual metadata (`visualTier`, `assetKey`, `upgradeState`) for future Club Hub assets.

Balance notes:
- Early facility upgrades are intentionally cheap and fast to create opening-season momentum.
- From level 5 onward, costs and construction times grow toward larger season-level decisions.
- All balance values remain provisional and are designed for config-only tuning after playtesting.

Known limitations:
- Focused training slots are visible but cannot be assigned yet.
- Scouting uses a lightweight visible foundation; full discovery and fog-of-war are deferred.
- Individual staff hiring, sponsors, loans, ticket-price controls, injuries, and facility artwork remain deferred.

Verification:
- Added facility upgrade, weekly finance, stadium attendance, and youth intake tests.
- All 138 Vitest tests pass.

### Milestone 3.6 - Fixtures Screen, Post-Match Rewards & Squad OVR / Star Rating

Implemented:
- Added a dedicated **Fixtures** navigation tab, allowing users to view all 18 matchdays (both past scores and upcoming fixtures).
- Replaced the status indicator circles (W/D/L) and opponent color circles in the fixtures list with clean green ("HOME") and red ("AWAY") badges for a modern, streamlined aesthetic.
- Added a direct "Prepare Match" action button on the next upcoming fixture row in the Fixtures tab.
- Separated the **Rewards & Development** flow from the Match Report:
  - Created a dedicated `MatchRewardsScreen` showing cards for money, fans, and reputation gains, tactical familiarity, truppens XP progress, and a list of players with stat increases or facility bottlenecks.
  - Simplified `MatchReportScreen` into a clean 2-column layout comparing team stats, with "Your Chance Breakdown" moved up directly below the team stats comparison.
- Added a **Squad OVR & Strength** card in the Squad tab, replacing the "Training Ground Level" metric:
  - Calculates the average OVR of the entire squad.
  - Calculates the club's paper strength relative to the other 9 clubs in the division and displays a corresponding 1-6 star (`★`) rating.
- Added the opponent's 1-6 star (`★`) strength rating next to their name in the **Opposition Report** screen header.
- Created the `clubStrength.ts` shared helper utility to compute any club's squad average OVR, sorted paper-strength rank, and star rating, consolidating the logic and removing duplication.
- Added a dedicated **Tactics** tab to the top navigation header, mapping 1:1 to the Match Preparation screen, allowing players to view/adjust formations, focus, risk levels, and starting XI anytime during the season. Added a fallback banner showing "No active fixture" when viewed during the postseason.
- Upgraded the **Opposition Report** screen to include a secondary **Simulate Match** button alongside "Set Tactics", allowing players to bypass the tactics screen and directly simulate the match with current/default settings.
- Implemented persistent lineups: stored the user's starter selections and customized lineup configurations in the `ClubTactics` state. The game now retains and reloads the latest starters and tactic choices from match day to match day, only defaulting to the auto-select generator if the formation changes or players in the lineup leave the club's squad.
- Removed the "Squad Preview" table from the Dashboard screen and replaced it with a high-impact **Squad Player Stats** dashboard widget showcasing Top Goalscorer (with goals/game ratio), Most Assists (with key passes detail), Best Form (average of the last 5 match ratings, complete with match history badges), and Highest Average Rating. Added a clean, dashed empty-state box for when no matches have been played yet.
- Added color-coded outcome badges (W/D/L) next to the score in the **Fixtures & Results** table, showing a green badge for Wins, yellow for Draws, and red for Losses.
- Updated `gameStore.ts` and `App.tsx` routes, adding the `"fixtures"` and `"matchRewards"` ScreenIds and back-navigation history support for reviewing historical match reports.

Verification:
- All 129 vitest tests run and pass cleanly.
- Vite build completes without TypeScript or bundler errors.

### Milestone 3.5.1 - Match Playback UI Rework

Implemented:
- Redesigned the Match Simulation screen to feature a live match broadcast/dashboard layout.
- Added a "Live Match Stats" panel showing real-time updating statistics for both teams: Possession (midfield control weight proxy), Shots, Shots on Target, Expected Goals (xG), Saves, and Defensive Stops.
- Designed visual "Tug-of-War" comparison bars that scale and transition smoothly, using the theme's green (`bg-pitch-700`) and gray (`bg-stone-300`) colors with a stable layout.
- Added a "Key Moments" panel displaying goals, assisters in parentheses, big chances (visually secondary), and cards (yellow/red cards) with clear and custom icons/badges.
- Integrated fully interactive player buttons in the Key Moments list to allow opening player detail sheets on click.
- Renamed and collapsed the main grouped timeline event comments under a collapsible "Detailed Event Log" section using a native disclosure element, collapsed by default.
- Retained subtle visual pulse highlights on goal key moments when newly revealed.
- Created standalone helper modules `liveMatchStats.ts` and `keyMoments.ts` to separate stat derivation and key moment formatting from the React presentation layer.

Verification:
- Added `liveMatchStats.test.ts` testing possession calculations (smoothing weight), shot counts, xG summation, and future event exclusions.
- Added `keyMoments.test.ts` testing goal/assister parsing, cards formatting, big chances filtering, and sequence de-duplication.
- All 129 tests passed cleanly and the production bundle builds successfully.

### Milestone 3.5 - Player Fitness & Rotation Pressure

Implemented:
- Added dynamic `PlayerStatus` tracking with `fitness` (0-100), player-facing "Readiness" label ("Fresh", "Ready", "Tired", "Fatigued").
- Created `playerFitness.ts` domain module with non-linear `staminaEffect` (square-root scaling helper) to separate early-game low stats.
- Implemented post-match fitness loss formula for outfield starters: `baseLoss = 18`, `staminaReduction = staminaEffect(STA) * 7`, adjusted by tactics risk (+3 aggressive, -2 conservative) and focus (+2 high-tempo, -1 defensive shape), clamped to `[8, 24]`.
- Implemented goalkeeper flat fitness loss of `4` and squad bench/non-playing players loss of `0`.
- Implemented post-matchday recovery updates for all squad players in all simulated clubs: base recovery of `11` for starters and `24` for non-starters, boosted by `staminaEffect(STA) * 4` stamina bonus, medical center level bonus (`medicalCenterLevel * 0.75`), and penalized by age for 30+ (`-(age - 29) * 0.5`), clamped to `[5, 32]`.
- Integrated fitness modifier into match engine: starting fitness mildly scales phase strengths and goalkeeper strength (scaling down from 1.0 to 0.88 for fitness < 55).
- Integrated starting fitness penalty into match-local fatigue modifier calculation `startingFitnessPenalty = clamp((100 - fitness) / 100 * 0.10, 0, 0.10)` to accelerate late-match performance decline.
- Added auto-selection (and AI rotation) fitness penalties to score calculation: `>=85` (0), `75-84` (-2), `60-74` (-15), `<60` (-40).
- Surfaced Readiness in UI:
  - Added Readiness badge to pitch cards on Tactics screen.
  - Added Readiness labels and scores in player slot select options on Tactics screen.
  - Added a clean HSL progress bar to PlayerDetailSheet showing readiness.
  - Added Readiness column to Squad table overview preset, fully sortable by fitness score.
- Fixed misleading comment in `seasonRollover.test.ts` (changed "Relegate player..." to "Promote player...").

Verification:
- Added 14 unit tests in `playerFitness.test.ts` asserting all stamina effect scaling, post-match loss, recovery gain, auto-select penalties, matchday fitness updates, and AI rotation behaviors.
- All 122 tests pass cleanly.
- Build compiles successfully.

### Milestone 3.4.2 - Minor League Rollover UX/Test Cleanup

Implemented:
- Improved postseason Dashboard copy to handle champion and promotion scenarios together cleanly. Explicitly support "Champions! You have won the league and earned promotion."
- Implemented `normalizeLeagueLevel` level clamping helper in `leagueProfiles.ts` to clamp/floor out-of-bounds inputs to `[MIN_LEAGUE_LEVEL, MAX_LEAGUE_LEVEL]` and resolve NaN/non-finite values to level 1.
- Updated all helpers (`getLeagueProfile`, `getLeagueIdForLevel`, etc.) and `generateLeague` generator to use normalized levels.
- Strengthened unit tests to assert actual replacement player ages (rather than just note presence) to ensure newly generated replacement players do not age on day 1.
- Added invalid league level normalization test coverage.

Verification:
- All 108 tests pass cleanly.
- Build compiles successfully.

### Milestone 3.4.1 - League Identity & Season Rollover Stabilization

Implemented:
- Formalised the five division tiers with exact names: Local League, Regional League, National League, Championship, and Premier League.
- Centralised all league level helpers and constants (`getLeagueIdForLevel`, `canPromoteFromLevel`, `canRelegateFromLevel`, spots count) in `leagueProfiles.ts` to ensure consistency.
- Resolved top-division promotion bug where clubs would disappear from the active Premier League by setting Premier League promotion spots to 0.
- Resolved bottom-division relegation bug by setting Local League relegation spots to 0.
- Replaced manual league ID construction with helper calls, ensuring regional-to-local relegations resolve to the correct league ID across active and generated clubs.
- Implemented `sortTableCanonically` shared helper to rank teams consistently across the UI and rollover logic by points, goal difference, goals for, and stable ID.
- Upgraded `rollOverSeason` to be pure by deep cloning mutated club and player data.
- Fixed day-1 aging bug for newly generated/replacement players and opponent clubs by exempting them from rollover checks during their initial creation season.
- Restructured notes cleaning to preserve veteran decline messages.
- Improved postseason Dashboard review card to cleanly detail sorted ranks and reward timings while removing mojibake risk.

Verification:
- Added comprehensive unit tests in `seasonRollover.test.ts` covering immutability, sorting stability, aging exemption, note preservation, and Premier/Local league limits.
- All 107 tests passed and production build compiles cleanly.

### Milestone 3.4 - League Ecosystem & Transfer Foundation

Implemented:
- Added soft **Division Strength Bands** (target OVR range, potential range, typical wage/value range, facility caps) for Tiers 1-5 to keep divisions balanced.
- Assigned five **AI Club Archetypes** (`ambitious`, `stable`, `youth_development`, `veteran`, `financially_cautious`) and initialized them for all opponent clubs.
- Implemented **Season Rollover Logic** triggered at season completion, paying out placement prize money and executing promotions/relegations.
- Added **Aging & Physical Decline** which increments player age and declines physical stats (`ACC`, `STA`, `PHY`) by 1-2 points annually for players 30+, with small random decays for technical/mental stats.
- Added **AI Squad Churn & Refresh** to retire players >= 35, list/remove outliers (players above division quality band), and recruit young replacements (age 17-20) to maintain squad sizes of >= 16.
- Introduced **Player Transfer Intent** tracking (`isListed`, `askingPrice`, `listingReason`) to fuel the transfer pool.
- Built a **Transfer Market Screen** placeholder showing Free Agents and Listed Players with approach buttons disabled.
- Added **In-Season Tactical Reactivity** letting AI clubs adjust their tactics/risk dynamically based on recent match form.

Balance notes:
- Division bands prevent infinite AI power inflation over multiple seasons (avoiding the Red Queen effect).
- AI squads grow/decay toward their division caps rather than grinding weekly like the human player.

Known limitations:
- Human player cannot negotiate contracts or bid on listed players yet (buttons disabled).
- Relegated clubs have higher financial pressure but cannot go bankrupt.

Verification:
- Added comprehensive unit tests in `seasonRollover.test.ts`.
- Verified all 100 tests pass and the production build completes successfully.

### Milestone 3.3 - Match Engine Stat Depth + Contextual Duels

Implemented:
- Added outfield-only `STA`, `DRI`, and `POS` stats to players, generation, potential stats, stat definitions, squad tables, player detail sheets, OVR/POT summaries, and role development priorities.
- Added compatibility-safe stat access helpers for old/new stat reads.
- Added contextual duel recipes for different chance types, so important actions are no longer simple one-stat checks.
- Added lightweight match-local fatigue logic, with greater late-match penalties for low-stamina players under aggressive/high-tempo tactics.
- Wired contextual duels into chance creation and chance quality.
- Updated tactical identities so `wide_play`, `fast_breaks`, `sustained_pressure`, `control`, `tiki_taka`, and `defensive_shape` reference the new stats meaningfully.
- Fixed nested button warnings in squad stat headers while preserving sorting and stat tooltip behavior.

Balance notes:
- Baseline match scoring improved from the very low 3.2 level.
- Stronger teams still win more often.
- Aggressive tactics increase danger for both teams.
- Defensive setups reduce total goals and increase draw likelihood.
- Early simulation audit suggests `POS` may be very powerful in defensive blocks, especially against fast breaks.

Known limitations:
- No substitutions.
- No injuries.
- No persistent fatigue between matches.
- No live in-game tactical changes.
- AI clubs are still mostly static across a season.

Verification:
- `npm test` passed with 91 tests.
- `npm run build` passed in the DEV implementation report.
- Browser smoke test passed in the DEV implementation report.

### Milestone 3.2 - Tactical Match Engine Realism Pass

Implemented:
- Added formations: `5-3-2`, `3-4-3`, `3-4-2-1`.
- Added tactical focuses: `control`, `tiki_taka`.
- Added tactical profile data for formations, focuses, and risk levels.
- Refactored phase strength calculations to use actual lineup slot positions and position-fit penalties.
- Moved chance weighting, chance creation, and chance quality logic into tactical match effect helpers.
- Updated goal probability so shooter vs goalkeeper quality matters more.
- Added deterministic match balance diagnostics.
- Updated tactics UI preview with primary stats, likely chance types, and vulnerabilities.

Balance notes:
- Tactical effects are intentionally conservative.
- Formation/focus/risk choices now alter chance profile, chance volume, and match risk.
- Defensive setups reduce total goals.
- Aggressive setups increase chance volume and opponent danger.

Known limitations:
- No live tactical changes.
- Balance still prototype-level and needs season-level observation.

### Milestone 3.1 - UI Cleanup + Player Sheet Quality

Implemented:
- Player names open the shared detail sheet from dashboard squad preview, squad tables, match report, timeline, tactics cards, and bench/player controls where practical.
- Added sortable squad, league, and match rating tables.
- Added squad filters for position, cap status, and age group.
- Added stat definitions/tooltips for every stat code.
- Added visual progress bars for player development rows.
- Shortened the match report development panel.
- Moved New Game into a secondary Settings menu with confirmation.

Known limitations:
- Native select option text cannot itself be clickable, so selected-player detail buttons remain the practical target in tactic controls.

### Milestone 3.0 / 3.0.1 - Player Development + Tactical Familiarity

Implemented:
- Added cumulative match XP, training XP, last XP gained, stat progress, recent growth, and development notes.
- Added rating-aware match XP.
- Added squad training XP after matchdays.
- Added role-relevant stat growth with age curve modifiers, facility caps, potential caps, and untapped potential.
- Added tactical familiarity using stable tactic keys based on formation, focus, and risk level.
- Surfaced development in match report, squad development view, player detail sheets, and tactics screen.
- Reworked match report development into one clearer panel.
- Added recent stat growth and cap indicators to player sheets.

Known limitations:
- Development is conservative.
- Players currently tend to grow one stat per XP application, which may need a later distributed-growth pass.
- Staff quality is still neutral.
- AI clubs do not visibly develop yet.

### Milestone 2.8 / 2.8.1 - Player Details + Cleaner Timeline

Implemented:
- Added player summary helpers for OVR, estimated POT, form, average rating, last rating, appearances, goals, assists/key passes, and match rating history.
- Added reusable clickable player name UI.
- Added shared player detail sheet.
- Updated match report ratings with club identity, own/opponent distinction, filters, and richer player context.
- Reworked squad preview into preset table views: Overview, Attributes, Performance, Contract, and Development.
- Grouped raw match events into cleaner display timeline highlights.
- Added collapsed detailed raw event log for debugging.

Known limitations:
- Timeline copy remains intentionally lightweight and may need richer grammar polish.

### Milestone 2.5 / 2.6 / 2.7 - Match UX, Tactics, Ratings

Implemented:
- Added position fit logic with `natural`, `secondary`, `related`, `poor`, and `invalid` fit levels.
- Applied out-of-position penalties inside phase strength calculations.
- Upgraded tactics screen into a pitch-based lineup view.
- Added tactical impact preview for formation, focus, and risk.
- Added live match playback with minute counter, score reveal, speed control, and skip result.
- Added match report feedback based on xG, chance routes, and match problems.
- Added player ratings and top/underperformer sections.

Known limitations:
- No substitutions.
- No injuries/cards system beyond early placeholders.

### Milestone 2.0 - Playable Matches

Implemented:
- Added opposition report flow.
- Added match preparation with formation, tactical focus, risk level, and starting XI.
- Added match simulation and match report.
- Added rewards for money, fans, reputation, player XP, and tactical familiarity.
- Updated league table after played matchdays.

Known limitations:
- Match engine was still early and simpler than the current 3.x model.

### Milestone 1.0 - Generated World

Implemented:
- Scaffolded Vite, React, TypeScript, Tailwind, Zustand, and Vitest.
- Added domain types and generation functions.
- Generated game state with one player club, nine opponents, 18-player squads, a 10-team league, and 18 match home/away fixture list.
- Added Zustand game store.
- Built dashboard, league table, and squad preview UI.
- Added early generation test coverage.

Known limitations:
- No match engine.
- No save/load.
- No transfers.
- No training.
- No season advancement beyond generated schedule.

## Future Patch Note Convention

Use this structure for each milestone:

```md
### Milestone X.Y - Short Title

Implemented:
- ...

Balance notes:
- ...

Known limitations:
- ...

Verification:
- ...
```
