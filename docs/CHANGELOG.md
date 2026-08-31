# Changelog

All notable changes to FarmPilot are recorded here.

Format based on [Keep a Changelog](https://keepachangelog.com/).
Versioning: `0.x` during the build, `1.0.0` at submission.

**Rule for the team:** every pull request adds a line under
`[Unreleased]`. A PR with no changelog entry is not merged. When a stage
completes, `[Unreleased]` is renamed to that version with a date and a
fresh `[Unreleased]` is opened above it.

---

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

---

## [v0.8.0] - 2026-08-30

### Changed
- Phase 8: Benchmark Data Swap
- Replaced all PLACEHOLDER benchmarks in `002_seed_benchmarks.sql` with real, commercial-scale field data (Ejisu, 2026).
- Deflated new 2026 data to the 2018 base year so that the universal 4.50 `price_multiplier` scales both the old MoFA baseline and new data perfectly, preserving Rule 1 (zero code changes).
- Authored ADR-011 documenting the conscious decision to benchmark smallholders against commercial-scale efficiency as an aspirational ceiling, rather than artificially inflating the data.
- Authored ADR-012 documenting the price multiplier deflation strategy.
- Verified that the "Provisional Notice" automatically clears from the Report UI since no sources contain the word PLACEHOLDER.

## [v0.7.0] - 2026-08-30

### Added
- Phase 7: Dashboard
- Implemented robust farm-level view (`getFarmSummary`) with totals (acres, spending, estimates) safely rolling up to prevent N+1 and duplicate additions.
- Built a Crop Comparison table (`getCropSummary`) highlighting true "Cost Per Acre" across all crops.
- Added smart Season Cards that dynamically sort active seasons first, descending year, then window.
- Included 3 context-aware empty states ("No seasons", "Seasons but no costs", "Costs but no estimates") to intelligently prompt users to track or generate an estimate.
- Implemented one-tap "Generate estimate" action directly from the season card shortcut.

## [v0.6.0] - 2026-08-30

### Added
- Phase 6: The Report Screen
- Completed `EstimateReport.tsx` with a premium header layout and "Where Your Money Goes" breakdown.
- Added intelligent, data-driven "Where You Can Save" advice cards, highlighting flagged expenditures based on potential savings.
- Included full print stylesheet (`print:` classes) for physical black-and-white A4 printing.
- Added responsive mobile layouts and jump links to ensure critical sections remain highly accessible on devices down to 360px wide.

## [0.5.0] - Estimate Engine Wired (Phase 5) - 2026-08-30

### Added
- Integrated `generate_estimate` API with `SeasonDetail`'s "Generate Estimate" button.
- Loading and error state management during estimate generation.
- Dynamic route navigation to `/report/:estimateId` upon successful estimate generation.

### Changed
- Replaced topological node map with precise interactive SVG vector map (`docs/gh.svg`) in `FarmSetup.tsx`.
- Renamed route `/estimate/:seasonId` to `/report/:estimateId`.

### Fixed
- Tab visibility change triggering accidental logouts in `useAuth.tsx`.

---

## [0.4.0] - Recording Flow Complete (Phase 4) - 2026-08-30

### Added
- Created `src/api/seasons.ts` and `src/api/costs.ts` for database operations.
- Full season recording shell with "Close Season" harvest input flow.
- Configurable `CATEGORIES` mapping mapping to professional SVGs, user-friendly labels, and smart unit suggestions.
- `AddCostForm` featuring a two-path smart dual-entry UI (total-only vs rate).
- Auto-calculation of amount before save in detailed (rate) mode.
- Native mobile number pad input enabled for all cost entry fields via `inputMode="decimal"`.
- `CostList` rendering categorized list of costs, smart empty states, and dynamic optimistic updates.

### Changed
- Converted cedis entries to pesewas at the client edge synchronously for database storage.
- Fixed `database.types.ts` TS error by manually enforcing type safety across the frontend API.

---

## [0.3.0] - Auth & Routing (Phase 2)

### Added
- Created `src/api/auth.ts` handling phone normalisation and synthetic emails.
- Auth Context & Provider wrapping the app cleanly, fetching session natively.
- Responsive SignIn & SignUp pages with 024 phone logic validation.
- `AppShell`, `ProtectedRoute`, and `PublicRoute` mapping.

---

## [0.2.0] — Foundation — 2026-08-30

### Added
- Vite/React/TypeScript project scaffolding
- `/src` directory tree (`api`, `components`, `hooks`, `lib`, `pages`) matching SDD
- TanStack Query data fetching layer (`/_test` connectivity page)
- Ghana mobile number validation utility
- `tailwind@4` configuration

### Changed
- Refactored `useFarm` to use TanStack Query instead of `useEffect`

### Fixed
- Fatal `generate_estimate` bug with temp table transactions
- Missing `WITH CHECK` clause on `estimate_lines` RLS policy

---

## [0.1.0] — Design phase — 2026-08-30

### Added
- Product Requirements Document (`FarmPilot_PRD.md`)
- System Architecture / Design Document (`FarmPilot_SDD.md`)
- Database schema, migration `001_schema.sql` — 10 tables, 4 enums,
  RLS policies, `generate_estimate()` function, `v_estimate_report` view
- Placeholder benchmark seed, migration `002_seed_benchmarks.sql`
- Profiles, sync columns, rollup views, migration `003_profiles_and_views.sql`
- Architecture decision log (`DECISIONS.md`)
- Build prompt library (`prompts/`)

### Changed
- Auth model from email-only to **phone-first** with email as a linked
  alternative — see ADR-006
- Estimate scope clarified: one estimate per **season** (farm + crop +
  year + window), with farm-level and crop-level rollups added as views —
  see ADR-007

### Removed
- Python/FastAPI calculation service specified in the original proposal —
  see ADR-001

---

## Version plan

| Version | Meaning | Target |
|---|---|---|
| 0.1.0 | Design complete | Day 0 |
| 0.2.0 | Foundation — schema live, app scaffolded | Day 1 |
| 0.3.0 | Auth working | Day 3 |
| 0.4.0 | Recording flow complete | Day 5 |
| 0.5.0 | Estimate engine wired | Day 9 |
| 0.6.0 | Report and dashboard | Day 10 |
| 0.7.0 | Real benchmark data loaded | Day 12 |
| 0.8.0 | Offline capture | Day 13 (if time) |
| 0.9.0 | Localisation | Day 13 (if time) |
| 1.0.0 | Submitted | Day 14 |
