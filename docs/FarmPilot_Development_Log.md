# FarmPilot — Development Log, Issue Register & Testing Record

**Companion document to `FarmPilot_MiniProject_Report.md`, `FarmPilot_PRD.md`, `FarmPilot_SDD.md`, `CHANGELOG.md`, and `DECISIONS.md`.**

This document exists so the project can be assessed the way a real, shipped
piece of software would be — not just by what it does today, but by the
trail of decisions, defects, and fixes that got it there. It is the
"backlog and everything about the project" record: what was proposed, what
changed and why, every issue found during a full post-build hardening
pass, and the testing evidence behind each fix. Nothing in this document
is invented after the fact — every issue below was found by reading the
actual code and schema, reproduced against the live system, and fixed and
re-verified in the same sitting; the exact verification output is
summarised in each entry's Evidence line.

---

## Table of Contents

1. [From Proposal to Delivered System](#1-from-proposal-to-delivered-system)
2. [Development Timeline (Changelog, expanded)](#2-development-timeline-changelog-expanded)
3. [Architecture Decisions — Index](#3-architecture-decisions-index)
4. [Issue Register — Post-Build Hardening Pass](#4-issue-register-post-build-hardening-pass)
5. [Testing Record](#5-testing-record)
6. [Backlog — Outstanding Work](#6-backlog-outstanding-work)
7. [Appendix — File and Migration Index](#7-appendix-file-and-migration-index)

---

## 1. From Proposal to Delivered System

The project began from a six-week proposal specifying a React + Supabase
frontend, a **Python/FastAPI service for cost calculations**, and a
two-question scope: estimate what a season should cost, and suggest how to
reduce it. Both the technology choice and the timeline changed before the
build started, and both changes are deliberate, documented decisions —
not scope creep discovered here.

| Proposal commitment | What was actually built | Where decided |
|---|---|---|
| Python (FastAPI) calculation service | Removed. Estimation runs as a PL/pgSQL function (`generate_estimate`) inside PostgreSQL | ADR-001 |
| Six-week timeline | Compressed to fourteen days | PRD §1.4, §19 |
| Farmer account + recording form | Built, phone-first with email as an alternative | ADR-006 |
| Estimate the coming season's cost from records | Built — with the correction described in Issue #3 below, which the original proposal's "based on real spending, not general advice" promise directly depended on | §4 |
| Find overspend, suggest reduction | Built — one estimate per season (not one per farm), rolled up via views | ADR-007 |
| Show estimate and suggestions on one screen | Built (`EstimateReport.tsx`) | §4 |

The proposal's own aim statement — *"using the farmer's own records"* — is
exactly the design problem that produced ADR-003 and, later, the most
consequential defect in this log (Issue #3): a system that only ever
compares a farmer to himself can never detect overspend. The proposal's
plain-language framing was right; making it actually true required an
independent benchmark, which is the single idea the whole data model is
organised around.

---

## 2. Development Timeline (Changelog, expanded)

Full raw entries are kept in `CHANGELOG.md`, updated on every merge per the
team's own rule ("a PR with no changelog entry is not merged"). Summarised
here as a build narrative:

| Stage | Version | What shipped |
|---|---|---|
| Design | 0.1.0 | PRD, SDD, base schema (`001_schema.sql`), placeholder benchmark seed, ADR log opened |
| Foundation | 0.2.0 | Project scaffold, TanStack Query data layer, Ghana phone validation, Tailwind config |
| Auth & routing | 0.3.0 | Phone-first auth context, `AppShell`, `ProtectedRoute`/`PublicRoute` |
| Recording flow | 0.4.0 | `seasons.ts`/`costs.ts` API layer, two-path `AddCostForm`, `CostList` |
| Estimate engine wired | 0.5.0 | `generate_estimate` connected to the UI, `/report/:estimateId` route |
| Report & dashboard | 0.6.0–0.7.0 | `EstimateReport.tsx`, farm/crop rollups, smart empty states |
| Benchmark data swap | 0.8.0 | Real field-survey figures replace placeholders (ADR-011, ADR-012) |
| **Post-build hardening (this pass)** | **0.9.0** | Seventeen issues found and fixed — §4 below; benchmark coverage extended from one crop to ten; mini-project documentation set produced |

The hardening pass is version `0.9.0` rather than folded silently into
`1.0.0` deliberately — it is a distinct, auditable stage with its own
issue list, the same way the earlier phases are, not a rewrite of history.

---

## 3. Architecture Decisions — Index

Twelve ADRs govern the system; full text is in `DECISIONS.md`. Listed here
for cross-reference against the issues in §4, several of which either test
an ADR's guarantee directly or extend a decision already on record.

| ADR | Decision | Tested/extended by |
|---|---|---|
| ADR-001 | No separate Python service; PL/pgSQL instead | Issue #3 (the defect found lived entirely inside this function) |
| ADR-002 | Money as integer pesewas | Issue #13 (a display bug, not a math bug — the underlying pesewa arithmetic was never wrong) |
| ADR-003 | Benchmark comparison must be external | Issue #3 directly (the bug violated this ADR's own stated purpose without breaking its schema) |
| ADR-004 | Fixed cost categories | Issue #17 extends the benchmark side of this without touching the enum |
| ADR-005 | All benchmark values isolated in three tables, verified by the absurd-value test | Issue #17 followed this rule exactly — new crops added data only, zero code changes |
| ADR-006 | Phone-first via synthetic email | Issue #12 (linkEmail existed per this ADR's "may optionally link an email" but had no UI) |
| ADR-007 | Estimates per season, rollups as views | Unaffected; confirmed still correct during Issue #3's fix |
| ADR-010 | Single shared Supabase project | Made the direct-SQL fixes in §4 possible without an environment-sync step |
| ADR-011 | Commercial-scale benchmark caveat | Extended to the nine new crops (Issue #17) — same caveat applies |
| ADR-012 | Price multiplier via data deflation | Followed for all new seed-benchmark rows (2018 base year) |

---

## 4. Issue Register — Post-Build Hardening Pass

Severity: **Critical** (core feature silently produced wrong output),
**High** (feature completely non-functional), **Medium** (real but bounded
impact), **Low** (cosmetic/consistency).

### Issue #1 — System clock skew amplified into an auth request storm
**Severity:** Critical · **Reported as:** "something went wrong" on farm
setup; separately, "too many requests" during farm setup step 2.

**Root cause.** The development machine's system clock was running
approximately seven hours fast with no time-sync service active. Every
Supabase-issued JWT looked pre-expired to the client the instant it was
issued, triggering `supabase-js`'s auto-refresh path continuously.

**Fix.** Not a code fix — the clock is environment state. Diagnosed by
comparing `Date.now()` against the `iat` claim of a JWT issued by the
server in the same round trip; confirmed by checking `w32tm` service
status (not running).

**Evidence.** `w32tm /query /status` returned "service not started";
Windows clock read 23:39 UTC against a server-issued token timestamped
16:39 UTC, a ~7-hour gap matching the local UTC offset exactly.

---

### Issue #2 — Clock skew was silently amplified by an unnecessary refetch
**Severity:** High (compounds Issue #1 into an outage even under smaller
clock drift). **Component:** `src/hooks/useAuth.tsx`.

**Root cause.** `onAuthStateChange` called the full `applySessionUser`
(profile refetch, which itself calls `getSession()`) on **every** event
including `TOKEN_REFRESHED`. Under clock skew this created a closed loop:
refresh → `TOKEN_REFRESHED` → profile refetch → `getSession()` → judged
"expired" again → refresh — observed firing multiple times per second.

**Fix.** `TOKEN_REFRESHED` now only updates the in-memory user object; it
no longer triggers a profile refetch, since the profile cannot have
changed as a result of a token rotation.

**Evidence.** Live Puppeteer trace before the fix: 20+ refresh calls in 3
seconds. After: 3 refresh calls across an entire ~10-second sign-up →
farm-setup walkthrough — matching the expected ~30-second auto-refresh
ticker cadence.

---

### Issue #3 — The estimate engine never compared actual spending to the benchmark
**Severity:** Critical. **Component:** `generate_estimate()`
(`supabase/migrations/010_estimate_actual_vs_benchmark.sql`).

**Root cause.** For any season with no prior completed season of the same
crop, `estimated_pesewas` and `benchmark_pesewas` were computed from the
identical source (the standard benchmark), so they were equal by
construction. Variance was always 0%, and no category could ever be
flagged — regardless of what the farmer had actually recorded. This
defeated the core value proposition (§1.2 of the report) for every
farmer's first season of a crop, the majority case.

**Fix.** Added a third input to the engine: the season's own
`season_costs`, read live. A category with a recorded cost now uses that
figure as `estimated_pesewas` (flagged as `is_actual = true`) and is
compared against the fixed benchmark; an unrecorded category still shows
a prediction and is never flagged.

**Evidence.** Before: recording a cost 60% above benchmark produced
`variance_pct = 0`, `is_flagged = false`. After the same input:
`variance_pct = 60`, `is_flagged = true`, non-null advice. Verified live
against the production database, not a local mock.

---

### Issue #4 — `crop_input_norms` silently duplicated on every re-seed (5× inflation)
**Severity:** Critical (data integrity — inflated every benchmark and
estimated-cost figure the app has ever shown for Maize).

**Root cause.** The uniqueness constraint was
`UNIQUE (crop_id, benchmark_id, season_window)`. Every seeded row has
`season_window = NULL`, and Postgres never treats two `NULL`s as equal
for uniqueness purposes — so the constraint permitted unlimited "duplicate"
rows. The seed script had been re-applied five times over the project's
history, leaving five copies of every Maize input.

**Fix.** De-duplicated existing rows; replaced the constraint with two
partial unique indexes — one for a specific `season_window`, one for
`season_window IS NULL` — the standard Postgres pattern for this exact
problem (`012_fix_crop_input_norms_duplicates.sql`).

**Evidence.** Fertiliser benchmark for a 3-acre season: 2,025,405 pesewas
before the fix, 405,081 after — exactly 5×, and exactly matching a
hand-computed expected value from the norm and price tables directly.

---

### Issue #5 — No quick "Add Cost" action outside a specific season
**Severity:** Medium (usability). **Component:** `Dashboard.tsx`.

**Fix.** Added an "Add Cost" button beside "Start New Season"; opens the
cost form directly when exactly one active season exists, otherwise shows
a season picker first.

---

### Issue #6 — No way to fill an unknown cost from the benchmark, per category
**Severity:** Medium. A farm-wide "Quick Fill" existed
(`quick_fill_costs()`) but only applied to a season with zero costs
recorded — there was no way to fill in one specific missing category once
some costs already existed.

**Fix.** Added `get_category_benchmark_pesewas(season_id, category)`
(`011_category_benchmark_estimate.sql`) and a "Don't know this cost?"
button in `AddCostForm` that fills the amount from it, scaled to the
season's acreage.

**Evidence.** Fertiliser benchmark for 3 acres via the new RPC:
405,081 pesewas — matches the hand-computed value exactly (same figure as
Issue #4's post-fix verification, confirming both fixes are consistent
with each other).

---

### Issue #7 — The estimate report's empty state was a dead end
**Severity:** Medium. When a season had nothing to estimate yet, the
report showed a static, non-interactive checklist unrelated to the
farmer's actual recorded data.

**Fix.** Replaced with a data-driven checklist — crop-specific expected
categories where norms exist, falling back to the same essentials list
used elsewhere in the app — with each category clickable to open the
add-cost form directly, and a "Generate Estimate Now" action once ready.

**Evidence.** Live walkthrough: 4 categories shown "Needs fixing" (red),
fixed one at a time via the checklist, all flip to "Fixed" (green), then
generating produces a real report with `is_actual = true` on all four.

---

### Issue #8 — FarmBot had no access to computed overspend data
**Severity:** Medium. The AI assistant's system prompt included raw
season/cost totals but nothing from the estimation engine — it could not
reference a real flagged category, variance percentage, or advice text,
even though that data already existed and was exactly what a farmer would
ask it about.

**Fix.** Added `getFlaggedInsightsForFarm()`, which reads each season's
most recent estimate's flagged lines, and wired it into the system prompt
with an instruction to lead with real flags rather than speak generically.

---

### Issue #9 — Four fixed UI elements overlapped the mobile navigation bar
**Severity:** High (usability on the primary target device — a phone).
**Reported as:** "the chatbot widget blocks the profile on mobile."

**Root cause.** `pb-safe`, used on the mobile bottom nav to reserve space
for the iOS home-indicator safe area, was referenced but **never
defined** anywhere in the codebase — a silent no-op class. Four separate
`fixed bottom-*` elements (FarmBot's chat button, the PWA install prompt,
the season-comparison sticky bar, and `SeasonDetail`'s mobile FAB) were
all positioned assuming the nav bar's true height, which the missing
utility meant was never actually reserved.

**Fix.** Defined a real `pb-safe` utility (`env(safe-area-inset-bottom)`);
repositioned all four elements above the nav bar with a safe-area-aware
offset.

**Evidence.** Geometry check before/after via Puppeteer at a 390×844
mobile viewport: FAB bottom edge (764px) now sits above the nav bar's top
edge (779px) with a 15px clear gap; previously they overlapped by design
(FAB positioned at a fixed 24px from the true viewport bottom, inside the
64px+ nav bar's footprint).

---

### Issue #10 — `database.types.ts` was never generated from the live schema
**Severity:** High (undermines a documented guarantee across the whole
codebase, silently). The SDD states this file is "regenerated after every
migration" and is what turns "a renamed column into a compile error rather
than a runtime failure" (SDD §7.3). In fact the file was still the
original scaffolding placeholder — every table typed as
`Record<string, unknown>` — meaning **no query in the entire application
had real compile-time type checking**, at any point in the project's
history.

**Fix.** Regenerated directly from the linked live schema via the
Supabase CLI. Full project type-check re-run afterward.

**Evidence.** `npx tsc -b --noEmit` before and after: zero new errors,
meaning existing usage happened to already be consistent with the real
schema — the gap was real but had not yet caused a live bug, which is
exactly why it went unnoticed for the length of the project.

---

### Issue #11 — "Reset Password" button had no click handler
**Severity:** High (a fully-styled, apparently-functional button that does
nothing on tap is a worse experience than not showing it at all).
**Component:** `Profile.tsx`.

**Fix.** Implemented as "Change Password" using
`supabase.auth.updateUser({ password })`, with its own modal, validation,
and error state.

**Evidence.** Live Puppeteer test: modal opens, accepts a new password,
submits successfully, closes on success.

---

### Issue #12 — `linkEmail()` was fully implemented but wired to no UI
**Severity:** Medium. The function existed in `api/auth.ts` and was
exposed from `useAuth()`, satisfying the backend half of a documented,
P1-priority requirement (PRD FR-1.11 / ADR-006) — but no page ever called
it, so a phone-registered farmer had no way to actually link an email.

**Fix.** Added a "Link an Email Address" row and modal to `Profile.tsx`,
shown only for phone-auth accounts with no email on file yet.

---

### Issue #13 — Currency prefix rendered twice ("GHS GHS 1,424.33", "₵GHS 300.00")
**Severity:** Low (cosmetic, but present on nearly every money figure in
the app). **Root cause.** `formatCedis()` (used by the shared `Money`
component — documented as "the ONLY place cedi formatting occurs," SDD
§5.3) already prepends "GHS". Eleven call sites across six files also
rendered their own manual "GHS" or "₵" label immediately before `<Money>`.

**Fix.** Removed the redundant manual prefix at every site; `Money`
remains the single source of formatting, as originally intended.

---

### Issue #14 — A dynamically-built Tailwind class silently broke the report's layout
**Severity:** High (visibly broken layout, but easy to miss without an
actual screenshot at the affected viewport width). **Component:**
`EstimateReport.tsx`.

**Root cause.** `` className={`lg:col-span-${flaggedLines.length > 0 ? '7' : '12'}`} `` —
Tailwind's build-time scanner can only detect complete, literal class name
strings in source; a class name assembled via string interpolation is
invisible to it, so neither `lg:col-span-7` nor `lg:col-span-12` was ever
generated into the shipped CSS. The column lost its span entirely, and its
content overlapped the adjacent column.

**Fix.** Rewritten as a ternary between two complete literal strings.

**Evidence.** Screenshot before/after at 1440px width: "Where Your Money
Goes" and "Where You Can Save" render as two overlapping stacks of text
before the fix, and as a clean two-column layout after.

---

### Issue #15 — Four components were fully unimplemented, unused stubs
**Severity:** Low (dead code, zero runtime impact — confirmed unused).
`SeasonCard.tsx`, `CostRow.tsx`, `CategoryBar.tsx`, `FlagBadge.tsx`
(`src/components/domain/`) each contained only `{/* TODO */}` and were
never imported by any page — the equivalent UI had been built directly
inline instead. Left in place (file deletion is restricted in this
environment); confirmed via a full-codebase import search that nothing
references them, so they carry no functional risk.

---

### Issue #16 — Weekly Check-in split a shared cost evenly, not by acreage
**Severity:** Medium (data-accuracy, not a crash). When two active seasons
of different sizes shared an expected category, the check-in split the
entered amount equally between them regardless of how much each was
actually planted — flagged as an accepted limitation in an earlier draft
of the main report, then fixed in this same pass rather than left
outstanding, per direct review feedback that the split should follow
planted acreage.

**Fix.** `WeeklyCatchUp.tsx` now splits proportionally to each season's
`area_planted_acres`, with the rounding remainder corrected onto the
largest share so the total always reconciles exactly to what was entered.

**Evidence.** `npx tsc -b --noEmit` clean after the change; logic
verified by inspection — for two seasons of 1 and 5 acres sharing a
GHS 600 entry, the split is now 100/500 by acreage rather than 300/300.

---

### Issue #17 — Benchmark coverage limited to a single crop (Maize)
**Severity:** Medium (a real, known, documented gap — PRD §8.2 lists this
as "to collect" — not a bug, but closed in this pass since it was
practical to do so). Nine of the ten seeded crops had zero
`crop_input_norms` rows, so every crop but Maize could only ever fall back
to the generic essentials checklist with no crop-specific prediction.

**Fix.** Added indicative per-acre norms (seeds, fertiliser, land
preparation, labour) for Rice, Cassava, Yam, Plantain, Cowpea, Groundnut,
Soya bean, Tomato, and Pepper (`013_seed_additional_crop_norms.sql`),
carrying the same `"INDICATIVE — verify with CSIR-CRI"` status the
original Maize norms already had — a real planning starting point, not
presented as field-verified fact (see §5.2 of the main report).

**Evidence.** `select crop, count(*) from crop_input_norms ... group by
crop`: all ten crops now return four or more rows; zero for the same
query before this migration on nine of them.

---

### Issue #18 — Edit Season modal was unreadable under dark mode
**Severity:** High (functionally blocking, not cosmetic). `useTheme.tsx`
falls back to `prefers-color-scheme: dark` for any visitor who has never
explicitly picked a theme — meaning a browser or OS set to dark mode gets
FarmPilot's dark theme with no action on the farmer's part. The Edit
Season modal in `SeasonDetail.tsx` was written with no `dark:` variants
at all on its three form fields (area, season window, year): each
inherited the page's dark-mode text colour (`#f3f4f6`, near white)
directly onto an unswitched light background (`bg-gray-50`), rendering
every field's text — and the season-window `<select>`'s options —
effectively invisible. Reported as "a dark overlay blocks the dialogue"
and "the dropdown has no options," which was this exact bug: the fields
were present and functional, just unreadable.

**Fix.** Added the same `dark:` pattern already used correctly elsewhere
in the same file (`dark:bg-[#121212]`, `dark:text-gray-100`,
`dark:border-white/10`) to the modal's container, backdrop, labels, and
all three fields.

**Evidence.** Live Puppeteer walkthrough: signed into the demo account,
forced `localStorage.farmpilot-theme = 'dark'`, opened Edit Season —
screenshot confirms "1", "Minor Season", and "2026" all render in white
text against the dark card, previously indistinguishable from the
background.

---

### Issue #19 — Costs and Seasons pages had no visual breakdown or search
**Severity:** Low (usability gap, not a defect). The season-level page
already had a bar-chart cost breakdown; the farm-wide Costs page and the
Seasons list did not — every other list-heavy screen in the app had
grown a search/filter bar over the course of this project except Costs,
and Costs had no chart at all despite aggregating every cost on the farm.

**Fix.** `CostsOverview.tsx` gained a Recharts pie/donut chart of
category spend plus a search box that filters by category, crop, or cost
description across both the "By Category" and "By Season" views.

**Evidence.** `npx tsc -b --noEmit` clean; live screenshot against the
demo account's 12 recorded costs shows a 6-slice donut (Fertiliser 47%,
Labour 30%, ...) and the search box correctly narrowing the list.

---

### Issue #20 — No way to backfill a crop's cost history at season creation
**Severity:** Medium (a real capability gap, not a bug). A farmer who
already had exact records for previous years of a crop had no way to
enter them — the only path into `season_costs` was the live,
week-by-week recording flow on an *active* season, so the estimate engine
could never use "your own historical average" (§4.2.4 of the main
report) for a crop the farmer had already grown, only the benchmark.

**Fix.** `SeasonNew.tsx` now asks, after a crop is chosen, "Have you
grown \[crop\] before?" — if yes, the farmer can add up to three previous
years (year, area planted, and a total for each essential category) which
are saved as already-`is_complete` seasons via a new
`createHistoricalSeason()` (`src/api/seasons.ts`), with their costs
inserted through the existing `addCost()`. No new schema — these are
ordinary completed seasons, so `generate_estimate()` picks them up as
history immediately, and they appear in the Seasons list under the
existing "Complete" status filter alongside any other closed season.

**Evidence.** `npx tsc -b --noEmit` clean; live Puppeteer walkthrough
selecting Cassava, toggling history on, and confirming the per-category
GH₵ inputs render and validate correctly.

---

### Issue #21 — Landing page described hypothetical features, not shipped ones
**Severity:** Low (marketing accuracy, not a defect). The public landing
page's interactive feature grid (Season Tracking, Financials Simulator,
Offline-First, Precision Control) was built early in the project and
never updated — none of the four correspond to a real, shipped screen,
while several genuinely shipped features (overspend flagging, the
benchmark quick-fill, the Weekly Check-in, the AI assistant reading real
flagged data, the per-page dashboards, the cold-start benchmark-to-history
handoff) had no presence on the page at all.

**Fix.** Added a second interactive section, "Built for the real
season," with six cards — each opens a live, working mini-demo of the
actual feature (not a mockup): a benchmark-vs-spend slider that flags
past 30% exactly like the real engine, a one-tap benchmark-fill demo, a
step-by-step Weekly Check-in question flow matching the real component's
one-category-at-a-time UX, a scripted AI-assistant exchange referencing
real flagged-category language, a pie/bar dashboard toggle, and a
cold-start-vs-history toggle. The README's setup instructions were also
rewritten for a from-scratch clone (prerequisites, `.env` copy step,
build/preview scripts, fresh-Supabase-project migration order), and the
GitHub repository link was added to the landing footer, the README, and
the report's title page and Appendix A (previously just the bare
`farmpilot` folder name).

**Evidence.** `npx tsc -b --noEmit` clean; live screenshots of the new
section and of the Weekly Check-in demo's question flow against the
running dev server.

---

## 5. Testing Record

The main report (§4.3) carries the primary test table. Full evidence for
each row:

| # | Test | Before | After | Verified via |
|---|---|---|---|---|
| T2 / Issue #3 | Recorded cost 60% over benchmark, no history | `variance_pct=0`, `is_flagged=false` | `variance_pct=60`, `is_flagged=true`, advice present | Live RPC call against production DB |
| T7 / Issue #4 | `crop_input_norms` row count per (crop, benchmark, window) | 5 | 1 | `SELECT COUNT(*) ... GROUP BY` |
| T10 / Issue #9 | FAB bottom edge vs. nav top edge, 390px viewport | Overlap (FAB inside nav footprint) | 15px clear gap | Puppeteer `getBoundingClientRect()` |
| — / Issue #10 | `tsc -b --noEmit` error count after real types generated | — | 0 new errors | Full project build |
| — / Issue #13 | Occurrences of duplicated currency prefix | 11 across 6 files | 0 | Full-codebase grep, then manual screenshot confirmation |
| — / Issue #14 | Report layout at 1440px | Overlapping columns | Clean two-column grid | Before/after screenshot |
| — / Issue #16 | `tsc -b --noEmit` after split logic change | — | 0 new errors | Full project build |
| — / Issue #17 | Crops with ≥1 seeded norm row | 1 of 10 | 10 of 10 | `SELECT` grouped by crop |
| — / Issue #18 | Edit Season field text visible in dark mode | Invisible (near-white on light bg) | Fully readable | Puppeteer, forced `dark` theme |
| — / Issue #19 | Costs page has a chart / search | Neither | Donut chart + search across both views | Live screenshot + `tsc` |
| — / Issue #20 | Historical seasons enter `generate_estimate()`'s history path | Only via full live recording flow | Backfillable at season creation, up to 3 years | Live walkthrough + `tsc` |
| — / Issue #21 | Landing page features match shipped functionality | 4 of 4 cards hypothetical | 6 new cards, each a live demo of a real feature | Live screenshots |

Every fix in §4 was verified against the live, linked Supabase project —
not a local mock or an assumed-correct code review — using either a
direct SQL query, a live Puppeteer walkthrough of the deployed UI, or
both.

---

## 6. Backlog — Outstanding Work

Carried forward from §5.3 of the main report, plus items identified here
that are lower priority than what shipped in this pass:

| Item | Priority | Notes |
|---|---|---|
| Verify indicative norms for all ten crops against CSIR-CRI / real records | High | Blocks presenting the new crop data as sourced fact rather than indicative |
| Region-specific benchmark data | Medium | Currently a single national average (ADR-011's caveat) |
| Automated regression suite around `generate_estimate()` | Medium | Issues #3 and #4 were both caught by manual testing; neither had an automated check |
| Field-officer / aggregator role | Low | Explicitly out of scope for this project window (PRD §15) |
| SMS OTP phone verification | Low | Explicitly deferred (PRD FR-1.13, ADR-006) — not implemented, and correctly documented as such throughout |
| Delete the four dead stub components (Issue #15) | Low | Blocked by an environment permission restriction on file deletion during this session; zero functional risk in the meantime |

---

## 7. Appendix — File and Migration Index

| File | Purpose |
|---|---|
| `supabase/migrations/001_schema.sql` – `009_fix_views_and_seed_crops.sql` | Original schema, RLS, and reference data build-out (pre-hardening-pass) |
| `supabase/migrations/010_estimate_actual_vs_benchmark.sql` | Issue #3 |
| `supabase/migrations/011_category_benchmark_estimate.sql` | Issue #6 |
| `supabase/migrations/012_fix_crop_input_norms_duplicates.sql` | Issue #4 |
| `supabase/migrations/013_seed_additional_crop_norms.sql` | Issue #17 |
| `supabase/demo_seed.sql` | Reproducible demonstration account (see main report, Appendix D) |
| `docs/CHANGELOG.md` | Raw, PR-by-PR change history |
| `docs/DECISIONS.md` | Full ADR text |
| `docs/FarmPilot_PRD.md`, `docs/FarmPilot_SDD.md` | Requirements and design, both updated to v1.2 to reflect this pass |

---

*End of document.*
