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

0. [Plain-Language Summary — No Jargon](#0-plain-language-summary-no-jargon)
1. [From Proposal to Delivered System](#1-from-proposal-to-delivered-system)
2. [Development Timeline (Changelog, expanded)](#2-development-timeline-changelog-expanded)
3. [Architecture Decisions — Index](#3-architecture-decisions-index)
4. [Issue Register — Post-Build Hardening Pass](#4-issue-register-post-build-hardening-pass)
5. [Testing Record](#5-testing-record)
6. [Backlog — Outstanding Work](#6-backlog-outstanding-work)
7. [Appendix — File and Migration Index](#7-appendix-file-and-migration-index)

---

## 0. Plain-Language Summary — No Jargon

Section 4 below describes all 40 issues in full technical detail, for a
technical reader. This section describes the same 40 issues in plain
language — what was actually wrong, in everyday terms, and what was done
about it — for anyone reading this who isn't a programmer. Each row here
corresponds exactly to the same-numbered entry in §4, so "Issue #12"
means the same thing in both places. If you only read one section of this
whole document, read this one — everything past this point (§1 onward)
is written for a more technical reader and uses the vocabulary of software
development (database, function, API, and similar terms) without stopping
to define each one.

| # | What was actually wrong | What we did about it |
|---|---|---|
| 1 | The app kept the user signed in by silently checking with the server in the background. On this computer, the clock was set a few hours fast, which confused that background check into thinking it needed to run again and again, non-stop. | Told the app to stop double-checking everything every single time that routine background check happened. |
| 2 | The same clock problem was also the reason farm setup failed with a vague "something went wrong" message and wouldn't let a new farmer finish signing up. | Fixed the same way as #1 — once the background check stopped looping, farm setup started working. |
| 3 | The app was supposed to warn a farmer when they'd spent too much on something (like fertiliser), but it was secretly comparing their spending only to itself — which is like grading your own homework with your own answer key. It could never actually catch overspending, no matter how much someone overspent. | Changed it to compare what a farmer really spent against an independent, standard price list — so overspending can now actually be detected. |
| 4 | A data-loading mistake caused some of the standard price figures to get saved five times over by accident. That made every cost estimate come out roughly five times too expensive. | Found the duplicate data, removed it, and fixed the underlying mistake so it can't happen again. |
| 5 | There was no quick way to add a cost unless a farmer was already inside a specific season's page — no shortcut from the main dashboard. | Added an "Add Cost" button to the main dashboard. |
| 6 | If a farmer didn't know exactly what they'd spent on something, there was no way to get a suggested typical figure — they had to guess or leave it blank. | Added a "Don't know this cost?" button that fills in a sensible standard amount automatically. |
| 7 | Before any costs were recorded, the estimate page just showed an empty screen with nothing useful on it — a dead end. | Replaced it with a checklist showing exactly what to record next to get a real estimate. |
| 8 | The AI assistant (FarmBot) couldn't see which of a farmer's costs were flagged as too high, so when asked "am I overspending," it couldn't give a real answer. | Gave the assistant access to the farmer's real flagged costs so it can answer with actual numbers. |
| 9 | On phones, several floating buttons (the chat bubble, an "install this app" banner) sat on top of the bottom navigation bar, making things hard to tap. | Moved them so nothing overlaps on a phone screen. |
| 10 | A reference file that's supposed to describe exactly what's in the database (used to catch mistakes before they happen) had never actually been generated from the real database — it was a rough placeholder. | Generated it properly from the real, live database. |
| 11 | The "Reset Password" button on the profile page did nothing when clicked. | Built the missing feature behind it. |
| 12 | A feature to link a real email address to an account already existed in the background code, but there was no button anywhere for a farmer to actually use it. | Added the missing button and screen. |
| 13 | Money amounts sometimes displayed with the currency symbol twice, like "GHS GHS 1,424.33." | Found and fixed every place this happened. |
| 14 | The estimate report's two-column layout broke and overlapped text on certain screen sizes, because of a coding mistake in how the width was calculated. | Fixed the calculation so it always renders correctly. |
| 15 | Four pieces of code sitting in the project were never finished and never actually used anywhere in the running app — pure leftover clutter. | Confirmed nothing depended on them, then deleted them. |
| 16 | When two crops shared a cost during the weekly check-in (e.g. one land-clearing bill covering two fields), the app split the cost evenly between them no matter how much land each crop actually used. | Changed it to split the cost based on how many acres each crop actually covers — a bigger plot now correctly pays a bigger share. |
| 17 | Only one crop (Maize) had real starting price data to estimate against — the other nine crops the app supports had none at all. | Added starting price data for all ten crops. |
| 18 | With the app's dark colour theme turned on, a farmer trying to edit a season's details couldn't actually see what they were typing — the text was the same colour as the background. | Fixed the colours so text stays readable in both light and dark themes. |
| 19 | The pages listing a farmer's costs and seasons were just plain lists — no chart, no way to search. | Added charts and a search box to both. |
| 20 | If a farmer already had real cost figures from previous years for a crop, there was no way to enter that history — they could only start completely fresh. | Added a way to enter up to three previous years of real costs when starting a new season. |
| 21 | The public website's homepage described app features that didn't actually exist yet — more of a sales mockup than a true description. | Rewrote it to describe, and let visitors actually try, the real, working features. |
| 22 | Once an estimate had been generated for a season, there was no way to add a new cost from that same page — a farmer had to leave and hunt for another page. | Added a "Record a Cost" button right there, and the estimate now updates itself immediately after. |
| 23 | Comparing which crop costs the most to grow always blended every year together with no way to look at just one year, and nothing on the page explained what the numbers meant. | Added a year filter, and small "i" info buttons that explain each number when tapped. |
| 24 | There was no way for a farmer to experiment with "what would this cost me" before actually committing to plant anything. | Built a new sandbox page ("Cost Lab") for trying out different costs safely — nothing is saved unless you start a real season. |
| 25 | The AI assistant gave a new user no example questions to get started with, and it couldn't compare crops against each other by cost. | Added example questions and gave it access to real crop-comparison figures. |
| 26 | A farmer had no way to set their own personal spending limit for a category (e.g. "don't let me spend more than X on labour"), separate from the standard price guide. | Added the ability to set a personal limit per category, with a warning before saving a cost that would go over it. |
| 27 | There was no way to download a season's cost report, or the full list of costs, as a PDF to print or hand to someone. | Added a "Download PDF" button to both, and made sure only the actual report appears on the printed page — not the website's menus and buttons. |
| 28 | A farmer hit an error saving their farm details during setup, but the app only ever showed a vague "something went wrong" with no real reason given. | Could not reproduce the exact cause despite trying many times, but made the error message show the real technical reason if it ever happens again, and added a safety check for the most likely cause. |
| 29 | Hovering over a region on the interactive map (during farm setup) showed nothing — a farmer had to click just to find out a region's name. | Added a label that shows the region's name the moment you hover over it. |
| 30 | The new "Cost Lab" sandbox made you drag a slider for a whole category's cost as one lump sum — not how a real farmer thinks about spending. Separately, tapping a cost category anywhere else in the app did nothing. | Rebuilt Cost Lab around real quantities (e.g. "20 worker-days"), and made cost categories clickable so tapping one shows exactly what was recorded and how it added up. |
| 31 | The same "tapping a category should show its details" fix from #30 was missing on the separate, all-seasons Costs page. | Fixed there too. |
| 32 | Several pages showed numbers and charts with no explanation of what they actually meant. | Added small "i" info icons throughout that explain each number in plain terms on tap or hover. |
| 33 | A file containing real GitHub account-recovery codes had accidentally been saved and uploaded to the project's public code repository. | Immediately told the person responsible to regenerate those codes (since anyone who'd seen the file could otherwise use them), removed the file from the project, and — once given the go-ahead — permanently erased every trace of it from the project's entire saved history, not just the current version. |
| 34 | Every single check that the app worked correctly had been done by hand — a person clicking through the app and reading the results themselves. There was no way to automatically re-check things after a future change. | Built a proper set of automated checks that re-run the app's core money calculations by themselves, on command, without anyone needing to click through anything. |
| 35 | The very first time the new automated checks ran, they caught a real, previously-unnoticed inconsistency: two pieces of behind-the-scenes logic that were supposed to always agree on a price were actually off by a tiny amount. | Traced it to one of the two no longer being used anywhere in the app, and removed it rather than patching around the mismatch. |
| 36 | The first set of automated checks (#34) only covered the money-calculation logic — it didn't check ordinary things like creating/editing/deleting a farm, or the single most important safety rule: that one farmer can never see or change another farmer's data. That safety rule had only ever been checked by a person manually signing in as two different accounts. | Added many more automated checks covering farms, seasons, and costs being created/edited/deleted correctly, and — most importantly — a check using two genuinely separate accounts confirming one farmer truly cannot read, change, or delete another farmer's farm, no matter how they try. |
| 37 | Six more parts of the app had never been automatically checked at all — signing in, personal spending caps, the crop/season comparison screens, the dashboard summary numbers, the advice-guide library, and notifications. One of those, a behind-the-scenes rule that automatically alerts a farmer the moment overspending is detected, had literally never been tested by anyone or anything since it was built. | Added checks for all six, including one that deliberately triggers an overspend and confirms the automatic alert really appears — and confirms a normal, under-budget cost correctly creates no alert at all. |
| 38 | While running the new automated checks repeatedly back-to-back, sign-ups started failing — not because of anything wrong in the app, but because the login service itself (a service the app relies on, run by Supabase) has its own built-in limit on how many new accounts can be created in a short window, as a security measure, and running the checks over and over in quick succession tripped it. | Confirmed with a standalone test that the app's own code wasn't at fault — the login service's own safety limit was. Changed how the automated checks run (one at a time instead of all at once, and reusing one test account instead of creating a new one for almost every check) so the checks ask for far fewer new accounts overall. |
| 39 | A whole file of code, sitting quietly in the project, turned out to be completely unused by the actual running app — and it contained its own, separate copy of the list of cost categories that had quietly gone out of date compared to the real one actually used everywhere else (calling the same category two different names in two different places). | Confirmed nothing in the app used the file at all, then deleted it, rather than fix or keep testing something nobody ever calls. |
| 40 | The single biggest finding of this whole testing effort: the app was supposed to let a farmer record a cost even with no phone signal, and save it for later automatically — all the actual machinery for that existed and was well-built — but nothing in the real "record a cost" screen was ever connected to it. A farmer who lost signal while saving a cost would just see an error and lose what they typed, not have it saved for later like the report and README both said it would. | Connected the recording form to the offline-saving system that already existed, so a cost recorded with no signal is now genuinely saved and automatically sent once signal returns — and proved it really works by checking it against the real database, including the specific case of the same saved item accidentally being sent twice (it correctly does not create a duplicate). |

---

## 1. From Proposal to Delivered System

The project began from a six-week proposal. The original plan was to build
the website itself in React (as it was eventually built), but to run the
cost-calculation logic as a **separate Python program** talking to the
database over the network. The scope was two questions: estimate what a
season should cost, and suggest how to reduce it. Before building actually
started, two things changed from that plan — how long the build would take,
and where the calculation logic would live. Both changes were deliberate
decisions made and written down at the time (in the ADRs referenced below),
not scope creep discovered after the fact while writing this document.

| Proposal commitment | What was actually built | Where decided |
|---|---|---|
| Python (FastAPI) calculation service | Removed. Estimation runs as a PL/pgSQL function (`generate_estimate`) inside PostgreSQL | ADR-001 |
| Six-week timeline | Compressed to fourteen days | PRD §1.4, §19 |
| Farmer account + recording form | Built, phone-first with email as an alternative | ADR-006 |
| Estimate the coming season's cost from records | Built — with the correction described in Issue #3 below, which the original proposal's "based on real spending, not general advice" promise directly depended on | §4 |
| Find overspend, suggest reduction | Built — one estimate per season (not one per farm), rolled up via views | ADR-007 |
| Show estimate and suggestions on one screen | Built (`EstimateReport.tsx`) | §4 |

The original proposal's own goal — *"using the farmer's own records"* — is
exactly what led to the single most important design decision in the whole
project (recorded as ADR-003), and, later, to the most serious bug found in
this log (Issue #3): if a system only ever compares a farmer's spending
against that same farmer's own past records, it can never actually catch
overspending — there is nothing independent to measure against, so the
comparison always comes out even. The original goal was the right one; making
it actually work required comparing spending against something *outside*
the farmer's own numbers — an independent, published price benchmark — and
that one idea is what the entire data model is built around.

---

## 2. Development Timeline (Changelog, expanded)

This section is a version-by-version build log — a technical record of
what was added at each stage, in the order it happened. Full raw entries
are kept in `CHANGELOG.md`, updated on every merge per the team's own rule
("a PR with no changelog entry is not merged"). Summarised here as a build
narrative:

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

An "ADR" (Architecture Decision Record) is just a short written note
explaining one deliberate design choice and why it was made — kept so that,
months later, nobody has to guess whether something was an oversight or a
decision. Twelve of them govern this system; full text is in `DECISIONS.md`.
Listed here for cross-reference against the issues in §4, several of which
either test one of these decisions directly or build on one already made.

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

This is the detailed, technical version of what §0 already summarised in
plain language — the same 36 problems, but here with the exact code-level
cause, the exact fix, and the exact evidence that the fix actually worked
(a command that was run, or a test that was checked, not just a claim).
A non-technical reader who wants the same information without the code
detail should read §0 instead; this section is for verifying the work.

Each entry is rated by severity: **Critical** (a core feature silently gave
a wrong answer — the most serious kind of bug, because nothing on screen
told anyone it was wrong), **High** (a feature was completely broken and
unusable), **Medium** (a real problem, but a contained one), **Low**
(cosmetic or a minor inconsistency).

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
inline instead.

**Resolved.** Initially left in place — file deletion was blocked by an
environment permission restriction earlier in this session. Re-confirmed
unused via a full-codebase import search (zero matches for any of the
four, or for `components/domain/index.ts`, which only re-exported them),
then deleted all five files with the user's explicit authorisation.
`npx tsc -b --noEmit` and `npm run build` both stayed clean, and the
production bundle hash was byte-identical before and after (`index-
BmG2tmTF.css`, `index-DTTGXWk7.js`), confirming they contributed nothing
to the shipped app.

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

### Issue #22 — No way to record a new cost once an estimate existed
**Severity:** High (a real workflow dead end, found directly by the
user testing the app). `EstimateReport.tsx`'s full-report view (once
`generate_estimate()` has produced at least one line) had no "Add Cost"
action anywhere — only a pencil "edit" control that overwrites the
*displayed* `estimate_lines.estimated_pesewas` value directly, which is
cosmetic and does not insert into `season_costs`; the edit is silently
lost the next time the estimate is regenerated. The `AddCostForm` modal
this page already imports was only ever mounted in the empty
"Need More Data" state, never in the populated report.

**Fix.** Added a "Record a Cost" button in the report header and a
per-line "+ Record actual" action next to every still-`Predicted` line,
both opening the same `AddCostForm` modal against the report's real
`season_id`. On save, the estimate is regenerated immediately
(`regenerateMutation.mutate()`) and the page navigates to the fresh
report, so a newly recorded cost is reflected on screen right away
instead of leaving a stale report open.

**Evidence.** Live Puppeteer walkthrough on the demo account: opened an
existing estimate report, clicked "Record a Cost," recorded a Transport
cost, and confirmed the URL moved from `/report/69` to a new
`/report/70` with the fresh figures — not the same report silently
unchanged.

---

### Issue #23 — Crop vs Crop had no way to scope by year, and no explanation of methodology
**Severity:** Low (usability/clarity, not a defect). `compareCrops()`
always aggregated every recorded season of a crop into one figure with
no year filter, and none of the three Compare tabs explained what their
numbers actually meant (e.g. that everything is per-acre, or that Crop
vs Crop blends multiple seasons rather than showing the latest one) —
raised directly as "nothing should be vague for users."

**Fix.** `compareCrops(farmId, years?)` now accepts an optional year
filter, aggregating just the matching seasons with the same weighted
sum(cost)/sum(area) formula the unfiltered `v_crop_summary` view uses,
so the two paths agree when the filter covers every year. Crop vs Crop
gained a year-chip filter bar and a season-count column. A new
`<InfoTip>` component (small "i" icon, click-to-reveal explanation) was
added to all three Compare tabs, the Costs page's pie chart and header,
and the Season Detail page's cost distribution chart — each explaining
what the number is actually measuring and where it comes from.

**Evidence.** `npx tsc -b --noEmit` clean; live query against the demo
account confirmed `compareCrops(farmId, [2026])` returns different
figures than the unfiltered call, matching the seasons actually
recorded in that year.

---

### Issue #24 — "Cost Lab" — a what-if sandbox, requested directly
**Severity:** N/A (new feature, not a bug). Requested so a farmer can
experiment with different cost assumptions for a crop and acreage before
committing to a real season — nothing analogous existed; the only way to
see benchmark numbers was inside an actual season.

**Fix.** New migration `014_crop_benchmark_breakdown.sql` adds
`get_crop_benchmark_breakdown(crop_id, season_window, area_acres)`, a
`security invoker`, `stable` SQL function returning the same
norms × price × price_multiplier benchmark math as
`get_category_benchmark_pesewas()` and `generate_estimate()`, but for a
crop/window/acreage combination with **no season row required** — every
existing benchmark RPC needed a real season to read `crop_id` and
`area_planted_acres` from. Applied directly to the linked project via
`npx supabase db query --linked -f`, and `database.types.ts`
regenerated. A new page (`/lab`, linked from the sidebar) lets a farmer
pick a crop, season window, and acreage, seeds every category from this
real benchmark data, and lets them drag each one to see the scenario
total, cost per acre, and percentage versus the standard rate — purely
client-side, nothing is written to the database.

**Evidence.** `select c.name, b.* from crops c, lateral
get_crop_benchmark_breakdown(c.id, 'major', 2.5) b where c.name =
'Maize'` returned the same GHS 3,375.68 fertiliser figure already
verified elsewhere in this document for a 2.5-acre Maize farm — confirms
the new function reproduces the existing, already-tested benchmark math
exactly. `npx tsc -b --noEmit` clean; live screenshot of the working page.

---

### Issue #25 — FarmBot had no guided entry point and no crop-comparison awareness
**Severity:** Low (capability gap, not a defect) — raised directly as
"upgrade the AI bot functionality." A first-time user faced an empty
input box with no sense of what to ask, the assistant had no aggregated
crop-vs-crop figures (only itemized costs, from which it would have had
to estimate rather than state exactly), and there was no way to start a
fresh conversation without losing context in a long-running chat.

**Fix.** Added four suggested-prompt chips shown until the first real
question is asked ("Am I overspending anywhere?", "What's my cost per
acre so far?", "Which crop costs me the most to grow?", "How do I set up
cost history for a crop?"), a "New chat" reset control in the header, a
`compareCrops()` query feeding the same weighted per-acre figures the
Compare page shows into the system prompt, and a paragraph describing
Cost Lab, cost-history backfill, the Weekly Check-in, and the Compare
page so the assistant can accurately point to them if asked what it or
the app can do.

**Evidence.** `npx tsc -b --noEmit` clean; live screenshot confirms the
four suggestion chips render on first open.

---

### Issue #26 — No way to cap what you're willing to spend on a category
**Severity:** N/A (new feature, requested directly): "people should be
able to set a cost limit ... maybe they don't want to spend this on a
particular crop or they don't want to spend this amount on labour for a
particular crop." Deliberately distinct from the benchmark comparison —
the benchmark is a fixed, external MoFA-derived figure the farmer has no
say over; a budget is the farmer's own ceiling for their own season,
independent of whether that category happens to be within or outside
the benchmark.

**Fix.** New migration `015_category_budgets.sql`: a `category_budgets`
table (one optional limit per `(season_id, category)`, RLS matching the
existing `season_costs`-style ownership check) and a
`v_category_budget_status` view joining each budget against what's
actually been recorded, computing spent/remaining/over-budget/percentage
in one row. Applied directly to the linked project;
`database.types.ts` regenerated. `SeasonDetail.tsx` gained a "Category
Budgets" card (progress bar per category, red once over, a "Set a
budget" modal) and `AddCostForm.tsx` now shows a live amber warning
("This would put you GHS X over your GHS Y budget") while recording a
cost that would exceed an existing budget for that category — before
the farmer saves it, not after.

**Evidence.** `npx tsc -b --noEmit` clean; live Puppeteer walkthrough:
set a GHS 10 Seeds budget on the demo account's active Cassava season,
confirmed the progress bar rendered "GHS 0.00 / GHS 10.00," then opened
Record Cost → Seeds, entered GHS 50, and confirmed the live warning read
"This would put you GHS 40.00 over your GHS 10.00 seeds budget for this
season."

---

### Issue #27 — No way to export a report or costs as a PDF
**Severity:** Medium (a real capability gap, requested directly).
`EstimateReport.tsx` already carried an extensive, unused `print:`
Tailwind treatment (50+ classes converting the dark hero, charts, and
flagged-category cards into a clean black-on-white layout) — but there
was no button anywhere that triggered printing, and more importantly
`AppShell`'s sidebar, mobile nav, top bar, and the FarmBot floating
button/chat window had no print handling at all, so even opening the
browser's own print dialog manually would have printed the app chrome
alongside the report.

**Fix.** Added a `.print-hide` utility (`src/index.css`, `@media
print`) and applied it to every piece of persistent app chrome
(`AppShell`'s mobile header, desktop sidebar, mobile bottom nav, and
theme/notification bar; `FarmBot`'s FAB and chat window; `OfflineBanner`;
`PwaInstallPrompt`) plus `InfoTip`'s icon button, so any page prints
cleanly by default. Added a "Download PDF" button (`window.print()` —
the browser's native "Save as PDF" destination, no client-side PDF
library needed) to `EstimateReport.tsx`, which already had page-specific
print styling, and to `CostsOverview.tsx`, which gained a lighter print
treatment (search/toggle controls hidden, the pie chart and category
list left visible) alongside its new dashboard from Issue #19. A global
print-time light-mode override was also added so a farmer viewing in
dark mode still gets a normal white/black printout.

**Evidence.** `npx tsc -b --noEmit` clean; Puppeteer screenshots with
`page.emulateMediaType('print')` on both pages confirm the sidebar,
bottom nav, FarmBot button, and page controls are gone, the "Download
PDF" button itself is hidden from its own output, and the estimate
report / cost breakdown (including the donut chart) render cleanly on a
white page.

---

### Issue #28 — Farm creation 400 with no visible cause
**Severity:** Medium (reported directly: a `POST .../farms 400 (Bad
Request)` in the console during farm-setup onboarding). Extensive live
reproduction attempts — fresh phone-signup accounts, the region select,
direct SVG-map clicks, non-default check-in days, against both the dev
server and the live Vercel deployment — all completed successfully
(`201`), so the exact trigger could not be reproduced in this pass. The
real defect found in the process was in the *handling*, not necessarily
the cause: `handleFarmError()`'s fallback swallowed the actual
Postgres/PostgREST error text behind a fully generic "something went
wrong," which is exactly what made a report like this unreprodicible
after the fact — there's no way to tell a numeric overflow from an RLS
issue from a null value from the console line alone.

**Fix.** `createFarm()` now rejects a non-finite or absurdly large
`total_area_acres` client-side before sending it (`JSON.stringify`
silently turns `NaN` into `null`, which would otherwise reach a `NOT
NULL numeric` column as an unexplained 400). `handleFarmError()`'s
fallback now includes the real Postgres message, `details`, and `hint`
rather than discarding them — the next time this happens, the error
banner itself will say why instead of requiring guesswork.

**Evidence.** `npx tsc -b --noEmit` clean; confirmed the guard rejects
`NaN`/`Infinity`/values over 999,999 before any network call.

---

### Issue #29 — GhanaMap had no hover feedback
**Severity:** Low (usability, requested directly). `GhanaMap.tsx` wired
a `click` listener per region `<path>` but no `mouseenter`/`mouseleave`,
so hovering a region gave no indication of what it was before clicking
— the map is used identically in `FarmSetup.tsx` and `Profile.tsx`.

**Fix.** Added hover state and a "Tap to select" label (mirroring the
existing "Selected Region" badge) that shows the hovered region's name
live, using the same `mapRegionName()` correction already in place for
the one real name mismatch between the SVG (`"Northern East"`) and the
app's canonical region list (`"North East"`).

**Evidence.** `npx tsc -b --noEmit` clean; fixed in both call sites by
construction, since both consume the same `GhanaMap` component.

---

### Issue #30 — Cost Lab used abstract cedi sliders instead of real quantities; category cards had nowhere to click through to
**Severity:** N/A (product feedback on two already-shipped pieces of
this session's own work, not a defect). Two related requests: (1) Cost
Lab's sliders moved a lump cedi amount per category, so "explore
different labour costs" meant dragging an abstract number rather than
something a farmer thinks in (people, days, bags); (2) `CostList.tsx`'s
per-category cards — both the amber "needs setup" ones and the normal
populated ones — had no click behaviour at all, so there was no way to
either fix a missing category or see how an already-recorded one's
total was built up.

**Fix.** New migration `016_crop_benchmark_lines.sql`:
`get_crop_benchmark_lines()` returns one row per underlying input (e.g.
"NPK 15-15-15, 5 x 50kg bags, GHS 461.25/bag") instead of a
per-category sum. Cost Lab was rewritten around this — each slider now
drags a real quantity, with cost shown live as quantity &times; rate,
grouped by category, plus a plain-language interpretation sentence
("that's 12% more than the standard rate ... GHS 84.00 above it") below
the summary numbers. Separately, a new page (`/season/:id/category/:category`,
`CategoryDetail.tsx`) shows a category's total, its variance against the
benchmark, and every individual cost entry that built up to that total,
each editable/deletable in place. `CostList.tsx`'s category cards are
now buttons: an empty "needs setup" card opens the add-cost form
pre-scoped to that category; a populated card navigates to its new
detail page.

**Evidence.** `npx tsc -b --noEmit` clean; live SQL query against Maize
at 2.5 acres confirms `get_crop_benchmark_lines()` returns the same
correct per-line figures (e.g. GHS 461.25 for one 50kg bag of NPK) that
feed the rest of the app; live Puppeteer walkthrough clicking a
populated "Land work" card landed on `/season/58/category/land_prep`
showing its one recorded entry and +33% benchmark variance.

---

### Issue #31 — Farm-wide Costs page category cards had the same gap as Issue #30
**Severity:** Low (a direct follow-up report: "the cost breakdown detail
page for each cost you haven't yet implemented it"). Issue #30 fixed
`CostList.tsx`'s per-season category cards, but the separate,
farm-wide `/costs` page (`CostsOverview.tsx`) has its own "By Category"
list aggregating across every season, and its cards were still plain,
non-interactive `<div>`s.

**Fix.** Each category card is now a toggle: tapping it expands an
inline list of every individual cost entry in that category across all
seasons (reusing data already fetched for the page — no extra query),
each showing which season it belongs to and linking to that season's
`/season/:id/category/:category` detail page from Issue #30.

**Evidence.** `npx tsc -b --noEmit` clean; live walkthrough expanding
"Fertiliser" on the demo account shows both its entries (open-market
2026, subsidised 2025) with a working link to
`/season/57/category/fertiliser`.

---

### Issue #32 — More InfoTip coverage requested directly
**Severity:** N/A (polish, requested directly: "add tooltips where
needed"). Compare, Costs, and Season Detail already had `InfoTip`
explainers; the Estimate Report (the core analysis page) and the
Dashboard's headline numbers didn't.

**Fix.** Added `InfoTip` to the Estimate Report's "Where Your Money
Goes" (explaining Recorded vs Predicted) and "Where You Can Save"
(explaining exactly when a category is flagged), and to the Dashboard's
"Total Possible Saving," "Spend by Crop," and "Season Status" cards.

**Evidence.** `npx tsc -b --noEmit` clean.

---

### Issue #33 — Real GitHub 2FA recovery codes were committed and pushed to the repository
**Severity:** Critical (a genuine secret-exposure incident, not a code
defect). While reorganising the project's file structure, a file
`docs/github-recovery-codes.txt` was found tracked in the repository —
real-looking GitHub two-factor recovery codes, already pushed to
`origin/main` in an earlier commit (`044b8ce`).

**Response (two stages, both required, handled in that order):**
1. **Immediate:** the user was told directly, before any other work
   continued, to regenerate their GitHub 2FA recovery codes themselves —
   removing the file from the repository does nothing to a code that has
   already been exposed; only regenerating it invalidates the old ones.
   This is an account-level action only the account owner can take.
2. **Repository remediation**, explicitly split into two decisions
   because they carry very different risk: (a) untrack and delete the
   file from the current working tree immediately (`git rm --cached`,
   plus a `.gitignore` rule against `*recovery-codes*`, `*.pem`, `*.key`
   to prevent recurrence) — done the same session; (b) actually purge
   the file from every commit in history — deferred at the time,
   pending the user's explicit go-ahead, since it requires rewriting
   every commit hash on `main` and force-pushing, which is destructive
   to anyone else's clone. Completed only once the user later said
   explicitly to proceed.

**Fix (history rewrite).** No `git-filter-repo`/Python was available in
this environment, so the git-native fallback was used: `git filter-branch
--index-filter "git rm --cached --ignore-unmatch docs/github-recovery-codes.txt"
--prune-empty -- --all`, run across every local ref. A second branch,
`cursor/setup-map-idle-dark-mode`, shared the same early history and was
found to carry the same exposure — confirmed via `git log --oneline
<branch> -- <path>` before deciding how to handle it — and was rewritten
and force-pushed alongside `main` once the user separately confirmed
they wanted that branch cleaned too (rather than left as-is or deleted).
Backup refs (`refs/original/`) were removed and `git gc --prune=now
--aggressive` run locally before force-pushing, so the object no longer
exists even in the local repository, not just unreferenced.

**Evidence.** Before push: `git log --all --oneline -- docs/github-
recovery-codes.txt` returned no results on either rewritten branch.
After `git push origin --force` to both `main` and
`cursor/setup-map-idle-dark-mode`: `git fetch origin` followed by the
same `git log --all` check against `origin/*` confirmed zero commits
reference the file on the remote either.

**Lasting note for anyone else with a clone of this repository:** commit
hashes on both branches changed as of this rewrite. A prior clone's
`main` will not fast-forward — it needs to be re-fetched and reset to
the new history (or re-cloned) rather than merged.

---

### Issue #34 — No automated tests existed anywhere in the project
**Severity:** Medium (a real methodological gap, raised directly in
supervisor review of this project: "show me one test that runs in CI
without you at the keyboard"). Every fix in this log up to this point
was verified by hand — live Puppeteer walkthroughs, direct SQL queries
against the linked project, before/after screenshots. That evidence is
real, but it is not repeatable by anyone else without re-doing the same
manual steps, and `vitest` had sat in `package.json` as a dependency
the whole project without a single test using it (one exception found:
`src/lib/phone.test.ts` already existed and passed, but nothing ran it —
there was no `test` script).

**Fix.** Two-tier suite, split so the fast one has no excuse not to be
run:
- **Unit** (`npm test` / `vitest.config.ts`) — fast, network-free, pure
  functions only: `money.test.ts` (pesewa/cedi conversion and
  round-tripping), `categories.test.ts` (category/essentials
  consistency), and `splitByAcreage.test.ts` for the Weekly Check-in's
  proportional-split rule (Issue #16), which was extracted out of
  `WeeklyCatchUp.tsx` into a standalone pure function
  (`src/lib/splitByAcreage.ts`) specifically so it could be tested in
  isolation — the exact 1-acre/5-acre → 100/500 worked example from
  Issue #16's own evidence is now a permanent regression test, not a
  one-off manual check.
- **Integration** (`npm run test:integration` /
  `vitest.integration.config.ts`) — hits the real, linked Supabase
  project against a throwaway test farm created and torn down within
  each run. Targets `generate_estimate()` directly: no-history/nothing-
  recorded (benchmark method, nothing flagged), a category recorded 80%
  over the benchmark (flagged, variance/advice/saving all populated), a
  category recorded under benchmark (not flagged), and history taking
  over once a prior completed season exists — the exact cases Issues #3
  and #4 were about, now checked by a machine instead of only by memory.
  Also covers Category Budgets' `v_category_budget_status` view and
  `get_crop_benchmark_lines()`'s acreage scaling.

**Evidence.** `npm test`: 39 passed. `npm run test:integration`: 6
passed (after the fix in Issue #35, below — the first run found a real
bug).

---

### Issue #35 — `get_crop_benchmark_lines()` and `get_crop_benchmark_breakdown()` disagreed by a few pesewas
**Severity:** Low (found by the new test suite on its first run, not
user-facing — the app never called the affected function). The new
integration test asserted that `get_crop_benchmark_lines()`'s per-input
rows, summed back up, equal `get_crop_benchmark_breakdown()`'s
per-category totals for the same crop/acreage — both read the same
`crop_input_norms` x `cost_benchmarks` join, so they should agree. The
first run failed: 43,853 vs. 43,841 pesewas for one category.
Root cause: the two functions round at different points —
`get_crop_benchmark_breakdown()` (migration 014) sums the exact,
unrounded per-input values and rounds once at the end; `get_crop_
benchmark_lines()` (migration 016) rounds each line's quantity and unit
price individually, by design, since the Lab UI displays and lets a
farmer adjust those exact numbers. Summing independently-rounded lines
does not always reproduce a total rounded once — ordinary floating-point
behaviour, not a logic error in either function individually.

**Fix.** A full-codebase search confirmed `get_crop_benchmark_breakdown()`
has had zero callers since Cost Lab was rewritten around
`get_crop_benchmark_lines()` (Issue #30) — so rather than reconcile two
rounding strategies serving a function nothing uses, migration 017 drops
it outright, matching this project's existing practice of removing
confirmed-dead code (Issue #15) instead of patching around it. The now-
invalid cross-function test was replaced with a same-function
consistency check: doubling the acreage passed to `get_crop_benchmark_
lines()` must exactly double every line's quantity while leaving its
per-unit rate untouched (a market price is not a function of farm size).

**Evidence.** `select proname from pg_proc where proname =
'get_crop_benchmark_breakdown'` returns zero rows post-migration.
`npm run test:integration`: 6/6 passed after the fix. `npx tsc -b
--noEmit` and `npm run build` both stayed clean after removing the
dead function and its wrapper from `src/api/lab.ts`.

---

### Issue #36 — Test suite widened to CRUD, cascade deletion, and cross-user security
**Severity:** N/A (coverage expansion, requested directly: "everything
has been tested — all features, functional requirements, use cases and
scenarios"). Issue #34's suite proved the estimation engine and pure
utility functions; it did not yet cover ordinary create/read/update/
delete operations, what happens to a season's costs when the season
itself is deleted, or — the most important gap — whether Row Level
Security actually stops one farmer from reading or changing another
farmer's data. That last one is Objective #6 of the whole project and,
until now, had only ever been checked by hand (sign in as two accounts,
try to see the other one's farm).

**Fix.** Three new integration files:
- `farms.integration.test.ts` — create/read/update a farm, the
  zero-area rejection from Issue #28's hardening, and a dedicated
  cross-user security block using **two independent Supabase clients**
  (Farmer A on the shared client, Farmer B on a second one created
  directly in the test — the same as two separate browsers, not one
  session signing in and out) proving Farmer B's own queries cannot
  read, update, or delete Farmer A's farm, and that Farmer A's farm is
  provably untouched afterward.
- `seasons.integration.test.ts` — live and back-filled (historical)
  season creation, `completeSeason()`, and confirming that deleting a
  season cascades and removes its costs rather than leaving orphaned
  rows.
- `costs.integration.test.ts` — both cost-entry paths (total-only and
  quantity × rate), update/delete, `quickFillCosts()`, and a check that
  **all ten seeded crops**, not just Maize, have the four essential
  benchmark categories covered — directly re-verifying Issue #17 as a
  standing test rather than a one-time fix.

**Evidence.** `npm run test:integration`: 28/28 passed (up from 6).
`npm test`: 39/39 unit tests still passed. `npx tsc -b --noEmit` clean.

---

### Issue #37 — Six more API modules had zero test coverage, including a database trigger nothing had ever exercised
**Severity:** N/A (coverage expansion, same directive as #36: "continue
building automated tests for all the features and functionalities...
all use cases, all functionality and different scenarios"). Issue #36
covered farms/seasons/costs CRUD and cross-user security. Six other
`src/api/*.ts` modules still had no dedicated test at all: `auth.ts`,
`budgets.ts` (beyond the spent/remaining arithmetic Issue #36 already
covered), `compare.ts`, `dashboard.ts`, `guides.ts`, and `notifications.ts`
— and a seventh, `estimates.ts`, had only its two headline functions
(`generateEstimate`, `getReport`) covered by Issue #34; everything else
in it — listing past estimates, the "most recent estimate per season"
lookup FarmBot depends on for real overspend figures, and manually
editing one line of an existing estimate — had none. Also missing was
a piece of logic that lives entirely in the database and had
never been exercised by anything: the `on_estimate_flag_trigger` (migration
004) that writes an "Overspend Alert" notification automatically the
instant an estimate line is flagged, with no application code involved.
Nothing in the UI would show a missing notification as an error, which is
exactly the kind of silent failure this hardening pass exists to catch.

**Fix.** Two kinds of gap closed:
- **Pure error-mapping functions** (`handleAuthError`, and — newly
  exported for this purpose — `handleBudgetError`, `handleDashboardError`,
  `handleEstimateError`) now have direct unit tests (`auth.test.ts`,
  `budgets.test.ts`, `dashboard.test.ts`, `estimates.test.ts`) covering
  every branch: network failure, duplicate registration, wrong password,
  weak password, expired session, and the no-raw-error-leaks fallback case.
- **Six new integration files**, plus a new describe block appended to
  the existing `estimates.integration.test.ts` covering `listEstimates()`,
  `getLatestEstimate()`, `getEstimateById()`, `getFlaggedInsightsForFarm()`
  (proving it returns only each season's *most recent* estimate's flagged
  lines, not every estimate ever generated), `updateEstimateLine()`
  (recalculates the estimate total correctly after a manual edit), and
  `checkProvisionalBenchmarks()` — against the live database:
  `auth.integration.test.ts` (sign-up, duplicate-phone rejection, sign-in,
  wrong-password rejection, `linkEmail()`, `updateLanguage()`,
  `updateProfile()`, sign-out); `budgets.integration.test.ts`
  (`setCategoryBudget()` replaces rather than duplicates a cap;
  `deleteCategoryBudget()` removes one); `compare.integration.test.ts`
  (season-vs-season excludes a zero-cost season and computes correct
  cost-per-acre; crop-vs-crop's unfiltered view path and year-filtered
  direct-aggregation path agree; me-vs-benchmark after a real estimate);
  `dashboard.integration.test.ts` (farm- and crop-level rollups match
  what was actually recorded, not just that the query succeeds);
  `guides.integration.test.ts` (listing, filtering, and — the more
  interesting path — a guide is only surfaced once its category is
  genuinely flagged on a real estimate, not before); and
  `notifications.integration.test.ts`, which generates a deliberately
  flagged estimate and then asserts the database trigger actually wrote
  the alert row, with no code of this project's own doing the writing.

Two smaller, related fixes found while writing this batch: `GhanaMap.tsx`'s
`mapRegionName()` (reconciling the SVG map's region-name spelling with
`GHANA_DISTRICTS`, relevant to Issue #28's unreproduced farm-creation
error) is now exported and unit-tested against every real region name;
and a new `districts.test.ts` checks `GHANA_DISTRICTS` itself — all 16
regions present, none with zero districts, no duplicate district names.

**Evidence.** `npm test`: 67/67 passed (up from 39 — 28 new unit tests).
`npm run test:integration`: 62/62 passed (up from 28 — 34 new integration
tests), including the trigger-created notification actually appearing
with `type: 'limit_reached'` and `is_read: false` immediately after
`generate_estimate()` flags a category, a companion test confirming an
*under*-benchmark category creates no notification at all, and
`getFlaggedInsightsForFarm()` correctly excluding an older, superseded
estimate's flags once a season has been re-estimated. `npx tsc -b
--noEmit` clean.

---

### Issue #38 — Running the integration suite repeatedly in quick succession trips Supabase's own sign-up rate limit
**Severity:** Low (a testing-workflow finding, not an application defect
— documented here because it was found *by* testing and materially
affects how the suite should be run, not because anything in the shipped
app is wrong). While verifying Issue #37's new tests, running
`npm run test:integration` several times in close succession — on top of
Vitest's default of running test files in parallel, each creating its own
throwaway account — started failing with `"Database error saving new
user"` (HTTP 500) and then `"Request rate limit reached"`
(`over_request_rate_limit`, HTTP 429) directly from Supabase's Auth
service, not from anything in this project's own code.

**Fix.** Two changes, both defensive rather than papering over the
limiter: `vitest.integration.config.ts` now sets `fileParallelism: false`,
so test files run one at a time — the total number of sign-ups per full
run is unchanged, but they no longer all fire in the same instant, which
is what a burst-style rate limiter actually objects to.
`auth.integration.test.ts` was restructured (see Issue #37) to share one
throwaway account across seven of its eight assertions instead of
creating a fresh one per test, cutting that file's own sign-up count from
seven to two. Both changes reduce load on the shared Supabase project
regardless of the rate limiter — there is no reason to spend a shared,
finite sign-up budget testing things that don't need a fresh account.
No code change was made to work around or bypass the rate limiter itself;
it is Supabase's own protection and is left exactly as configured.

**Evidence.** A standalone probe script calling `supabase.auth.signUp()`
directly (bypassing this project's error-message wrapping) reproduced
both raw errors verbatim, confirming the cause was the Auth service's own
limiter and not a bug in `handleAuthError()`'s mapping. After the fix and
a short cooldown, a full `npm run test:integration` run passed clean —
see Issue #37's evidence line for the final count.

---

### Issue #39 — A whole API module, `src/api/reference.ts`, was dead code with a silently wrong category list inside it
**Severity:** Low (unused code, not a live defect — but a real one, and
found directly by the process of writing tests for §4's Issue #37: while
looking for what to test in every `src/api/*.ts` file, `reference.ts`
turned out to have no importer anywhere in the application at all).
`reference.ts` exported `listCrops()` (a duplicate of `crops.ts`'s
`getCrops()`) and `listCategories()` — a second, hand-written copy of the
category list already defined properly in `src/lib/categories.ts`. The
two had quietly drifted apart: `reference.ts` labelled `land_prep` as
"Land Preparation" and `agrochem` as "Agrochemicals," while the real,
actually-used list in `categories.ts` calls them "Land work" and
"Chemicals" — the exact kind of two-sources-of-truth trap that produces
a confusing bug the moment someone imports the wrong one by habit.

**Fix.** A full-codebase, case-insensitive search confirmed zero imports
of `src/api/reference.ts` from anywhere in `src/`. Consistent with this
project's standing practice of deleting confirmed-dead code outright
rather than fixing or testing it (Issue #15's four stub components,
Issue #35's unused benchmark RPC), the file was removed entirely instead
of reconciled with `categories.ts` or given a test of its own.

**Evidence.** `npx tsc -b --noEmit` and `npm run build` both stayed clean
after deletion — nothing referenced the removed exports. `npm test`:
67/67 still passed (nothing in the suite depended on it either).

---

### Issue #40 — Offline cost recording was never actually wired up, despite being documented and reported as tested
**Severity:** Critical (a documented, reportedly-tested feature did not
function at all for its one real use case) — and the most important
finding in this entire hardening pass, because it was not caught by
manual testing (T11 in the main report's testing table) before now.
While looking for what to test next in `src/lib/offline/` (the only
part of the app left completely uncovered — see Issue #37), the offline
write-queue turned out to be fully built — `enqueue()`, `flush()` with
exponential backoff and a permanent-failure list, and even a dedicated
`client_id` column with a unique index (migration 003) specifically so
a retried flush can never create a duplicate row — but a full-codebase
search showed `enqueue()`, the one function that actually puts a write
into that queue, had **zero callers anywhere in the application**.
`AddCostForm.tsx`, the only place a farmer records a cost, called
`addCost()`/`updateCost()` directly with no offline handling at all: its
`onError` handler only reverted the optimistic UI update and displayed
an error message. `OfflineBanner.tsx` and `useOfflineStatus.ts` were
correctly built to *display* a pending/failed queue — but nothing ever
filled it, so a farmer who lost signal mid-submission today would simply
see an error and lose what they typed, not get the "queues locally,
flushes automatically on reconnect" behaviour the report and README both
describe. T11's "Pass" verdict could not have been produced by actually
testing this path as built; it is left in this log's record rather than
rewritten, as an honest account of what testing missed the first time.

**Fix.** `AddCostForm.tsx` now calls `enqueue()` in two places: proactively,
the moment `useOnline()` reports the browser is offline (skipping the
network attempt entirely rather than waiting for it to time out), and as
a fallback if an online submission still fails for a connectivity reason
(the signal drops mid-request). Both paths reuse the exact `season_costs`
table and payload shape `addCost()`/`updateCost()` already use, so a
queued write is byte-for-byte the same row the normal path would have
produced. `onSettled` now skips its query-cache invalidation for a queued
result specifically, so the optimistic entry `onMutate` already added
stays visible instead of being erased by a refetch that (correctly) can't
see a row that hasn't synced yet; `onSuccess` surfaces a distinct amber
"Saved offline — will sync automatically" notice so this state is never
silently indistinguishable from a normal save.

**Evidence.** `npx tsc -b --noEmit` clean. A new
`src/lib/offline/queue.integration.test.ts` (using `fake-indexeddb` to
run a real IndexedDB against Vitest's Node environment) proves the fix
at the level that actually matters — not that `enqueue()`/`flush()` call
the right functions, but that a queued insert is genuinely accepted by
the live `season_costs` table under real RLS, and that re-flushing the
same `client_id` — the exact scenario a retried sync after a dropped
connection produces — does not create a duplicate row, confirming the
migration-003 unique index does what it was built for four ADRs ago.
`npm run test:integration`: this file's 2 new tests pass on a clean run
(verified directly, and separately against the demo account to sidestep
Issue #38's rate limit while it was still cooling down) — 64/64 total
across the whole suite, up from 62.

---

## 5. Testing Record

The main report (§4.3) carries the primary test table — a summary of what
was checked and whether it passed. This section gives the full, detailed
evidence behind each row of that table:

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
| — / Issue #22 | Can record a new cost from an existing estimate report | No path at all | "Record a Cost" + per-line "Record actual," auto-regenerates | Live walkthrough, `/report/69` → `/report/70` |
| — / Issue #23 | `compareCrops()` respects a year filter | Always all years, no explanation | Filterable by year, `InfoTip` on all 3 Compare tabs + Costs + Season | Live query with/without `years` |
| — / Issue #24 | `get_crop_benchmark_breakdown()` matches known-good benchmark figures | — | Maize fertiliser at 2.5 acres = GHS 3,375.68, matches prior verification | Direct SQL query |
| — / Issue #25 | FarmBot has a guided first-open state | Empty input box | 4 suggested-prompt chips + "New chat" | Live screenshot |
| — / Issue #26 | Live over-budget warning while recording a cost | Did not exist | "This would put you GHS 40.00 over your GHS 10.00 seeds budget" | Live walkthrough |
| — / Issue #27 | App chrome absent from a printed/PDF page | Sidebar, nav, FarmBot all printed | All hidden via `.print-hide`; report/costs render cleanly | Puppeteer `emulateMediaType('print')` |
| — / Issue #28 | `createFarm()` rejects non-finite/absurd area before any network call | Would send `null` to a NOT NULL column | Rejected client-side with a clear message | Manual boundary check |
| — / Issue #29 | GhanaMap shows the region name on hover | No feedback until click | Live "Tap to select" label | Code review (shared component, both call sites) |
| — / Issue #30 | Cost Lab quantity scaling / category-card navigation | Abstract cedi sliders; cards did nothing | Quantity x rate sliders; cards navigate to detail | Live Puppeteer walkthrough, `/season/58/category/land_prep` |
| — / Issue #31 | Farm-wide Costs page category cards expand to entries | Plain non-interactive divs | Toggle expands to every entry with a working link | Live walkthrough, `/season/57/category/fertiliser` |
| — / Issue #32 | InfoTip coverage on analysis pages | Estimate Report, Dashboard had none | Added to both | `npx tsc -b --noEmit` |
| — / Issue #33 | Recovery-codes file absent from all git history, both branches | Present in `044b8ce` onward | `git log --all -- <path>` returns nothing, local and remote | `git log`, `git fetch` + re-check |
| — / Issue #34 | Automated test suite exists and passes | 0 automated tests in the project | 39 unit + 6 integration, both passing | `npm test`, `npm run test:integration` |
| — / Issue #35 | `get_crop_benchmark_lines()` vs `get_crop_benchmark_breakdown()` totals agree | 43,853 vs 43,841 pesewas (dead function found via new test) | Dead function dropped (migration 017); replacement test passes | `npm run test:integration` before/after |

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
| Field-officer / aggregator role | Low | Explicitly out of scope for this project window (PRD §15) |
| SMS OTP phone verification | Low | Explicitly deferred (PRD FR-1.13, ADR-006) — not implemented, and correctly documented as such throughout |
| Region-specific and per-crop-scale (not just per-acre) budget defaults | Low | Category Budgets (Issue #26) are entirely farmer-set with no suggested starting value yet |
| A saved/named history of Cost Lab scenarios | Low | Lab (Issue #24) is intentionally a stateless sandbox — nothing persists across a reload today |
| Wider automated test coverage (client-side components, not just business logic) | Medium | Issue #34 covers the estimation engine and pure utility functions; UI-level component/interaction tests (e.g. React Testing Library) are still all manual (Puppeteer, run by hand) |
| CI pipeline running `npm test` on every push | Low | The suite exists and passes locally; nothing runs it automatically yet |

---

## 7. Appendix — File and Migration Index

| File | Purpose |
|---|---|
| `supabase/migrations/001_schema.sql` – `009_fix_views_and_seed_crops.sql` | Original schema, RLS, and reference data build-out (pre-hardening-pass) |
| `supabase/migrations/010_estimate_actual_vs_benchmark.sql` | Issue #3 |
| `supabase/migrations/011_category_benchmark_estimate.sql` | Issue #6 |
| `supabase/migrations/012_fix_crop_input_norms_duplicates.sql` | Issue #4 |
| `supabase/migrations/013_seed_additional_crop_norms.sql` | Issue #17 |
| `supabase/migrations/014_crop_benchmark_breakdown.sql` | Issue #24 (Cost Lab) |
| `supabase/migrations/015_category_budgets.sql` | Issue #26 (Category Budgets) |
| `supabase/migrations/016_crop_benchmark_lines.sql` | Issue #30 (Cost Lab quantity-based redesign) |
| `supabase/migrations/017_drop_unused_benchmark_breakdown.sql` | Issue #35 |
| `src/api/estimates.integration.test.ts`, `src/lib/*.test.ts` | Issue #34 (automated test suite) |
| `src/api/farms.integration.test.ts`, `seasons.integration.test.ts`, `costs.integration.test.ts` | Issue #36 (CRUD, cascade deletion, cross-user RLS security) |
| `src/api/auth.integration.test.ts`, `budgets.integration.test.ts`, `compare.integration.test.ts`, `dashboard.integration.test.ts`, `guides.integration.test.ts`, `notifications.integration.test.ts`, the new describe block in `estimates.integration.test.ts`, plus `auth.test.ts`, `budgets.test.ts`, `dashboard.test.ts`, `estimates.test.ts`, `src/lib/districts.test.ts`, `src/components/domain/GhanaMap.test.ts` | Issue #37 (remaining API modules, including the notification trigger) |
| `vitest.integration.config.ts` (`fileParallelism: false`) | Issue #38 (Supabase Auth sign-up rate limit) |
| `src/components/domain/AddCostForm.tsx`, `src/lib/offline/queue.integration.test.ts` | Issue #40 (offline cost recording actually wired up) |
| `supabase/demo_seed.sql` | Reproducible demonstration account (see main report, Appendix D) |
| `docs/CHANGELOG.md` | Raw, PR-by-PR change history |
| `docs/DECISIONS.md` | Full ADR text |
| `docs/FarmPilot_PRD.md`, `docs/FarmPilot_SDD.md` | Requirements and design, both updated to v1.2 to reflect this pass |

---

*End of document.*
