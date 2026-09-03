# FarmPilot — Product Requirements Document

**Kwame Nkrumah University of Science and Technology**
Department of Computer Science · Mini Project 2025/2026

| | |
|---|---|
| **Document type** | Product Requirements Document (PRD) |
| **Version** | 1.3 |
| **Status** | Approved for build |
| **Changes in 1.3** | Budgeting extended from one tier to four (§7.15): a total cap per crop, one overall Farm Budget, that Farm Budget assigned across categories farm-wide, and a category cap within a specific crop — on top of the existing per-season Category Budgets (§7.15A); cost recording now checks all five tiers live before saving (FR-15.10); FarmBot has read access to every tier (FR-15.11) |
| **Changes in 1.2** | Estimation engine now compares this season's *actually recorded* costs against benchmark, not just a prediction against itself (see §7.6, BR-5/BR-6); per-category "don't know this cost" benchmark fill (FR-4.13); interactive cost-tracking checklist on the report's cold-start screen (FR-9.10); quick-add-cost entry point from the dashboard (FR-4.14); weekly check-in day added to farm setup (FR-2.6, §7.4A); fixed a data bug that had silently 5×'d every Maize benchmark figure (§8.4) |
| **Changes in 1.1** | Phone-first auth · dashboard rollups · offline capture · local languages |
| **Product** | FarmPilot — farm cost estimation and reduction tool |
| **Team** | Osmond Abdul-Karim Woriwi (21034402) · Aboagye Jeffery Ohene (21013336) · Ayisha Abdullah (20950630) |
| **Timeline** | 14 days |
| **Companion document** | `FarmPilot_SDD.md` — technical design |

---

## Table of Contents

1. Overview
2. Problem Statement
3. Goals and Non-Goals
4. Target Users
5. Success Metrics
6. Product Principles
7. Functional Requirements
8. Data Requirements
9. Content Requirements
10. User Flows
11. Screen Requirements
12. Business Rules
13. Edge Cases and Error Handling
14. Non-Functional Requirements
15. Out of Scope
16. Assumptions
17. Dependencies
18. Release Criteria
19. Delivery Plan
20. Open Questions
21. Appendix — Requirements Traceability

---

## 1. Overview

### 1.1 Product summary

FarmPilot is a web application that tells a small-scale Ghanaian farmer
what a season should cost to run, and where he is spending more than he
needs to.

The farmer records his farm, his season, and what he spent. The system
compares that spending against benchmark figures derived from published
agricultural data and real farm records, then reports each cost category
where he is above the expected level, with a specific suggestion for
reducing it.

### 1.2 One-line positioning

> A farmer records what he spent. FarmPilot tells him what it should have
> cost, and where the difference is.

### 1.3 Why this product

Existing agricultural platforms in Ghana serve organisations —
cooperatives, aggregators, input dealers, and government — with the
farmer as beneficiary rather than user. Farm cost visibility is delivered
through an extension officer, if at all. FarmPilot addresses the cost
question directly and in a form a farmer or a field officer can complete
in a few minutes.

### 1.4 Relationship to the approved proposal

| Proposal commitment | Status in this PRD |
|---|---|
| Farmer account and recording form | Retained — FR-1, FR-3, FR-4 |
| Store each season's costs in one place | Retained — FR-3, FR-4 |
| Estimate cost of coming season from records | Retained — FR-6 |
| Find overspending and suggest reductions | Retained — FR-7, FR-8 |
| Show estimate and suggestions on one screen | Retained — FR-9 |
| React + TypeScript frontend | Retained |
| Supabase for accounts and data | Retained |
| Python (FastAPI) calculation service | **Removed** — see §16.4 |
| Six-week schedule | **Compressed to 14 days** — see §19 |

---

## 2. Problem Statement

### 2.1 The user's problem

A small-scale farmer spends on seeds, fertiliser, agrochemicals, land
preparation, labour, transport, and storage every season. Almost none of
this is written down. As a result he cannot answer two questions that
directly determine his profit:

1. **What should this season cost me?**
2. **Where am I spending more than I need to?**

Without an answer to the first, he cannot plan or borrow. Without an
answer to the second, he repeats the same overspend every season.

### 2.2 Why it persists

| Cause | Consequence |
|---|---|
| No records kept | Nothing to analyse; the farmer reasons from memory |
| No external comparison | Even a farmer who tracks spending has nothing to judge it against |
| Advice is generic | Extension guidance is crop-level, not farm-level and not costed |
| Subsidy windows missed | Fertiliser bought at open market costs roughly double the subsidised price |

### 2.3 The core insight

**Overspending cannot be detected by looking at a farmer's records
alone.** Comparing a farmer only against his own history means his
figures always equal his own baseline — variance is always zero and
nothing can ever be flagged.

Detecting overspend requires an **independent benchmark**: what the
season *should* cost, derived from how much of each input an acre of that
crop actually needs, priced at current rates.

This single insight determines the entire product and data design.

---

## 3. Goals and Non-Goals

### 3.1 Product goals

| # | Goal |
|---|---|
| G1 | A farmer with no prior records receives a usable cost estimate on first use |
| G2 | A farmer sees his season cost broken down by category, not as one number |
| G3 | The system identifies specific categories where spending exceeds the expected level |
| G4 | Each identified category carries an actionable suggestion, not generic advice |
| G5 | The farmer sees a quantified potential saving |
| G6 | Recording a full season takes under ten minutes |
| G7 | Benchmark data can be replaced without any code change |

### 3.2 Academic goals

| # | Goal |
|---|---|
| G8 | Demonstrate relational data modelling with enforced integrity constraints |
| G9 | Demonstrate row-level authorisation, verified by test |
| G10 | Demonstrate business logic implemented in the database layer |
| G11 | Produce a working, deployed system within the assessment window |
| G12 | Document sources, limitations, and excluded scope honestly |

### 3.3 Non-goals

| # | Non-goal | Reason |
|---|---|---|
| N1 | Predicting yield or weather | Separate problem, out of scope |
| N2 | Real-time market prices | Requires a data source the project does not have |
| N3 | Farmer-to-farmer comparison | Privacy implications and insufficient user base |
| N4 | Loan origination or payments | Regulated activity |
| N5 | Replacing extension services | The product informs, it does not advise agronomically |
| N6 | Serving commercial-scale farms | Benchmarks and design target smallholders |

---

## 4. Target Users

### 4.1 Primary persona — Kwame, smallholder farmer

| | |
|---|---|
| **Age / location** | 42, Ejisu district, Ashanti Region |
| **Farm** | 2.5 acres, maize in major season, maize and vegetables in minor |
| **Device** | Android smartphone, 5" screen, mobile data, intermittent signal |
| **Literacy** | Reads English adequately; more comfortable in Twi |
| **Records** | None written. Recalls large purchases; does not recall small ones |
| **Financial pattern** | Buys inputs when cash is available, not when cheapest. Missed the subsidy window last season |
| **Goal** | Keep more of what he earns |
| **Frustration** | Knows the money goes somewhere, cannot say where |
| **Success looks like** | Being told, in cedis, which single change saves him the most |

### 4.2 Secondary persona — Ama, field officer

| | |
|---|---|
| **Role** | Cooperative secretary, records for approximately 30 farmers |
| **Device** | Laptop, office connection |
| **Behaviour** | Enters data on farmers' behalf after farm visits |
| **Relevance** | Documented adoption barriers make officer-mediated entry the more realistic path at scale |
| **Status in v1** | Not supported. Design does not preclude it — see §15 and SDD §18 |

### 4.3 Evaluator — project supervisor

| | |
|---|---|
| **Need** | Evidence of design reasoning, working software, honest treatment of limitations |
| **Assesses** | Data model quality, security implementation, whether the system actually runs, source traceability |

---

## 5. Success Metrics

### 5.1 Product metrics

| # | Metric | Target | Measurement |
|---|---|---|---|
| M1 | Time to record one full season | < 10 minutes | Timed walkthrough with a test user |
| M2 | Estimate available on first use, no history | 100% of new users | Functional test |
| M3 | Flagged categories carry advice | 100% of flagged rows | Data assertion — no flag without advice |
| M4 | Report renders in one screen without navigation | Yes | Visual inspection at 360px |
| M5 | Every benchmark row carries a source | 100% | NOT NULL constraint |
| M6 | Sign-up completable with a phone number only | Yes | Functional test |
| M7 | Dashboard farm total equals the sum of its seasons | Exact | Reconciliation test |

### 5.2 Technical metrics

| # | Metric | Target |
|---|---|---|
| M8 | Estimate generation time, 50 cost items | < 2 seconds |
| M9 | Cross-user data leakage | Zero rows, verified with two accounts |
| M10 | Monetary rounding drift | Zero — integer pesewas throughout |
| M11 | Fresh-project rebuild from migrations | Succeeds with no manual steps |
| M12 | Duplicate records after an interrupted offline flush | Zero |

### 5.3 Explicitly not measured

Adoption, retention, and actual farmer savings. The assessment window
does not permit longitudinal measurement, and claiming otherwise would be
dishonest.

---

## 6. Product Principles

Decision rules for the build. Where a requirement is ambiguous, these
resolve it.

| # | Principle | Consequence |
|---|---|---|
| P1 | **The comparison must be external** | A benchmark is never derived from the user being measured |
| P2 | **Every number lives in the database** | No rate, price, or threshold appears in application code |
| P3 | **Amount is required, breakdown is optional** | A farmer who recalls only a total can still record |
| P4 | **Per acre is the unit of comparison** | Farms of different sizes remain comparable |
| P5 | **Money is integer pesewas** | No float arithmetic anywhere in the system |
| P6 | **Outputs are snapshots** | A farmer sees what he was told then, not a retroactively changed figure |
| P7 | **Advice must be specific** | "Reduce fertiliser spend" fails; naming the subsidy window passes |
| P8 | **State limitations plainly** | Unverified data is labelled as unverified in the product and the report |

---

## 7. Functional Requirements

Priority: **P0** must ship · **P1** ships if time allows · **P2** deferred.

### 7.1 Authentication and account

Target users are smallholder farmers who use mobile phones and often have
no email address. Sign-up is therefore **phone-first**, with email offered
as an alternative on the same screen.

| ID | Requirement | Priority |
|---|---|---|
| FR-1.1 | A user can register with **phone number and password** | P0 |
| FR-1.2 | A user can register with email and password as an alternative | P0 |
| FR-1.3 | Phone is the default option and appears first on both sign-up and sign-in | P0 |
| FR-1.4 | Phone numbers are normalised — `+233 24 123 4567`, `024-123-4567`, and `0241234567` all resolve to the same account | P0 |
| FR-1.5 | Invalid Ghana mobile numbers are rejected with a clear message | P0 |
| FR-1.6 | The normalised number is shown back to the user before submit | P0 |
| FR-1.7 | A user can sign in and sign out | P0 |
| FR-1.8 | A session persists across page reload | P0 |
| FR-1.9 | Unauthenticated users are redirected from protected routes to sign-in | P0 |
| FR-1.10 | Duplicate registration shows a clear message, not a raw error | P0 |
| FR-1.11 | A user may link an email address to a phone-registered account | P1 |
| FR-1.12 | Password reset | P2 |
| FR-1.13 | SMS OTP verification of the phone number | P2 |

**Implementation note.** Supabase phone auth requires OTP delivery
through a paid SMS provider, which is out of scope. The client therefore
normalises the phone number, derives a synthetic email
(`0241234567@farmpilot.local`), and calls standard email sign-up. The real
number is stored in `profiles`. The farmer never sees an email field
unless they choose that option. See ADR-006.

**Accepted limitation.** The phone number is not verified. This is
acceptable because it functions as an identifier, not a channel — nothing
is ever sent to it. Enabling real SMS OTP later requires only switching on
a provider; numbers are already stored and normalised.

### 7.2 Farm

| ID | Requirement | Priority |
|---|---|---|
| FR-2.1 | A user records one farm: name, district, region, total area in acres | P0 |
| FR-2.2 | Farm setup is required before any other screen is reachable | P0 |
| FR-2.3 | Total area must be greater than zero | P0 |
| FR-2.4 | A user can edit farm details after creation | P1 |
| FR-2.5 | A user can hold multiple farms | P2 |
| FR-2.6 | A user picks a day of the week during farm setup as their weekly check-in day (§7.4A) | P1 |

### 7.3 Season

| ID | Requirement | Priority |
|---|---|---|
| FR-3.1 | A user creates a season: crop, year, window, area planted | P0 |
| FR-3.2 | Window is one of major, minor, dry | P0 |
| FR-3.3 | The same crop in the same year and window cannot be created twice on one farm | P0 |
| FR-3.4 | Area planted must be greater than zero | P0 |
| FR-3.5 | Area planted must not exceed the farm's total area | P0 |
| FR-3.6 | Seasons are listed with crop, year, window, total recorded, and status | P0 |
| FR-3.7 | A user closes a season by entering harvest quantity and unit | P0 |
| FR-3.8 | A closed season becomes available as history for future estimates | P0 |
| FR-3.9 | A user can record revenue against a closed season | P1 |
| FR-3.10 | A user can delete a season and its costs | P1 |

### 7.4 Cost recording

| ID | Requirement | Priority |
|---|---|---|
| FR-4.1 | A user adds a cost item to a season | P0 |
| FR-4.2 | Category is required, from the fixed list of eight | P0 |
| FR-4.3 | Amount is required and must be zero or greater | P0 |
| FR-4.4 | Quantity, unit, and unit price are optional | P0 |
| FR-4.5 | Where quantity and unit price are supplied, amount is computed automatically | P0 |
| FR-4.6 | A description may be attached to any item | P0 |
| FR-4.7 | Items appear in the list immediately on save | P0 |
| FR-4.8 | A running total is displayed on the season screen | P0 |
| FR-4.9 | A user can delete an item, with confirmation | P0 |
| FR-4.10 | A user can edit an existing item | P1 |
| FR-4.11 | A date may be attached to any item | P1 |
| FR-4.12 | Common inputs are offered as suggestions when a category is selected | P1 |
| FR-4.13 | Where a benchmark exists for the season's crop and the selected category, the add-cost form offers to fill the amount with the standard rate scaled to the season's planted acreage, for a farmer who does not know what a category actually cost | P1 |
| FR-4.14 | A cost item can be added from the dashboard without first opening a season, when the farm has exactly one active season; where it has more than one, the farmer is asked which season the cost belongs to first | P1 |

### 7.4A Weekly check-in

A farmer rarely opens the app mid-season unless prompted — costs that
should be logged as they happen (labour, transport) get forgotten and
either lost or dumped into memory-based guesses weeks later. The weekly
check-in is a standing prompt that asks, per category, "did you spend
anything on X this week?" so recurring costs get captured close to when
they happened, feeding the same `season_costs` rows the normal add-cost
form does.

| ID | Requirement | Priority |
|---|---|---|
| FR-4A.1 | The dashboard prompts a weekly check-in when it has been roughly a week since the last one, or when today is the farmer's chosen check-in day (FR-2.6) and they have not completed one today | P1 |
| FR-4A.2 | The check-in asks one question per expected category across all of the farmer's active seasons, not per season — where two active seasons share an expected category, one question covers both | P1 |
| FR-4A.3 | A farmer can answer "Nothing" to skip a category for that week without it counting as zero spend recorded | P1 |
| FR-4A.4 | An amount entered against a category shared by multiple active seasons is split evenly across those seasons | P2 |
| FR-4A.5 | Check-in entries are recorded as ordinary cost items — they are indistinguishable from normally-recorded costs to the estimation engine and appear in the same lists and totals | P0 |
| FR-4A.6 | The farmer can dismiss a check-in without answering every question | P1 |

**Accepted limitation (FR-4A.4).** Splitting evenly rather than by
planted acreage is a simplification: a 1-acre and a 5-acre active season
sharing a "labour" question receive the same split regardless of size,
which skews the per-acre figure for both until the farmer corrects it
with an ordinary edit. Splitting proportionally by acreage is documented
as future work (SDD §18) rather than built now, because it adds a second
mental model (equal vs. proportional) to a screen designed to be
answerable in seconds standing in a field.

### 7.5 Cost categories

| ID | Requirement | Priority |
|---|---|---|
| FR-5.1 | Exactly eight categories exist: seeds, fertiliser, agrochemicals, land preparation, labour, transport, storage, other | P0 |
| FR-5.2 | The list is fixed; users cannot add categories | P0 |
| FR-5.3 | Categories are displayed with readable labels, not database identifiers | P0 |
| FR-5.4 | The `other` category is included in totals but never flagged, and the UI states why | P0 |

**Why the list is fixed (FR-5.2).** Every category must map to a benchmark
in order to be compared. A farmer-invented category has nothing to measure
against, so it could never be flagged and would be silently invisible to
the estimation engine — the feature would appear to work while doing
nothing. Unusual spending goes under `other`, which counts toward the
total but carries no advice, and the report says so. See ADR-004.

### 7.6 Estimation

| ID | Requirement | Priority |
|---|---|---|
| FR-6.1 | A user generates an estimate for a season | P0 |
| FR-6.2 | Where the farm has no prior completed season of that crop, the estimate uses benchmark data | P0 |
| FR-6.3 | Where prior completed seasons exist, the estimate uses the farmer's own per-acre averages | P0 |
| FR-6.4 | The method used and the number of seasons drawn on are shown to the user | P0 |
| FR-6.5 | The estimate is produced per category and totalled | P0 |
| FR-6.6 | The estimate is scaled by area planted | P0 |
| FR-6.7 | The estimate is stored, with the settings in force at the time | P0 |
| FR-6.8 | Estimate generation is unavailable until at least one cost item exists | P0 |
| FR-6.9 | Re-running an estimate creates a new record rather than overwriting | P0 |
| FR-6.10 | A user can view previous estimates for a season | P1 |
| FR-6.11 | Where the farmer has already recorded an actual cost for a category this season, the estimate line for that category shows that recorded figure rather than a prediction, and is labelled "Recorded"; categories not yet recorded are labelled "Predicted" | P0 |
| FR-6.12 | Overspend flagging (FR-7.x) applies only to "Recorded" lines — a still-predicted line has nothing real to compare yet | P0 |

**Why FR-6.11/6.12 exist.** The original engine computed the "estimate"
and the "benchmark" for a first-time crop from the exact same figures, so
they were always equal — variance was always 0% and nothing could ever be
flagged, regardless of what a farmer actually recorded that season. This
silently defeated FR-7 and FR-8 for every farmer growing a crop with no
prior completed season of their own, which is every farmer's first
season. The fix makes the estimate line for a category switch from a
prediction to the farmer's own recorded figure the moment they record it,
so the comparison in BR-6 has something real to compare once it exists.

### 7.7 Overspend detection

| ID | Requirement | Priority |
|---|---|---|
| FR-7.1 | Each category is compared against its benchmark figure for the same area | P0 |
| FR-7.2 | Variance is calculated as a percentage above benchmark | P0 |
| FR-7.3 | A category exceeding the configured threshold is flagged | P0 |
| FR-7.4 | The threshold is configurable in the database, default 30% | P0 |
| FR-7.5 | Potential saving is recorded as the amount above benchmark | P0 |
| FR-7.6 | Categories with no benchmark are shown but never flagged | P0 |

### 7.8 Cost-reduction advice

| ID | Requirement | Priority |
|---|---|---|
| FR-8.1 | Every flagged category displays a suggestion | P0 |
| FR-8.2 | Suggestions are stored in the database, editable without code change | P0 |
| FR-8.3 | Suggestions are specific and actionable, naming a mechanism the farmer can act on | P0 |
| FR-8.4 | Exactly one suggestion exists per category | P0 |
| FR-8.5 | Multiple suggestions per category, selected by severity | P2 |

### 7.9 Report

| ID | Requirement | Priority |
|---|---|---|
| FR-9.1 | The report shows the estimated total for the season | P0 |
| FR-9.2 | The report shows every category with amount and share of total | P0 |
| FR-9.3 | Flagged categories are visually distinct | P0 |
| FR-9.4 | Flagged categories are ordered first | P0 |
| FR-9.5 | Each flag shows variance percentage and potential saving | P0 |
| FR-9.6 | The total potential saving is shown | P0 |
| FR-9.7 | The report notes when benchmark rather than history was used | P0 |
| FR-9.8 | The report fits one scrollable screen at 360px width | P0 |
| FR-9.9 | The report is printable or exportable to PDF | P2 |
| FR-9.10 | Where a season has nothing to estimate yet (no benchmark for the crop, no history, no recorded costs), the report screen shows an interactive checklist of the categories a farmer should track, each marked as fixed (recorded) or needing fixing (not yet recorded); tapping a category opens the add-cost form directly, pre-set to that category | P0 |
| FR-9.11 | The checklist in FR-9.10 uses the crop's own expected categories where benchmark norms exist for it; where they do not, it falls back to the same general checklist (seeds, land preparation, fertiliser, labour) used on the season screen, so every crop gets an actionable checklist | P1 |

### 7.10 Data integrity

| ID | Requirement | Priority |
|---|---|---|
| FR-10.1 | A user can read and write only their own farm, seasons, costs, and estimates | P0 |
| FR-10.2 | Reference data is readable by all signed-in users and writable by none | P0 |
| FR-10.3 | Every benchmark row records its source | P0 |
| FR-10.4 | Unverified benchmark rows are explicitly marked as placeholders | P0 |
| FR-10.5 | Deleting a season deletes its costs and estimates | P0 |
| FR-10.6 | Reference rows in use cannot be deleted | P0 |

### 7.11 Dashboard and rollups

An estimate belongs to a **season** — one crop, one window, one year, one
farm. This is correct: an acre of maize and an acre of cassava need
entirely different inputs in different quantities, so a single farm-wide
estimate would have to average across crops and would describe no actual
field.

The farmer, however, asks two questions: *"what does this crop cost me?"*
and *"what does my whole farm cost me?"* Both are answered by estimating
per crop and rolling upward. See ADR-007.

| ID | Requirement | Priority |
|---|---|---|
| FR-11.1 | The dashboard is the landing screen after sign-in | P0 |
| FR-11.2 | It shows farm-level totals: seasons, crops, area planted, total recorded, total estimated, total possible saving | P0 |
| FR-11.3 | It shows a per-crop breakdown: seasons, acres, total spent, cost per acre | P0 |
| FR-11.4 | Cost per acre is displayed prominently, as it is the only figure comparable across crops of different sizes | P0 |
| FR-11.5 | It lists all seasons with crop, year, window, recorded total, and status | P0 |
| FR-11.6 | Re-running an estimate does not double the farm total — only the most recent estimate per season is counted | P0 |
| FR-11.7 | The relationship between per-crop and farm-level figures is explained in one line so the numbers are not confusing | P0 |
| FR-11.8 | The dashboard resolves in two queries, not one per season | P0 |

### 7.12 Offline capture

| ID | Requirement | Priority |
|---|---|---|
| FR-12.1 | The app installs as a PWA on Android | P1 |
| FR-12.2 | Farm, seasons, and existing costs are viewable offline after one online visit | P1 |
| FR-12.3 | Cost items can be added, edited, and deleted while offline | P1 |
| FR-12.4 | Offline writes queue locally and flush automatically on reconnect | P1 |
| FR-12.5 | A replayed or interrupted flush never creates a duplicate record | P1 |
| FR-12.6 | An offline banner and a pending-item count are always visible when offline | P1 |
| FR-12.7 | Unsynced items are individually marked | P1 |
| FR-12.8 | Estimate generation is disabled offline, with the reason shown | P1 |
| FR-12.9 | A write that fails repeatedly is surfaced to the user, never silently dropped | P1 |

**Scope boundary.** Offline covers cost entry only — the one activity that
happens standing in a field. Sign-in and estimate generation require
connectivity and the UI says so.

**Duplicate prevention.** Each queued row carries a `client_id` UUID
generated on the device, with a unique index server-side. A replayed write
collides on the index instead of inserting again. Without this, a farmer
who loses signal mid-save could record the same GHS 400 of fertiliser
three times and his estimate would be silently wrong. See ADR-008.

### 7.13 Local languages

| ID | Requirement | Priority |
|---|---|---|
| FR-13.1 | A user can select a preferred language: English, Twi, Ewe, Ga, or Dagbani | P2 |
| FR-13.2 | Advice messages are shown in the selected language | P2 |
| FR-13.3 | Advice can be played as audio in the selected language | P2 |
| FR-13.4 | Translations are fetched once and cached; no repeat API calls | P2 |
| FR-13.5 | If the translation service is unavailable, English is shown without an error | P2 |
| FR-13.6 | Unreviewed machine translations are marked as automatic | P2 |

**Why audio matters more than text.** Khaya AI (Ghana NLP) provides both
translation and text-to-speech for Twi and Ewe. A farmer who reads English
poorly can still listen. If only one half is built, it should be the
audio. See ADR-009.

**Implementation status (this pass).** FR-13.1 (language selector), 13.2
(Twi advice text), 13.3 (Twi advice audio), 13.4 (generate-once caching),
and 13.5 (silent English fallback) are built and verified for **Twi
only** — see `FarmPilot_SDD.md` §19 for the full design and how the live
API's real behaviour differed from what was assumed before it was
actually called. Ewe, Ga, and Dagbani remain selectable in the language
dropdown (the schema and the generation script both already support
them) but have no generated content yet, so a farmer who picks one of
those three correctly and silently sees English throughout, exactly as
FR-13.5 requires — not a broken state, just an ungenerated one.
FR-13.6 is **partially met**: `advice_translations.reviewed` exists,
defaults to `false`, and is never set `true` by any code path (only a
human can), so the distinction is fully tracked in the database — but
nothing in the UI yet shows a farmer-facing "machine-translated,
unreviewed" label. Until a native Twi speaker reviews the 8 generated
clips and the rows are flipped to `reviewed = true`, this is the one
requirement in this section not fully closed out.

### 7.14 AI Assistant (FarmBot)

| ID | Requirement | Priority |
|---|---|---|
| FR-14.1 | A user can interact with an AI assistant (FarmBot) available on all screens | P0 |
| FR-14.2 | FarmBot has real-time context of the user's farm details, recorded costs, and estimated totals | P0 |
| FR-14.3 | FarmBot has access to the user's active and completed seasons, along with crop and area planted details | P0 |
| FR-14.4 | FarmBot provides specific, actionable agricultural advice tailored to the user's current farm data | P0 |
| FR-14.5 | FarmBot handles network errors gracefully without crashing the application | P0 |
| FR-14.6 | FarmBot has access to the real overspend flags computed by the estimation engine (category, variance percentage, potential saving, advice) for the most recent estimate on each of the user's seasons, and is instructed to lead with them — not a generic guess — when asked about overspending | P0 |

### 7.15 Budgeting

The benchmark comparison (§2.3, FR-7) tells a farmer when a category is
above the *standard* rate — a fixed, external number the farmer doesn't
control. A farmer separately wants to express their own ceiling — their
own cash on hand, not MoFA's national average — and to do so at whichever
level they're actually thinking at: one category this season, a whole
crop, a whole category across every crop, a whole farm, or a specific
category within a specific crop. These are five independent, optional
caps; none of them replace or adjust the benchmark, and a category can be
within benchmark while over a farmer's own budget, or the reverse.

| ID | Requirement | Priority |
|---|---|---|
| FR-15.1 | A farmer can set a spending cap for one category within one season (Category Budgets) | P1 |
| FR-15.2 | A farmer can set one total spending cap for a crop, across every season of that crop on the farm, independent of year or growing window | P1 |
| FR-15.3 | A farmer can set one overall spending cap for the whole farm — every season, crop, and category combined | P1 |
| FR-15.4 | A farmer can assign portions of the farm-wide cap across the 8 cost categories, farm-wide rather than tied to one season | P1 |
| FR-15.5 | A farmer can set a spending cap for one category within one specific crop, across every season of that crop | P1 |
| FR-15.6 | Every budget shows the amount spent, the amount remaining, and whether it has been exceeded, computed from the same recorded costs the rest of the app already uses — never a second, separately-entered total | P0 |
| FR-15.7 | A farmer can view every budget they've set in one place, search it by crop or category name, and filter to only over-budget or only not-yet-set caps | P1 |
| FR-15.8 | Budgets are reachable from Settings and from the main navigation | P1 |
| FR-15.9 | A crop-level or crop-and-category budget is editable in context from that crop's season screen, not only from the dedicated Budgets page | P2 |
| FR-15.10 | Recording a new cost checks it against every budget tier that applies (the season-category cap, the crop-and-category cap, the farm-wide category cap, the crop total, and the farm total) and warns the farmer, before saving, if any would be exceeded | P1 |
| FR-15.11 | The AI assistant (FarmBot) has read access to every budget a farmer has set, and answers "am I within budget" from those caps rather than from the benchmark comparison | P2 |

**Why five tiers, not one.** An earlier pass (§16.4 of the companion
System Design Document has the full account) built only the per-season
Category Budget. In practice a farmer plans at several altitudes at
once — "what's my whole season's spend," "what's this crop going to cost
me all year," "what's my ceiling on fertiliser no matter which crop it's
for" — and forcing all of that through a single season+category cap meant
re-entering the same intent every season. Each tier is optional and
independent by design (P1), rather than requiring a farmer to reconcile
five numbers that must sum to one another, which would turn a planning
aid into a second bookkeeping burden.

---

## 8. Data Requirements

### 8.1 What the product must hold

| Domain | Data |
|---|---|
| Reference — crops | Name, local name, national average yield, potential yield |
| Reference — prices | Input name, category, unit, year, price, price basis, source |
| Reference — norms | Crop, input, quantity required per acre, applicable window, source |
| Reference — advice | One message per category |
| Reference — settings | Price multiplier, flag threshold |
| Reference — translations | Cached Khaya translations of advice, with a reviewed flag |
| Farmer — profile | Phone, linked email, full name, preferred language, auth method |
| Farmer — farm | Name, district, region, total area, weekly check-in day |
| Farmer — season | Crop, year, window, area planted, harvest quantity and unit, revenue, completion status |
| Farmer — costs | Category, description, quantity, unit, unit price, amount, date |
| Farmer — budgets | Five independent, optional caps (§7.15): per season+category, per crop total, per farm total, per category farm-wide, and per crop+category |
| Output — estimate | Method, seasons used, area, total, settings snapshot, timestamp |
| Output — lines | Category, estimated amount, benchmark amount, variance, flag, advice, potential saving |
| Sync | Device-generated `client_id` and `updated_at` on seasons and costs, for idempotent offline flush |
| Rollups | Farm-level and crop-level aggregates, as views rather than stored tables |

Full schema in `FarmPilot_SDD.md` §6. Twelve tables, three views.

### 8.2 Benchmark data — the critical dependency

The benchmark is what makes overspend detectable. It requires two things
per crop:

1. **A price per unit** — what a bag of NPK costs
2. **A quantity per acre** — how many bags an acre of maize needs

Multiplied together and summed by category, these give the expected
cost per acre.

| Data | Source | Status |
|---|---|---|
| Crop yields | MoFA *Facts & Figures* 2018, Table 4.6 | Obtained |
| Input unit prices | MoFA *Facts & Figures* 2018, Table 7.3 | Obtained, 2018 basis |
| Fertiliser subsidy structure | MoFA *Facts & Figures* 2018, Table 7.5 | Obtained |
| Application rates per acre | Family commercial farm records (~100 acres) | To collect |
| Labour rate per person-day | Family farm records | To collect |
| Person-days per acre by activity | Family farm records | To collect |
| Tractor ploughing per acre | Family farm records | To collect |
| Seed price per kg | Family farm records | To collect |
| Transport per bag | Family farm records | To collect |
| Current input prices | Family farm records or farmer entry | To collect |

### 8.3 Benchmark isolation requirement

**All benchmark values must reside in `cost_benchmarks`,
`crop_input_norms`, and `app_settings` only.**

This is a hard requirement, not a preference. It exists so the system can
be built and tested to completion with placeholder values, and the real
figures dropped in late without touching a single component or function.

Verification: setting a placeholder to an absurd value (ploughing at GHS
5 per acre) must visibly change the report total. If it does not, a value
has been hardcoded somewhere and the requirement is violated.

### 8.4 Known data-integrity issue, fixed

`crop_input_norms` carries a uniqueness constraint on
`(crop_id, benchmark_id, season_window)` so the same input cannot be
seeded twice for a crop. Postgres never treats two `NULL` values as
equal for uniqueness purposes, and every seeded row has
`season_window = NULL` (it applies to every window) — so the constraint
silently permitted unlimited duplicate rows. Re-running the seed script
against the live database five times over the project's iteration left
five copies of every Maize input, inflating every benchmark and
"estimated cost" figure in the app by 5×. Fixed by de-duplicating the
existing rows and replacing the constraint with two partial unique
indexes — one for a specific window, one for `season_window IS NULL` —
which is the correct way to enforce "NULL counts as a real, comparable
value" in Postgres. See SDD §6.5.

### 8.5 Data collection responsibility

Collecting §8.2 rows marked "to collect" is a task with a named owner and
a deadline, tracked separately from the build. The build does not block on
it; the demo does.

---

## 9. Content Requirements

### 9.1 Advice messages

One per category, stored in `advice_rules`. Each must name a specific
mechanism, not a general instruction.

| Category | Mechanism the advice must reference |
|---|---|
| Fertiliser | Government subsidy — roughly half price — and the district MoFA office as the point of contact |
| Seeds | Certified seed from registered dealers; saved seed viable for one further generation |
| Agrochemicals | Spray on inspection rather than schedule; check dilution rate |
| Land preparation | Shared tractor booking; minimum tillage on land already under cultivation |
| Labour | Timely first weeding reduces total rounds; nnoboa labour exchange reduces cash outlay |
| Transport | Load aggregation with neighbouring farms; farmgate sale where the price gap is below haulage cost |
| Storage | Sack reuse; storage losses driving repeat purchase |
| Other | Move recurring items into a specific category to enable comparison |

### 9.2 Tone and language

- Plain English, short sentences, no agricultural jargon without explanation
- Amounts always written as `GHS 1,234.56`
- Never state a saving as certain — "possible saving", not "you will save"
- Where benchmark data is unverified, the report says so

### 9.3 Empty and first-run states

| State | Content |
|---|---|
| No farm | "Tell us about your farm to get started." |
| No seasons | "Add your first season to begin recording costs." |
| No costs on a season | "Add what you have spent so far. You need at least one item before we can estimate." |
| Estimate from benchmark | "Based on standard rates for maize. Record this season and next year's estimate will use your own figures." |
| No flags raised | "Nothing stands out as high this season." |
| Estimate requested with nothing to show yet | An interactive checklist of expected categories, each marked fixed or needing fixing, so the farmer knows exactly what to record next instead of a dead end |
| Recorded cost category on the report | Labelled "Recorded" |
| Not-yet-recorded cost category on the report | Labelled "Predicted" |

---

## 10. User Flows

### 10.1 First-time user

```
  Sign up
     │
     ▼
  Farm setup ─── name, district, total acres
     │
     ▼
  Dashboard (empty)
     │
     ▼
  New season ─── crop, year, window, area planted
     │
     ▼
  Season detail ─── add cost items, one at a time
     │              ┌──────────────┐
     │              │ repeat 5–10× │
     │              └──────┬───────┘
     ▼                     │
  Generate estimate ◄──────┘
     │
     ▼
  Report ─── total · breakdown · flags · advice · possible saving
```

### 10.2 Returning user, second season

```
  Sign in
     │
     ▼
  Dashboard ─── previous season shown as complete
     │
     ▼
  New season ─── same crop, next window
     │
     ▼
  Season detail ─── record costs
     │
     ▼
  Generate estimate
     │
     ▼
  Report ─── now states "based on your 1 previous season"
             comparison still against benchmark
```

### 10.3 Cost entry — two paths

```
                  Add cost item
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
   Knows the total            Knows quantity and rate
          │                           │
   category + amount          category + quantity
          │                   + unit + unit price
          │                           │
          │                           ▼
          │                   amount computed
          └─────────────┬─────────────┘
                        ▼
                 Saved to season
```

Both paths are first-class. The second yields richer data — the farmer's
actual usage rate and actual price paid — and should be encouraged
through form design, but never required.

---

## 11. Screen Requirements

| # | Screen | Must contain | Primary action |
|---|---|---|---|
| 1 | Sign up | Email, password, confirm password, link to sign in | Create account |
| 2 | Sign in | Email, password, link to sign up | Sign in |
| 3 | Farm setup | Farm name, district, region, total acres | Save and continue |
| 4 | Dashboard | Farm-level totals (seasons, crops, planted acres, recorded, estimated, possible saving); per-crop table with cost per acre; season cards showing crop, year, window, recorded total, status; quick "Add Cost" entry (season picker if more than one active season); empty state | New season |
| 5 | New season | Crop select, year, window select, area planted with farm total shown for reference | Create season |
| 6 | Season detail | Season header; cost item list with category, description, amount, delete; add-cost form (with per-category "don't know this cost" benchmark fill); running total; close-season control | Generate estimate |
| 7 | Report | Estimated total; method note; category breakdown with amount, share, and a Recorded/Predicted label per category; flagged categories first and visually distinct, each with variance, possible saving, and advice; audio playback where a local language is selected; total possible saving; where there is nothing to show yet, an interactive cost-tracking checklist in place of a dead end | Back to season |
| 8 | Settings | Preferred language; link an email address to a phone account | Save |
| 9 | Budgets | Stat row (Farm Budget, farm spent, budgets set, over-budget count); Farm Budget cap; donut chart of farm-wide category allocation; By Category / By Crop card grids, each with a progress bar and inline edit; a crop card expands to that crop's own category caps; search and an All / Over Budget / Not Set filter; a read-only breakdown of actual spend by season and crop | Set/edit a budget |

### 11.1 Report layout requirement

```
┌─────────────────────────────────────────────────────┐
│  Maize · Minor 2026 · 2.0 acres                     │
│                                                     │
│  Estimated cost for this season                     │
│  GHS 5,336.00                                       │
│  Based on standard rates (no previous seasons yet)  │
├─────────────────────────────────────────────────────┤
│  WHERE YOUR MONEY GOES                              │
│                                                     │
│  Fertiliser   GHS 2,360   ████████████████  44%     │
│  Labour       GHS 1,440   ██████████        27%     │
│  Land prep    GHS   700   █████             13%     │
│  Agrochem     GHS   320   ██                 6%     │
│  Seeds        GHS   300   ██                 6%     │
│  Storage      GHS   216   █                  4%     │
├─────────────────────────────────────────────────────┤
│  ⚠  WHERE YOU CAN SAVE                              │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ FERTILISER            +52.5% above expected   │  │
│  │ Possible saving: GHS 1,240                    │  │
│  │                                               │  │
│  │ Government subsidy cuts NPK and Urea by about │  │
│  │ half. Check with your district MoFA office    │  │
│  │ for the subsidy window before buying at       │  │
│  │ market price.                                 │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Total possible saving: GHS 1,240                   │
└─────────────────────────────────────────────────────┘
```

Each line in "Where Your Money Goes" additionally carries a small
Recorded/Predicted label (omitted from the mockup for space) — Recorded
where the farmer has actually logged that category this season,
Predicted where the figure is still the standard rate or their own
history. Only Recorded lines can be flagged.

### 11.2 Responsive requirement

Every screen must be usable at 360px width. The report must not require
horizontal scrolling. Tables become stacked rows below 480px.

---

## 12. Business Rules

| ID | Rule |
|---|---|
| BR-1 | A season is uniquely identified by farm, crop, year, and window |
| BR-2 | A farmer may plant the same crop in two different windows of one year |
| BR-3 | Area planted may not exceed the farm's total area |
| BR-4 | A season contributes to history only when marked complete and holding at least one cost item |
| BR-5 | Method is `history` where one or more prior completed seasons of the same crop exist on the same farm; otherwise `benchmark`. Method governs the *prediction* shown for a category the farmer has not yet recorded a cost for this season — it does not change what a recorded category is compared against |
| BR-6 | Comparison is always against benchmark, never against the farmer's own history — history informs the prediction only. Comparison happens only for a category the farmer has actually recorded a cost for this season (`is_actual = true`); a category still showing a prediction has no comparison to make yet |
| BR-7 | A category is flagged where variance exceeds the threshold, default 30% |
| BR-8 | A category with no benchmark is displayed but never flagged |
| BR-9 | Potential saving is the amount above benchmark, never negative |
| BR-10 | Every flagged category carries advice; no flag may appear without it |
| BR-11 | All money is stored and computed in integer pesewas; cedis appear only at render |
| BR-12 | All comparison is per acre |
| BR-13 | An estimate stores the price multiplier in force when it ran |
| BR-14 | Re-running an estimate creates a new record; prior estimates are retained |
| BR-15 | Farm-level rollups count only the most recent estimate per season |
| BR-16 | A phone number identifies exactly one account; normalisation happens before lookup |
| BR-17 | An offline write carries a device-generated `client_id`; a replay of the same `client_id` is ignored, never duplicated |
| BR-18 | A cached translation is served in preference to a fresh API call |
| BR-19 | Every budget tier (§7.15) is independent and optional; none require reconciliation against one another, and a "spent" figure is always computed from `season_costs`, never entered separately |

---

## 13. Edge Cases and Error Handling

| # | Situation | Required behaviour |
|---|---|---|
| E1 | Estimate requested with no cost items | Action disabled with explanatory text; no error state |
| E2 | Crop selected has no benchmark norms | Estimate returns only categories the farmer has actually recorded, each shown as "Recorded" with no benchmark comparison (`other`-category treatment); if nothing has been recorded either, the report shows the interactive checklist (FR-9.10/9.11) using the general fallback categories instead of a dead end |
| E3 | Farmer records a category with no benchmark, e.g. "other" | Included in total, shown in breakdown, never flagged |
| E4 | Area planted entered as zero | Rejected client-side and by database constraint |
| E5 | Area planted exceeds farm total | Rejected with a message naming the farm total |
| E6 | Duplicate season for same crop, year, window | Rejected with a message pointing to the existing season |
| E7 | Negative amount entered | Rejected client-side and by database constraint |
| E8 | Farmer's spending is below benchmark in every category | Report shows no flags and the "nothing stands out" state |
| E9 | Estimate generation fails mid-way | Transactional — no partial estimate written; error surfaced to the user |
| E10 | Session expires during data entry | User redirected to sign-in; unsaved form input is lost and the user is told so |
| E11 | Network unavailable on save | Error shown, entry retained in the form for retry |
| E12 | Second user attempts to read another's data | Returns zero rows; no error revealing existence |
| E13 | Benchmark rows still hold placeholder values at demo | Report displays a notice that standard rates are provisional |
| E14 | Same phone entered in different formats | Normalised before lookup; resolves to one account |
| E15 | Phone number fails Ghana format validation | Rejected client-side with the expected format shown |
| E16 | Offline flush interrupted, then retried | `client_id` collision treated as already applied; queue entry removed, no duplicate |
| E17 | Offline write fails five times | Moved to a visible failed list with a retry control; never silently dropped |
| E18 | User attempts to generate an estimate offline | Control disabled with the reason stated |
| E19 | Khaya API unavailable | English shown; no error surfaced to the farmer |
| E20 | Farmer has seasons but no estimates yet | Dashboard shows recorded totals with a shortcut to generate |

---

## 14. Non-Functional Requirements

| ID | Requirement | Target | Verification |
|---|---|---|---|
| NFR-1 | Estimate generation | < 2s for 50 cost items | Timed test |
| NFR-2 | Report render | < 3s on 3G | Throttled test |
| NFR-3 | Mobile usability | Functional at 360px | Device test |
| NFR-4 | Data isolation | Zero cross-user rows | Two-account test |
| NFR-5 | Monetary accuracy | No rounding drift | Sum reconciliation |
| NFR-6 | Reproducibility | Rebuild from migrations with no manual steps | Fresh-project test |
| NFR-7 | Source traceability | Every benchmark row carries a source | NOT NULL constraint |
| NFR-8 | Availability | Best effort — free-tier hosting | Accepted limitation |
| NFR-9 | Browser support | Current Chrome, Firefox, Safari; Android Chrome | Manual check |

---

## 15. Out of Scope

**Moved into scope since v0.1:** offline capture (P1, §7.12) and local
languages (P2, §7.13). Both ship only if the P0 work is complete — see
§19.

| Excluded | Reason |
|---|---|
| Multiple farms per user | Not required to demonstrate the concept |
| Field officer / aggregator accounts | Valuable and designed for, but not buildable in the window |
| Farm modifiers — soil, tenure, terrain, mechanisation | Requires multipliers that cannot be sourced in time |
| Pest and disease risk | A separate project |
| Farmer-added cost categories | Would break the benchmark comparison |
| SMS OTP phone verification | Requires a paid SMS provider |
| SMS or USSD access | Different delivery channel entirely |
| Market price integration | No available data source |
| Cost per bag harvested | The correct efficiency measure, but requires reliable harvest data across seasons |
| Regional benchmark variation | Requires regional data not available |
| Loan or credit features | Regulated activity |
| Separate Python calculation service | Unnecessary for the computation being performed |

---

## 16. Assumptions

| # | Assumption | If wrong |
|---|---|---|
| A1 | Users have a smartphone or laptop with intermittent internet | Product is unusable for those users; noted as a limitation |
| A2 | Users can read functional English | Adoption limited; local language (§7.13) moves from P2 to required |
| A8 | Users accept an unverified phone number as their identifier | Low risk — nothing is sent to the number; SMS OTP is the documented upgrade path |
| A9 | Khaya API remains available and free at the tier needed | Local language feature drops; it is P2 and non-blocking |
| A3 | Farmers can recall approximate season spending | Estimates degrade in accuracy; the quantity-and-rate path partially mitigates |
| A4 | Family farm records are obtainable within the window | Placeholders remain; product still functions, benchmark is not defensible |
| A5 | Family farm figures are transferable to smallholder scale | Benchmark reads as an efficiency ceiling rather than a realistic target — must be stated in the report |
| A6 | Maize is representative enough as the demonstration crop | Additional crops needed; schema already supports them |
| A7 | The 50% fertiliser subsidy structure still applies | The fertiliser advice becomes inaccurate; must be verified before demo |

### 16.4 Note on the removed Python service

The approved proposal specified a Python/FastAPI service for
calculations. It has been removed. The computation is sums, averages, and
a percentage comparison over the user's own rows — relational work that
runs faster and more securely inside the database, with row-level
authorisation applied automatically rather than re-implemented. Removing
it eliminates a second deployment, cross-service authentication, and CORS
configuration, none of which contribute to the product. The trade-off —
business logic in PL/pgSQL is harder to unit test — is documented and
accepted.

---

## 17. Dependencies

| # | Dependency | Owner | Needed by | Blocking |
|---|---|---|---|---|
| D1 | Supabase project provisioned | Team | Day 1 | Everything |
| D2 | Schema migration applied | Osmond | Day 1 | All development |
| D3 | Placeholder seed data loaded | Osmond | Day 1 | Estimate testing |
| D4 | Family farm records obtained | Osmond | Day 10 | Demo credibility, not the build |
| D5 | Subsidy structure verified current | Team | Day 12 | Accuracy of fertiliser advice |
| D6 | Vercel deployment configured | Jeffery | Day 12 | Demo |
| D7 | GitHub repository with branch protection | Team | Day 1 | Collaboration |
| D8 | Khaya API key obtained from translation.ghananlp.org | Team | Day 13 | Local languages only (P2) |

**D4 is the only dependency the product's credibility rests on, and the
only one outside the team's direct control. The request for those records
should be made on day 1, not day 10.**

---

## 18. Release Criteria

The product ships when all of the following hold.

### 18.1 Functional

- [ ] Every P0 requirement in §7 is implemented and passing
- [ ] A new user can complete sign-up → farm → season → costs → estimate → report without assistance
- [ ] The report displays at least one flagged category with advice on the demonstration data
- [ ] Both cost entry paths — amount only, and quantity × rate — work

### 18.2 Data

- [ ] All placeholder benchmark rows replaced, or explicitly labelled as provisional in the report
- [ ] Every `cost_benchmarks` row has a non-null source
- [ ] Maize has complete norms across all applicable categories

### 18.3 Technical

- [ ] Two-account test confirms zero cross-user data access
- [ ] Absurd-value test confirms no hardcoded rates
- [ ] Migration runs clean on a fresh Supabase project
- [ ] Deployed and reachable at a public URL

### 18.4 Documentation

- [ ] SDD complete and matching the built system
- [ ] Final report includes sources, limitations, and excluded scope
- [ ] README includes setup instructions and environment variables

---

## 19. Delivery Plan

| Stage | Days | Output | Owner |
|---|---|---|---|
| **1 — Foundation** | 1 | Supabase project, schema, placeholder seed, React scaffold, crops rendering from database | All three, together |
| **2 — Capture** | 2–5 | Auth, farm setup, season creation, cost entry with running total | Jeffery: auth + farm · Ayisha: cost entry · Osmond: season |
| **3 — Engine** | 6–9 | `generate_estimate` wired, report screen, flags and advice rendering | Osmond: function · Ayisha: report UI · Jeffery: integration |
| **4 — Dashboard** | 9–10 | Farm and crop rollups | Jeffery |
| **5 — Benchmark swap** | 10–12 | Real benchmark data loaded, estimates recalculated | Osmond |
| **6 — Hardening** | 13 | Security audit, error handling, accessibility, deploy | All three |
| **7 — Optional** | 13 | Offline capture (P1), then local languages (P2) | If and only if stage 6 is complete |
| **8 — Close** | 14 | Final report, demo rehearsal | All three |

**Ordering note.** Hardening comes before the optional stages
deliberately. A polished English app that works beats a half-translated
one that does not, and the assessment is on whether the system runs.

### 19.1 Parallel track

Requesting family farm records starts **day 1**, not day 10. The build
does not wait on it; the request should not wait either.

### 19.2 Working agreement

- Schema frozen at end of day 1; changes require agreement from all three
- Branch per developer, pull request into `main`, one reviewer
- No direct pushes to `main`
- The typed data access layer is the contract between frontend work streams

---

## 20. Open Questions

| # | Question | Owner | Needed by |
|---|---|---|---|
| Q1 | Do the family farm records exist in writing, or only in recall? | Osmond | Day 2 |
| Q2 | Which crops does the family farm cover — is maize among them? | Osmond | Day 2 |
| Q3 | Does the 50% fertiliser subsidy still operate in 2026? | Team | Day 12 |
| Q4 | Is 30% the right flag threshold, or too sensitive once real data is loaded? | Team | Day 11 |
| Q5 | Should a farmer with zero seasons see a benchmark estimate immediately, or be prompted to record first? | Team | Day 6 |
| Q6 | Is harvest quantity required to close a season, or optional? | Team | Day 5 |

---

## 21. Appendix — Requirements Traceability

| Goal | Requirements | Verified by |
|---|---|---|
| G1 — Estimate with no history | FR-6.2, FR-6.4 | Functional test, new account |
| G2 — Category breakdown | FR-6.5, FR-9.2 | Report inspection |
| G3 — Identify overspend | FR-7.1 – FR-7.5 | Inflated-category test |
| G4 — Actionable advice | FR-8.1, FR-8.3, §9.1 | Content review |
| G5 — Quantified saving | FR-7.5, FR-9.5, FR-9.6 | Report inspection |
| G6 — Under ten minutes | FR-4.1 – FR-4.8 | Timed walkthrough |
| G7 — Data swappable without code change | §8.3, FR-8.2 | Absurd-value test |
| G8 — Data modelling | SDD §6 | Schema review |
| G9 — Row-level authorisation | FR-10.1, FR-10.2 | Two-account test |
| G10 — Logic in database | FR-6.1 – FR-6.7 | Code review |
| G11 — Working deployed system | §18.3 | Public URL |
| G12 — Honest documentation | §15, §16, SDD §17 | Report review |

---

*End of document.*
