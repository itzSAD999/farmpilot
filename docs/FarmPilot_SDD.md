# FarmPilot — System Architecture & Design Document

**Kwame Nkrumah University of Science and Technology**
Department of Computer Science · Mini Project 2025/2026

| | |
|---|---|
| **Document type** | Software Design Document (SDD) / System Architecture Document |
| **Version** | 1.2 |
| **Changes in 1.2** | `generate_estimate()` rewritten to compare this season's actually-recorded costs against benchmark, not a prediction against itself (§9.2); `estimate_lines.is_actual` added; `get_category_benchmark_pesewas()` RPC for per-category "don't know this cost" fill (§7.1); fixed `crop_input_norms` duplicate-row bug via partial unique indexes (§6.5); interactive cost-tracking checklist replaces the report's dead-end empty state (§13.1) |
| **Changes in 1.1** | Phone-first auth (profiles) · sync columns · rollup views · translation cache |
| **Project** | FarmPilot — farm cost estimation and reduction tool |
| **Team** | Osmond Abdul-Karim Woriwi (21034402) · Aboagye Jeffery Ohene (21013336) · Ayisha Abdullah (20950630) |
| **Programme** | BSc Computer Science, Year 3 |

---

## Table of Contents

1. Purpose and Scope
2. System Overview
3. Architecture
4. Technology Stack
5. Component Design
6. Data Architecture
7. Data Access Layer
8. Security Architecture
9. The Estimation Engine
10. User Stories
11. Use Cases
12. Sequence Diagrams
13. Screen Specifications
14. Non-Functional Requirements
15. Testing Strategy
16. Deployment
17. Risks and Mitigations
18. Future Work
19. Localisation — Twi Translation and Audio (Khaya AI)

---

## 1. Purpose and Scope

### 1.1 Purpose

This document describes the complete technical design of FarmPilot: its
architecture, data model, security model, calculation logic, and the
behaviour expected of each component. It is the reference the
implementation is built against.

### 1.2 Scope

FarmPilot is a web application that allows a small-scale farmer to record
farm spending and receive (a) an estimate of what the coming season
should cost and (b) specific indications of where that cost is higher
than it needs to be.

**In scope:** farmer authentication, farm and season records, itemised
cost capture, cost estimation, overspend detection, cost-reduction
suggestions.

**Out of scope:** offline operation, local-language interface, SMS or USSD
access, market price integration, weather data, yield prediction,
multi-farm portfolios, farmer-to-farmer comparison.

### 1.3 Definitions

| Term | Meaning |
|---|---|
| **Season** | One planting of one crop on one farm in one window of one year |
| **Window** | Major (Mar–Jul), minor (Sep–Nov), or dry (irrigated off-season) |
| **Benchmark** | Externally sourced expected cost, used as the comparison point |
| **Norm** | Quantity of an input required per acre for a given crop |
| **Pesewa** | 1/100 of a Ghana cedi; the unit all money is stored in |
| **Variance** | Percentage by which an estimate exceeds its benchmark |
| **Flag** | A category whose variance exceeds the configured threshold |

---

## 2. System Overview

### 2.1 The problem being solved

Small-scale farmers in Ghana spend on seeds, fertiliser, labour, and
transport each season without recording it. Because nothing is written
down, a farmer cannot say what a season should cost or where he is
spending more than necessary. The result is recurring overspend and
reduced profit.

### 2.2 What the system does

```
   ┌──────────┐      ┌───────────┐      ┌──────────┐
   │  RECORD  │ ───► │  ESTIMATE │ ───► │  REDUCE  │
   └──────────┘      └───────────┘      └──────────┘
   Farm details      Expected cost      Flagged
   Season details    for the season     categories +
   Cost items        by category        suggestions
```

### 2.3 The central design problem

The proposal specifies that estimates come from the farmer's own records.
A new farmer has none. Furthermore, comparing a farmer only against
himself makes overspend undetectable — his figures would always equal his
own baseline and variance would always be zero.

**Resolution:** the system carries an independent reference layer of
benchmark data. This serves two purposes simultaneously:

1. It produces an estimate for a farmer with no history (cold start).
2. It provides the external comparison point that makes "overspending"
   a meaningful statement.

Benchmark cost is derived as:

```
  cost per acre  =  Σ ( quantity_per_acre  ×  price_per_unit )
                      └── crop_input_norms   └── cost_benchmarks
```

### 2.4 Benchmark data provenance

| Data | Source |
|---|---|
| Crop yields | MoFA *Agriculture in Ghana: Facts & Figures*, Table 4.6 |
| Input unit prices | MoFA *Facts & Figures*, Table 7.3 |
| Fertiliser subsidy rates | MoFA *Facts & Figures*, Table 7.5 |
| Application rates per acre | Family commercial farm records (~100 acres) |
| Labour, ploughing, transport rates | Family farm records + local field survey |

Benchmark values are isolated in two tables. They are seeded with
placeholders during development and replaced with real figures before
final testing. **No component or function outside those tables contains a
rate or price.** This is what allows the data to arrive late without any
code change.

---

## 3. Architecture

### 3.1 Architectural style

Two-tier, client-to-database, with business logic held in the database
layer. There is no intermediate application server.

### 3.2 Deployment view

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT TIER                            │
│                                                                 │
│   Browser (farmer's phone or laptop)                            │
│   ┌──────────────────────────────────────────────────────┐      │
│   │  React 18 + TypeScript  (static bundle on Vercel)    │      │
│   │  ├── Pages / Routes                                  │      │
│   │  ├── Components                                      │      │
│   │  ├── Data access layer (typed Supabase queries)      │      │
│   │  └── supabase-js client  ── holds anon key + JWT     │      │
│   └──────────────────────────────────────────────────────┘      │
└────────────────────────────┬────────────────────────────────────┘
                             │  HTTPS · PostgREST · JWT bearer
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE (managed)                         │
│                                                                 │
│   ┌────────────────┐  ┌──────────────────────────────────────┐  │
│   │   GoTrue Auth  │  │           PostgREST API              │  │
│   │  email + pass  │  │  auto-generated REST over tables,    │  │
│   │  issues JWT    │  │  views, and RPC functions            │  │
│   └───────┬────────┘  └───────────────┬──────────────────────┘  │
│           │                           │                         │
│           ▼                           ▼                         │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    PostgreSQL 15                        │   │
│   │  ┌───────────────────────────────────────────────────┐  │   │
│   │  │  ROW LEVEL SECURITY  — enforced on every query    │  │   │
│   │  └───────────────────────────────────────────────────┘  │   │
│   │  Reference tables · Farmer tables · Output tables       │   │
│   │  generate_estimate()  ·  v_estimate_report              │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Why no application server

The original proposal specified a Python/FastAPI service for
calculations. This was removed. The reasoning:

| Consideration | Outcome |
|---|---|
| Nature of the computation | Sums, averages, and a percentage comparison over the user's own rows — relational work |
| Data locality | Calculating in the database avoids transferring every cost row to a service and back |
| Deployment cost | One deployment instead of two |
| Integration cost | No CORS configuration, no JWT forwarding between services, no shared secret management |
| Security | RLS is enforced automatically; an external service would need to re-implement authorisation |
| Team size and timeline | Three developers, fourteen days |

Trade-off accepted: business logic in PL/pgSQL is harder to unit test than
Python and ties the system to PostgreSQL. Both are acceptable for a
project of this scope, and PostgreSQL is not a dependency the project
would want to remove.

### 3.4 Layered view

| Layer | Responsibility | Implementation |
|---|---|---|
| Presentation | Rendering, input capture, validation feedback | React components |
| Routing / state | Navigation, session, server-state caching | React Router, TanStack Query |
| Data access | Typed functions wrapping every query | `src/api/*.ts` |
| Transport | REST, auth headers, serialisation | `supabase-js` |
| Authorisation | Row-level access control | Postgres RLS policies |
| Business logic | Estimation and flagging | `generate_estimate()` |
| Persistence | Storage and integrity constraints | PostgreSQL tables |

---

## 4. Technology Stack

| Concern | Choice | Justification |
|---|---|---|
| UI framework | React 18 | Component model suits repeated form and list structures; team familiarity |
| Language | TypeScript | Types generated from the database schema catch field-name and shape errors at compile time |
| Build tool | Vite | Fast dev server and simple static output for Vercel |
| Styling | Tailwind CSS | Utility classes avoid a separate stylesheet architecture on a short timeline |
| Server state | TanStack Query | Caching and invalidation for read-heavy screens without hand-written state logic |
| Forms | React Hook Form + Zod | Schema-based validation mirroring database constraints |
| Auth | Supabase Auth (GoTrue) | Issues the JWT that RLS depends on; no custom auth code |
| Database | PostgreSQL 15 (Supabase) | Enums, constraints, RLS, and PL/pgSQL all required by the design |
| API | PostgREST (Supabase) | Generated from schema; no endpoint code to write or maintain |
| Business logic | PL/pgSQL function | Runs next to the data it reads |
| Frontend hosting | Vercel | Git-push deployment, free tier, HTTPS by default |
| Offline shell | vite-plugin-pwa + IndexedDB (idb) | Cost entry happens in a field; writes queue locally and flush on reconnect (P1) |
| Local languages | Khaya AI API, Ghana NLP | Translation and text-to-speech for Twi, Ewe, Ga, Dagbani, Frafra (P2) |
| AI Integration | Claude / OpenRouter | FarmBot uses OpenRouter to access Claude, providing intelligent, context-aware agricultural advice based on real-time farm state. |
| Version control | Git / GitHub | Branch-per-developer with review before merge |

---

## 5. Component Design

### 5.1 Frontend structure

```
src/
├── main.tsx                    entry, providers
├── App.tsx                     route table
├── lib/
│   ├── supabase.ts             client singleton
│   ├── database.types.ts       generated from schema
│   └── money.ts                pesewa ↔ cedi formatting
├── api/                        DATA ACCESS LAYER
│   ├── farms.ts                getFarm, createFarm
│   ├── seasons.ts              listSeasons, createSeason, completeSeason
│   ├── costs.ts                listCosts, addCost, deleteCost
│   ├── crops.ts                 getCrops
│   ├── estimates.ts            generateEstimate, getReport
│   └── ai.ts                   askFarmBot
├── components/
│   ├── layout/                 AppShell, Header, ProtectedRoute
│   ├── ui/                     Button, Input, Select, Card, Table, Money
│   ├── features/                WeeklyCatchUp, CostList
│   └── domain/                 FarmBot, AddCostForm, GhanaMap
├── pages/
│   ├── SignIn.tsx
│   ├── SignUp.tsx
│   ├── FarmSetup.tsx
│   ├── Dashboard.tsx
│   ├── SeasonNew.tsx
│   ├── SeasonDetail.tsx        cost entry lives here
│   └── EstimateReport.tsx
└── hooks/
    ├── useAuth.ts
    └── useFarm.ts
```

### 5.2 Component responsibilities

| Component | Responsibility |
|---|---|
| `ProtectedRoute` | Redirects to sign-in when no session exists |
| `AppShell` | Header, navigation, sign-out |
| `FarmSetup` | One-time farm creation; blocks the dashboard until complete |
| `Dashboard` | Lists seasons with status and total recorded so far |
| `SeasonNew` | Crop, year, season_window, area planted |
| `SeasonDetail` | Cost list plus the add-cost form; triggers estimate generation |
| `WeeklyCatchUp` | Standing weekly prompt on the dashboard; asks per expected category across all active seasons, writes ordinary `season_costs` rows on answer |
| `EstimateReport` | Total, per-category breakdown (Recorded/Predicted), flags, advice, potential saving; interactive checklist when there is nothing to show yet |
| `Money` | Renders pesewas as `GHS 1,234.56`; the only place formatting occurs |

### 5.3 The money rule

Pesewas are integers everywhere — database, API layer, component props,
and state. Conversion to cedis happens exclusively inside the `Money`
component at render time. No arithmetic is performed on a cedi value
anywhere in the system.

---

## 6. Data Architecture

### 6.1 Layer model

Twelve tables in three layers, plus three views. The layer determines
write access, which makes the layer boundary the security boundary.

| Layer | Tables | Written by |
|---|---|---|
| Reference | `app_settings`, `crops`, `cost_benchmarks`, `crop_input_norms`, `advice_rules`, `advice_translations` | Developers, via migration (translations also written on first fetch) |
| Farmer records | `profiles`, `farms`, `seasons`, `season_costs` | The authenticated farmer |
| Output | `estimates`, `estimate_lines` | `generate_estimate()` |

**Views:** `v_estimate_report` (report screen), `v_farm_summary` and
`v_crop_summary` (dashboard rollups).

### 6.2 Entity relationship diagram

```
                      ┌──────────────┐
                      │  auth.users  │
                      └──────┬───────┘
                             │ 1
                             │
                             ▼ N
                      ┌──────────────┐
                      │    farms     │
                      │──────────────│
                      │ id           │
                      │ user_id  FK  │
                      │ name         │
                      │ district     │
                      │ total_area   │
                      │ check_in_day │
                      └──────┬───────┘
                             │ 1
                             ▼ N
   ┌──────────┐       ┌──────────────┐       ┌──────────────────┐
   │  crops   │──1──N▶│   seasons    │◀─1──N─│   season_costs   │
   │──────────│       │──────────────│       │──────────────────│
   │ id       │       │ id           │       │ id               │
   │ name     │       │ farm_id  FK  │       │ season_id    FK  │
   │ avg_yield│       │ crop_id  FK  │       │ category   ENUM  │
   │ potential│       │ year         │       │ description      │
   └────┬─────┘       │ season_window  ENUM │       │ quantity         │
        │ 1           │ area_planted │       │ unit             │
        │             │ harvest_qty  │       │ unit_cost_pesewas│
        ▼ N           │ revenue      │       │ amount_pesewas   │
   ┌──────────────┐   │ is_complete  │       │ date_incurred    │
   │crop_input_   │   └──────┬───────┘       └──────────────────┘
   │    norms     │          │ 1
   │──────────────│          ▼ N
   │ id           │   ┌──────────────┐
   │ crop_id   FK │   │  estimates   │
   │ benchmark_id │   │──────────────│
   │ category     │   │ id           │
   │ qty_per_acre │   │ season_id FK │
   │ window       │   │ method  ENUM │
   │ source       │   │ seasons_used │
   └──────┬───────┘   │ area_acres   │
          │ N         │ total_pesewas│
          │           │ price_mult   │
          ▼ 1         └──────┬───────┘
   ┌──────────────┐          │ 1
   │cost_         │          ▼ N
   │  benchmarks  │   ┌────────────────────┐
   │──────────────│   │  estimate_lines    │
   │ id           │   │────────────────────│
   │ input_name   │   │ id                 │
   │ category     │   │ estimate_id    FK  │
   │ unit         │   │ category     ENUM  │
   │ year         │   │ estimated_pesewas  │
   │ price_pesewas│   │ benchmark_pesewas  │
   │ basis   ENUM │   │ variance_pct       │
   │ source       │   │ is_flagged         │
   └──────────────┘   │ advice             │
                      │ potential_saving   │
   ┌──────────────┐   └────────────────────┘
   │ advice_rules │
   │──────────────│   ┌──────────────┐
   │ category  UQ │   │ app_settings │
   │ message      │   │ price_mult   │
   └──────────────┘   │ flag_thresh  │
                      └──────────────┘
```

`estimate_lines` also carries `is_actual boolean` (added in migration
010, omitted from the diagram above for space): true when
`estimated_pesewas` is the farmer's own recorded `season_costs` sum for
that category this season, false when it is still a prediction. See
§9.2.

### 6.3 Enumerated types

| Enum | Values |
|---|---|
| `cost_category` | seeds, fertiliser, agrochem, land_prep, labour, transport, storage, other |
| `season_window` | major, minor, dry |
| `price_basis` | subsidised, open_market |
| `estimate_method` | benchmark, blended, history |

### 6.4 Relationship rules

| Parent | Child | Cardinality | On delete |
|---|---|---|---|
| `auth.users` | `farms` | 1 : N | cascade |
| `farms` | `seasons` | 1 : N | cascade |
| `crops` | `seasons` | 1 : N | restrict |
| `seasons` | `season_costs` | 1 : N | cascade |
| `seasons` | `estimates` | 1 : N | cascade |
| `estimates` | `estimate_lines` | 1 : N | cascade |
| `crops` | `crop_input_norms` | 1 : N | cascade |
| `cost_benchmarks` | `crop_input_norms` | 1 : N | restrict |

`restrict` protects reference data from deletion while it is in use.
`cascade` ensures no orphaned farmer records.

### 6.5 Constraints of note

| Constraint | Purpose |
|---|---|
| `seasons` unique (farm, crop, year, season_window) | A farmer may grow maize in both major and minor season of one year, but not twice in the same season_window |
| `area_planted_acres > 0` | Division by area occurs in every comparison |
| `amount_pesewas >= 0`, NOT NULL | The only mandatory field on a cost entry |
| `app_settings` single-row check | Prevents multiple conflicting configurations |
| `cost_benchmarks` unique (name, unit, year, basis) | Allows the same input at subsidised and open-market prices |
| `crop_input_norms` two partial unique indexes: `(crop_id, benchmark_id, season_window) WHERE season_window IS NOT NULL`, and `(crop_id, benchmark_id) WHERE season_window IS NULL` | Prevents duplicate norm rows. Originally a single `UNIQUE (crop_id, benchmark_id, season_window)` constraint — but Postgres never treats two `NULL`s as equal for uniqueness, and every seeded row has `season_window = NULL`, so the constraint silently allowed unlimited duplicates. Discovered when re-seeding had left five copies of every Maize input, 5×-inflating every benchmark figure in the app. Splitting into two partial indexes is the standard fix for "NULL should still count as a comparable value" |

### 6.6 Design decisions

**Money as integer pesewas.** Floating-point arithmetic accumulates
rounding error across sums. Every monetary column is `integer` or
`bigint`.

**Per acre as the comparison unit.** Amounts are stored as entered;
division by `area_planted_acres` occurs at query time. Farms of different
sizes are only comparable per acre.

**`amount_pesewas` required, breakdown optional.** A farmer may recall
only that he spent GHS 400 on fertiliser. Requiring quantity and unit
price would produce abandoned entries. Where the breakdown *is* supplied,
it yields the farmer's actual usage rate and actual price — which is the
richer data.

**Fixed cost categories.** An enum, not a user-extensible table. Every
category must map to a benchmark; a farmer-invented category has no
comparison and could never be flagged, making it invisible to the engine.

**Outputs snapshotted, not derived.** Benchmark prices change between
seasons. A farmer must see what he was told at the time, so each estimate
also stores the `price_multiplier` in force when it ran.

**Price basis recorded.** Government subsidy halves NPK and Urea. A
farmer paying open-market rates may simply have missed the subsidy
window — which is itself the most actionable recommendation available.

### 6.7 Identity — the `profiles` table

Supabase phone auth requires OTP delivery through a paid SMS provider,
which is out of scope. The design instead treats the phone number as an
identifier handled at the application layer:

```
  farmer types    0241234567
        │
        ▼  normalisePhone()
  normalised      0241234567
        │
        ▼  phoneToSyntheticEmail()
  synthetic       0241234567@farmpilot.local
        │
        ▼  supabase.auth.signUp(email, password, { data: { phone } })
  auth.users row created
        │
        ▼  trigger on_auth_user_created
  profiles row written with the REAL phone number
```

`profiles` holds `phone`, an optional linked `email`, `full_name`,
`preferred_language`, and `auth_method`. A CHECK constraint enforces the
Ghana mobile format `^0[235][0-9]{8}$`. The trigger runs `security
definer` so the profile row is created atomically with the user — the
client never makes two calls that could half-fail.

Enabling real SMS OTP later requires only switching on a provider; the
numbers are already stored and normalised. See ADR-006.

### 6.8 Sync columns

`seasons` and `season_costs` each carry `client_id uuid` with a partial
unique index, and `updated_at` maintained by trigger.

`client_id` is generated on the device before a row is queued offline. If
a flush is interrupted and retried, the replayed insert collides on the
unique index and is treated as already applied rather than inserting
again. Without it, a farmer who loses signal mid-save could record the
same cost three times and his estimate would be silently wrong.

`updated_at` gives the client a cursor for pulling server-side changes
since its last sync.

### 6.9 Rollup views

An estimate belongs to a season, because input norms are crop-specific —
an acre of maize and an acre of cassava need entirely different inputs. A
farm-wide estimate would have to average across crops and would describe
no actual field.

Farm-level and crop-level figures are therefore derived, not stored:

| View | Answers |
|---|---|
| `v_farm_summary` | What does my whole farm cost to run? |
| `v_crop_summary` | What does each crop cost me per acre? |

`v_farm_summary` uses a lateral join taking only the most recent estimate
per season, so re-running an estimate cannot double the farm total. See
ADR-007.

---

## 7. Data Access Layer

Every database interaction passes through a typed function in `src/api/`.
No component calls `supabase` directly.

### 7.1 Operations

| Function | Operation | Returns |
|---|---|---|
| `listCrops()` | select from `crops` | `Crop[]` |
| `getFarm()` | select from `farms` where owner | `Farm \| null` |
| `createFarm(input)` | insert into `farms` | `Farm` |
| `listSeasons(farmId)` | select with crop join and cost total | `SeasonSummary[]` |
| `createSeason(input)` | insert into `seasons` | `Season` |
| `completeSeason(id, harvest)` | update `is_complete`, harvest fields | `Season` |
| `listCosts(seasonId)` | select from `season_costs` | `Cost[]` |
| `addCost(input)` | insert into `season_costs` | `Cost` |
| `deleteCost(id)` | delete from `season_costs` | `void` |
| `generateEstimate(seasonId)` | rpc `generate_estimate` | `estimateId` |
| `getReport(estimateId)` | select from `v_estimate_report` | `ReportLine[]` |
| `getCategoryBenchmarkPesewas(seasonId, category)` | rpc `get_category_benchmark_pesewas` | `number` — the standard rate for one category, scaled to the season's acreage; 0 where no benchmark exists. Powers the add-cost form's "don't know this cost?" fill (FR-4.13). Reuses the exact same per-acre math as `generate_estimate()`, so the number offered always matches what the estimate would show |
| `getExpectedCategoriesForCrop(cropId)` | select distinct category from `crop_input_norms` | `CostCategory[]` — drives both the season-detail checklist and the report's cold-start checklist (FR-9.10); falls back to `ESSENTIAL_CATEGORIES` client-side where a crop has no norms yet |
| `getFlaggedInsightsForFarm(farmId)` | select from `v_estimate_report` where `farm_id` matches, keep each season's latest estimate, filter `is_flagged` | `FlaggedInsight[]` — feeds FarmBot's system prompt (FR-14.6) so it can name real, computed variance and advice instead of speaking generically |
| `getFarmSummary(farmId)` | select from `v_farm_summary` | `FarmSummary` |
| `getCropSummary(farmId)` | select from `v_crop_summary` | `CropSummary[]` |
| `signUpWithPhone(...)` | normalise, synthesise email, `auth.signUp` | `Session` |
| `signInWithPhone(...)` | normalise, synthesise email, `auth.signIn` | `Session` |
| `getProfile()` | select from `profiles` | `Profile` |
| `getAdvice(id, lang)` | cache lookup, else Khaya, else English | `string` |

### 7.2 Contract example

```ts
export async function generateEstimate(seasonId: number): Promise<number> {
  const { data, error } = await supabase
    .rpc('generate_estimate', { p_season_id: seasonId });
  if (error) throw new Error(`Estimate failed: ${error.message}`);
  return data as number;
}
```

### 7.3 Type generation

Types are generated from the live schema:

```bash
supabase gen types typescript --project-id <id> > src/lib/database.types.ts
```

Regenerated after every migration. A renamed column becomes a compile
error rather than a runtime failure.

---

## 8. Security Architecture

### 8.1 Authentication flow

```
  Farmer submits email + password
            │
            ▼
  GoTrue validates ──► issues JWT (sub = user id, exp = 1h)
            │
            ▼
  supabase-js stores JWT, attaches as Bearer on every request
            │
            ▼
  PostgREST sets request.jwt.claims for the connection
            │
            ▼
  Postgres evaluates auth.uid() inside every RLS policy
```

### 8.2 Authorisation matrix

| Table | Anonymous | Authenticated read | Authenticated write |
|---|---|---|---|
| `crops` | ✗ | all rows | ✗ |
| `cost_benchmarks` | ✗ | all rows | ✗ |
| `crop_input_norms` | ✗ | all rows | ✗ |
| `advice_rules` | ✗ | all rows | ✗ |
| `app_settings` | ✗ | all rows | ✗ |
| `advice_translations` | ✗ | all rows | ✗ |
| `profiles` | ✗ | own only | own only |
| `farms` | ✗ | own only | own only |
| `seasons` | ✗ | own farm only | own farm only |
| `season_costs` | ✗ | own season only | own season only |
| `estimates` | ✗ | own season only | via function |
| `estimate_lines` | ✗ | own estimate only | via function |

### 8.3 Ownership traversal

Ownership is established once, on `farms.user_id`, and traced through
foreign keys for every descendant. Reaching a `season_costs` row requires
owning the season, which requires owning the farm.

```sql
create policy season_costs_own on season_costs for all to authenticated
  using (exists (
    select 1 from seasons s join farms f on f.id = s.farm_id
    where s.id = season_costs.season_id and f.user_id = auth.uid()));
```

### 8.4 Additional measures

| Measure | Implementation |
|---|---|
| Key exposure | Only the anon key reaches the browser; it grants nothing without a valid JWT and passing RLS |
| Service-role key | Never present in frontend code or environment |
| Function context | `generate_estimate` runs `security invoker`, so RLS still applies inside it |
| Transport | HTTPS enforced by Vercel and Supabase |
| Input validation | Zod on the client; CHECK constraints in the database as the authority |
| Injection | Parameterised queries throughout PostgREST and supabase-js |

---

## 9. The Estimation Engine

### 9.1 Signature

```sql
generate_estimate(p_season_id bigint) returns bigint
```

Returns the id of the estimate created.

### 9.2 Algorithm

**Design history.** The first implementation computed `estimated` and
`comparison` (the benchmark) from the exact same source whenever
`method = 'benchmark'` — so for any farmer's first season of a crop, the
two were always identical by construction, variance was always 0%, and
step 6 could never flag anything, no matter what the farmer actually
recorded in `season_costs` that season. This silently defeated overspend
detection (FR-7/FR-8, BR-6) for every first season — the common case.
Live testing during the project confirmed it: a fertiliser cost recorded
60% above benchmark produced `variance = 0%`, `flagged = false`. The
algorithm below is the fix — it adds a third input, `actual`, drawn from
the season being estimated itself, and lets a recorded cost override the
prediction line-by-line.

```
INPUT   season_id

1  LOAD season, LOAD app_settings
2  COUNT prior completed seasons — same farm, same crop, with costs
3  IF count > 0  THEN method ← 'history'  ELSE method ← 'benchmark'

4  COMPUTE benchmark_per_acre[category]:
       Σ ( norm.quantity_per_acre
           × benchmark.price_pesewas
           × settings.price_multiplier )
       WHERE norm.crop = season.crop
         AND (norm.season_window IS NULL OR norm.season_window = season.season_window)
       GROUP BY category

5  COMPUTE history_per_acre[category]:
       Σ(cost.amount) / Σ(season.area_planted_acres)
       ACROSS prior completed seasons of same farm + crop (excludes this season)
       GROUP BY category

6  COMPUTE actual_total[category]:
       Σ(cost.amount)
       FROM season_costs WHERE season_costs.season_id = season_id   ← THIS season, live
       GROUP BY category

7  FOR EACH category present in benchmark, history, OR actual:
       is_actual  ← actual_total[category] > 0
       predicted  ← (method = 'history' ? history : benchmark) × area
       estimated  ← is_actual ? actual_total[category] : predicted
       comparison ← benchmark × area
       IF is_actual AND comparison > 0:
           variance ← (estimated − comparison) / comparison × 100
           flagged  ← variance > settings.flag_threshold_pct
           advice   ← flagged ? advice_rules[category] : NULL
           saving   ← MAX(estimated − comparison, 0)
       ELSE:
           variance ← NULL, flagged ← false, advice ← NULL, saving ← 0
           (a still-predicted line has nothing real to compare yet)

8  INSERT estimates (total = Σ estimated, method, seasons_used,
                     area, price_multiplier)
9  INSERT estimate_lines — one row per category, including is_actual

OUTPUT  estimate_id
```

**What changed and why:**

- Step 6 is new. Without it the function never read the season it was
  estimating at all — only *other* completed seasons (step 5) and fixed
  reference data (step 4).
- Step 7's `estimated` now prefers the farmer's live recorded figure over
  a prediction, category by category — WeeklyCatchUp and the normal
  add-cost form both just insert rows into `season_costs`, so either one
  flips a category from predicted to actual the moment a cost lands.
- `method` (history vs. benchmark) still governs the *prediction* shown
  for whatever the farmer has not recorded yet this season — it never
  changes what a recorded category is compared against. Comparison is
  always against the fixed benchmark, exactly as BR-6 always specified;
  the bug was that the comparison operands could end up equal by
  construction, not that the wrong thing was being compared.
- Flagging/advice/saving now require `is_actual` — a category still
  showing a prediction is not "spending," so it cannot be over- or
  under-spending yet.

### 9.3 Worked example

Kwame farms 2 acres of maize, minor season 2026. He has no prior seasons
recorded, so `method = 'benchmark'`.

**Norms and prices for maize (per acre):**

| Category | Input | Qty/acre | Unit price | Per acre |
|---|---|---|---|---|
| seeds | Maize seed (OPV) | 10 kg | GHS 15.00 | GHS 150.00 |
| fertiliser | NPK 15-15-15 | 2 bags | GHS 400.00 | GHS 800.00 |
| fertiliser | Urea | 1 bag | GHS 380.00 | GHS 380.00 |
| agrochem | Round Up | 2 L | GHS 80.00 | GHS 160.00 |
| land_prep | Tractor ploughing | 1 acre | GHS 350.00 | GHS 350.00 |
| labour | Farm labour | 12 days | GHS 60.00 | GHS 720.00 |
| storage | Jute sack | 9 | GHS 12.00 | GHS 108.00 |

**Per-acre totals by category:** seeds 150 · fertiliser 1,180 ·
agrochem 160 · land_prep 350 · labour 720 · storage 108
→ **GHS 2,668 per acre**

**Scaled to 2 acres → estimate total GHS 5,336.**

Kwame records the season. Next year he creates a second season and the
method becomes `history`. His recorded fertiliser spend was GHS 3,600
over 2 acres — GHS 1,800 per acre, because he bought at open market
rather than subsidised price.

| Category | Estimated (2 ac) | Benchmark (2 ac) | Variance | Flagged |
|---|---|---|---|---|
| seeds | 300 | 300 | 0.0% | no |
| fertiliser | 3,600 | 2,360 | **+52.5%** | **yes** |
| agrochem | 320 | 320 | 0.0% | no |
| land_prep | 700 | 700 | 0.0% | no |
| labour | 1,500 | 1,440 | +4.2% | no |
| storage | 216 | 216 | 0.0% | no |

Fertiliser exceeds the 30% threshold. The report shows a potential saving
of GHS 1,240 and the fertiliser advice: check the district MoFA office
for the subsidy window before buying at market price.

Fertiliser is flagged here specifically because Kwame *recorded* it
(`is_actual = true`) — its "Estimated (2 ac)" column is his own logged
GHS 3,600, not a prediction, so there is something real to compare
against the GHS 2,360 benchmark. A category he has not yet recorded this
season — say storage — would show `is_actual = false`, its "estimated"
figure would be the GHS 216 prediction itself, and it could not be
flagged even if his eventual real storage spend turns out high, until he
actually logs it.

### 9.4 Configurable parameters

| Parameter | Default | Held in |
|---|---|---|
| `flag_threshold_pct` | 30.00 | `app_settings` |
| `price_multiplier` | 4.50 | `app_settings` |

The threshold is a judgement, not a derived figure. Holding it in the
database allows tuning after observing real data without redeployment.

### 9.5 Reporting view

`v_estimate_report` joins estimate, lines, season, farm, and crop so the
entire report screen is a single query.

---

## 10. User Stories

### Epic A — Account and farm

| ID | Story | Acceptance criteria |
|---|---|---|
| A1 | As a farmer, I want to create an account so my records are private to me | Email + password registers; duplicate email rejected with a clear message; session persists on reload |
| A2 | As a farmer, I want to sign in and out | Valid credentials reach the dashboard; invalid show an error; sign-out clears the session and blocks protected routes |
| A3 | As a farmer, I want to record my farm once | Name, district, total acres captured; area must be greater than zero; dashboard is unreachable until a farm exists |

### Epic B — Recording

| ID | Story | Acceptance criteria |
|---|---|---|
| B1 | As a farmer, I want to start a season so I can record against it | Crop, year, season_window, area planted captured; area cannot exceed farm total; duplicate (crop, year, season_window) rejected |
| B2 | As a farmer, I want to add a cost item | Category and amount required; quantity, unit, unit price optional; item appears in the list immediately |
| B3 | As a farmer, I want to enter quantity and rate rather than a total | Entering quantity and unit price computes the amount automatically |
| B4 | As a farmer, I want to remove a mistaken entry | Delete with confirmation; total updates immediately |
| B5 | As a farmer, I want to see my running total | Season total displayed on the dashboard card and on the season screen |
| B6 | As a farmer, I want to close a season with my harvest | Harvest quantity and unit captured; `is_complete` set; the season becomes available as history |

### Epic C — Estimating and reducing

| ID | Story | Acceptance criteria |
|---|---|---|
| C1 | As a new farmer with no history, I want an estimate anyway | Estimate generated using benchmarks; report states it is based on standard rates |
| C2 | As a returning farmer, I want the estimate based on my own records | Where prior completed seasons exist, method is `history` and the count is displayed |
| C3 | As a farmer, I want to see the breakdown by category | Every category shown with amount and share of total |
| C4 | As a farmer, I want to see where I am spending too much | Categories above threshold are visually distinct and sorted first |
| C5 | As a farmer, I want to know what to do about it | Each flagged category displays a specific, actionable suggestion |
| C6 | As a farmer, I want to know how much I could save | Potential saving shown per flagged category and as a total |

### Epic D — Non-functional

| ID | Story | Acceptance criteria |
|---|---|---|
| D1 | As a farmer, I want the app usable on my phone | All screens function at 360px width |
| D2 | As a farmer, I want my data private | Another signed-in user cannot read or modify my records — verified by test |
| D3 | As a farmer, I want it to be quick | Report renders within 3 seconds on a 3G connection |

---

## 11. Use Cases

### UC-01 Generate estimate

| | |
|---|---|
| **Actor** | Farmer |
| **Precondition** | Signed in; farm exists; season exists with at least one cost item |
| **Trigger** | Farmer selects *Generate estimate* on the season screen |
| **Main flow** | 1. System validates the season has costs recorded<br>2. System calls `generate_estimate(season_id)`<br>3. Function determines method from prior season count<br>4. Function computes per-category estimate and benchmark<br>5. Function flags categories above threshold and attaches advice<br>6. Function writes estimate and lines, returns id<br>7. Client navigates to the report and renders it |
| **Postcondition** | Estimate and lines persisted; report displayed |
| **Alternate A** | No prior seasons → method is `benchmark`; report notes standard rates were used |
| **Exception E1** | No cost items → button disabled with explanatory text |
| **Exception E2** | No norms for the selected crop → estimate returns only categories the farmer recorded; report warns the comparison is incomplete |
| **Exception E3** | RPC failure → error surfaced, no partial write (function is transactional) |

### UC-02 Record a cost item

| | |
|---|---|
| **Actor** | Farmer |
| **Precondition** | Signed in; season exists |
| **Main flow** | 1. Farmer opens the season<br>2. Farmer selects a category<br>3. Farmer enters either an amount, or a quantity and unit price<br>4. System computes amount where a breakdown was given<br>5. System validates and inserts<br>6. List and running total update |
| **Exception** | Negative or non-numeric amount rejected client-side and by CHECK constraint |

### UC-03 Close a season

| | |
|---|---|
| **Actor** | Farmer |
| **Precondition** | Season exists with costs recorded |
| **Main flow** | 1. Farmer selects *Close season*<br>2. Farmer enters harvest quantity and unit<br>3. System sets `is_complete = true`<br>4. Season becomes available as history for future estimates |
| **Postcondition** | Subsequent estimates for the same crop use `method = 'history'` |

---

## 12. Sequence Diagrams

### 12.1 Estimate generation

```
Farmer      React        api/estimates    PostgREST     Postgres
  │           │                │              │             │
  │ click     │                │              │             │
  ├──────────►│                │              │             │
  │           │ generateEst()  │              │             │
  │           ├───────────────►│              │             │
  │           │                │ rpc + JWT    │             │
  │           │                ├─────────────►│             │
  │           │                │              │ set claims  │
  │           │                │              ├────────────►│
  │           │                │              │             │ BEGIN
  │           │                │              │             │ read season (RLS)
  │           │                │              │             │ read settings
  │           │                │              │             │ count prior
  │           │                │              │             │ compute benchmark
  │           │                │              │             │ compute history
  │           │                │              │             │ insert estimate
  │           │                │              │             │ insert lines
  │           │                │              │             │ COMMIT
  │           │                │              │◄────────────┤ estimate_id
  │           │                │◄─────────────┤             │
  │           │◄───────────────┤              │             │
  │           │ navigate /report/:id          │             │
  │           │ getReport()    │              │             │
  │           ├───────────────►├─────────────►├────────────►│ select view (RLS)
  │           │◄───────────────┤◄─────────────┤◄────────────┤ rows
  │◄──────────┤ render         │              │             │
```

### 12.2 Authentication

```
Farmer        React         GoTrue        PostgREST      Postgres
  │             │              │              │              │
  │ credentials │              │              │              │
  ├────────────►│ signIn()     │              │              │
  │             ├─────────────►│              │              │
  │             │              │ verify       │              │
  │             │◄─────────────┤ JWT          │              │
  │             │ store session│              │              │
  │             │              │              │              │
  │             │ any query + Bearer JWT      │              │
  │             ├────────────────────────────►│ set claims   │
  │             │                             ├─────────────►│
  │             │                             │              │ RLS: auth.uid()
  │             │◄────────────────────────────┤◄─────────────┤ own rows only
  │◄────────────┤                             │              │
```

---

## 13. Screen Specifications

| # | Route | Screen | Contents | Primary action |
|---|---|---|---|---|
| 1 | `/signup` | Sign up | Email, password, confirm | Create account |
| 2 | `/signin` | Sign in | Email, password | Sign in |
| 3 | `/setup` | Farm setup | Name, district, region, total acres | Save farm |
| 4 | `/` | Dashboard | Farm rollup (seasons, crops, planted acres, recorded, estimated, possible saving); per-crop table with cost per acre; season cards | New season |
| 5 | `/season/new` | New season | Crop select, year, window select, area planted | Create |
| 6 | `/season/:id` | Season detail | Cost list, add-cost form, running total, close-season control | Generate estimate |
| 7 | `/report/:id` | Estimate report | Total, method note, category table with variance and flags, advice cards with optional audio, total potential saving | Back to season |
| 8 | `/settings` | Settings | Preferred language; link an email to a phone account | Save |

### 13.1 Report screen layout

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
│  Seeds        GHS   300   ██                 6%     │
│  Agrochem     GHS   320   ██                 6%     │
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

---

## 14. Non-Functional Requirements

| ID | Requirement | Target | Verification |
|---|---|---|---|
| NFR-1 | Report generation time | < 2s for a season with 50 cost items | Timed test |
| NFR-2 | Mobile usability | Functional at 360px width | Device testing |
| NFR-3 | Data isolation | No cross-user access under any query | Two-account test |
| NFR-4 | Monetary accuracy | No rounding drift; integer pesewas throughout | Sum reconciliation test |
| NFR-5 | Availability | Dependent on Vercel and Supabase free tiers | Accepted |
| NFR-6 | Recoverability | Schema and seed reproducible from migration files | Fresh-project rebuild |
| NFR-7 | Traceability | Every benchmark row carries a source | Schema constraint (NOT NULL) |

---

## 15. Testing Strategy

### 15.1 Database

| Test | Expected |
|---|---|
| Fresh migration on empty project | No errors; 10 tables, 4 enums, 1 function, 1 view |
| Seed load | Crops, benchmarks, norms, advice rules populated |
| Estimate, no history | `method = 'benchmark'`, total > 0, one line per category with norms |
| Estimate, with history | `method = 'history'`, `seasons_used` correct |
| Flagging | A *recorded* category (`is_actual = true`) inflated 50% above benchmark is flagged; 10% is not; a category with no recorded cost yet is never flagged regardless of how its prediction compares to benchmark |
| Actual-vs-benchmark regression | Recording a cost 60% above benchmark for a fresh season with no history produces `variance_pct = 60`, `is_flagged = true`, non-null advice — confirmed live after the 010 migration; before it, the same input produced `variance_pct = 0`, `is_flagged = false` |
| Norm de-duplication | `crop_input_norms` has exactly one row per `(crop_id, benchmark_id, season_window)`, including where `season_window IS NULL`; re-running the seed insert does not add a second row |
| Absurd-value test | Ploughing set to GHS 5/acre produces a visibly wrong total, confirming values flow through rather than being hardcoded |
| RLS isolation | User B receives zero rows for every one of User A's tables |
| Constraint enforcement | Duplicate (farm, crop, year, season_window) rejected; negative amount rejected; zero area rejected |
| Phone format | `0141234567` rejected by CHECK; `0241234567` accepted |
| Profile trigger | Signing up creates exactly one `profiles` row with the real phone |
| Rollup accuracy | `v_farm_summary` total equals the sum of its seasons |
| Rollup idempotence | Re-running an estimate does not change the farm total |
| Sync idempotence | Inserting the same `client_id` twice yields one row, not two |

### 15.2 Application

| Area | Tests |
|---|---|
| Auth | Sign up, sign in, sign out, protected route redirect, session persistence |
| Farm setup | Validation, one-time gating |
| Season | Creation, duplicate rejection, area exceeding farm total |
| Costs | Amount-only entry, quantity × rate entry, deletion, running total |
| Estimate | Button disabled with no costs; report renders; flags visible |
| Responsive | All screens at 360px |

### 15.3 Acceptance

Full path executed as a new user: sign up → farm → season → six cost
items → estimate → report showing at least one flag with advice.

---

## 16. Deployment

### 16.1 Environments

| Environment | Frontend | Database |
|---|---|---|
| Local | `vite dev` on :5173 | Shared Supabase project |
| Production | Vercel, auto-deploy from `main` | Same Supabase project |

A single database is used for both, acceptable at this scope. Migrations
are applied through the Supabase SQL editor and committed to the repo.

### 16.2 Configuration

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Both are safe in the client bundle; neither grants access without a valid
JWT passing RLS. The service-role key is never used in this project.

### 16.3 Repository

```
farmpilot/
├── supabase/migrations/
│   ├── 001_schema.sql
│   ├── 002_seed_benchmarks.sql             ← replaced with real data in week 2
│   ├── 003_profiles_and_views.sql          phone identity, sync columns, rollup views
│   ├── 004_notifications.sql
│   ├── 005_guides.sql
│   ├── 006_fix_profile_trigger.sql
│   ├── 007_quick_fill_costs.sql            benchmark-based "fill every category" RPC
│   ├── 008_delete_account_rpc.sql
│   ├── 008_weekly_checkin.sql              farms.check_in_day
│   ├── 009_fix_views_and_seed_crops.sql
│   ├── 010_estimate_actual_vs_benchmark.sql    generate_estimate() actual-vs-benchmark fix, is_actual
│   ├── 011_category_benchmark_estimate.sql     get_category_benchmark_pesewas() RPC
│   └── 012_fix_crop_input_norms_duplicates.sql dedup + partial unique indexes (§6.5)
├── src/
├── .env.example
└── README.md
```

Seed data is a separate migration precisely so it can be replaced without
touching schema definitions. Migrations in this project have generally
been applied directly against the shared Supabase project (via the SQL
editor, or the Supabase CLI's `db query -f`) rather than through
`supabase db push`, which is why the CLI's own migration-history table
does not reflect them — a known gap, not evidence the changes are
missing from the live database.

### 16.4 Branching

Branch per developer, pull request into `main`, one reviewer. No direct
pushes to `main`.

---

## 17. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Benchmark data unavailable in time | Estimates not defensible | Placeholders isolated in two tables; system fully functional without them; swap is a single file |
| Family farm figures reflect 100-acre scale | Smallholders flagged as overspending on everything | Documented in limitations; benchmark framed as an efficiency ceiling rather than a target |
| Application rates unverified | Inaccurate benchmark | `source` column records provenance on every row; unverified rows explicitly marked |
| Fourteen-day timeline | Incomplete delivery | Scope cut to one crop, one farm per user, no modifiers; excluded items documented |
| Concurrent development on one schema | Merge conflicts, integration failure | Schema frozen day 1; branch per developer; typed API layer as the contract between components |
| MoFA prices are from 2018 | Estimates materially wrong | `price_multiplier` in `app_settings`; farmer-reported prices captured through quantity × rate entry |

---

## 18. Future Work

| Extension | Value |
|---|---|
| Cost per bag harvested | The correct efficiency measure — a farmer spending more but harvesting proportionally more is not overspending |
| Regional benchmark variation | Removes the false flags caused by a single national comparison |
| Farm modifiers (soil, tenure, terrain, mechanisation) | Adjusts the benchmark to the individual farm |
| Aggregator accounts | An extension officer or cooperative secretary records for many farmers; addresses the documented adoption barrier of farmer-side data entry |
| SMS OTP verification | Confirms a farmer owns the number he registered |
| Cost history as loan evidence | Several recorded seasons constitute a verifiable spending record for credit assessment |
| Additional crops | Requires norms per crop; the schema already supports it |
| Two-way offline sync | Current design queues writes only; pulling server-side changes while offline is not handled |
| Native-speaker review of the generated Twi translations | §19 below — text and audio exist for all 8 categories, but every row is `reviewed = false` until a Twi speaker listens and confirms each one |
| Additional languages (Ewe, Ga, Dagbani) | The schema (`advice_translations.language`) and the generation script both already support any of the four; only Twi has been generated so far |
| Per-category "not yet recorded" reminder cadence | The check-in currently re-asks every expected category every week regardless of whether it is a one-time input (seeds, land prep) or a recurring one (labour); distinguishing the two would reduce repetitive "Nothing" answers |

---

## 19. Localisation — Twi Translation and Audio (Khaya AI)

### 19.1 Purpose

The estimation engine's advice text (§9.2, `advice_rules`) is written in English. A farmer who is more comfortable in Twi cannot act on advice they cannot read. This feature adds a cached Twi translation of each of the 8 advice categories, with a matching spoken-audio clip, surfaced as an optional speaker button next to a flagged category's advice in the Estimate Report — without adding a live dependency on a third-party AI service to the running application.

Two separate Khaya AI endpoints are involved, each doing a different job:

- **Translation API v2** converts the advice text from English into Twi. "Government subsidy cuts NPK and Urea by about half..." becomes the equivalent sentence in Twi. This runs once, inside the generation script; the result is stored in `advice_translations.message`, and the app only ever reads it from there.
- **Text-to-Speech API v2** takes that Twi text and turns it into audio a farmer can listen to. This also runs once; the audio file is stored in Supabase Storage, and the app plays it from the stored public URL.

```
English advice (advice_rules)
        |
        | Translation API   [runs once, inside scripts/generate_khaya.ts]
        v
Twi text (advice_translations.message)
        |
        | TTS API           [runs once, inside the same script]
        v
Audio file (Supabase Storage, public "audio" bucket)
        |
        | served from cache [at runtime — no Khaya API calls at all]
        v
Farmer taps the speaker icon and hears the advice in Twi
```

The two are kept as separate stored values, not collapsed into "just the audio," because they serve two different farmers: one who reads Twi comfortably gets the text on screen (and can read it silently, share a screenshot, or read along while the audio plays); one who reads it poorly or not at all still gets the same advice by listening. Both come from the same one-time generation run — the split costs nothing extra to store, and closes the P2 gap called out directly in §7.13 of the companion PRD ("if only one half is built, it should be the audio").

### 19.2 The core design decision: generate once, read forever

The obvious approach — call a translation/text-to-speech API every time a farmer views a flagged category — was rejected outright. Ghana NLP's Khaya AI API is rate-limited to 100 calls/month on the tier this project uses, and advice text is fixed content: the same 8 categories' English messages (`advice_rules`, seeded once in migration 002) never change per-farmer or per-season. There is nothing to gain from calling the API more than once per category, ever, and doing so would exhaust the quota after roughly six page views.

The system is therefore split into two halves that never share a code path:

- **`scripts/generate_khaya.ts`** — a one-off, developer-run script, never imported by or bundled into the application. It calls Khaya's `/v2/translate` and `/tts/v2/synthesize` endpoints exactly once per category (skipping any category already fully cached), uploads the resulting audio to Supabase Storage, and writes the result to `advice_translations`.
- **`src/lib/khaya.ts`** — the only Khaya-adjacent code that ships in the application bundle, and it never calls Khaya. `getTwiAdvice(category)` reads whatever the script has already cached; if nothing has been generated yet for that category, it falls back silently to the English `advice_rules.message` — no error, no loading spinner for a call that will never happen, no live dependency on Khaya's uptime for the app to function.

This mirrors the same principle the benchmark layer already follows (§2.4): expensive or rate-limited work happens once, offline, and the running app only ever reads a cache.

### 19.3 What Step 1 verification actually found

Before writing any integration code, the API was called directly (curl, not assumed) to confirm both endpoints and learn their real shapes — three assumptions in the original design turned out to be wrong:

| Assumption | Reality, confirmed live |
|---|---|
| The Twi language code is `"tw"` | There is no `"tw"`. Khaya distinguishes two real dialects: `"twi"` (Asante Twi) and `"atw"` (Akuapem Twi). `"twi"` is used because the seeded demonstration farmer (Appendix D of the main report) farms in Ejisu, Ashanti Region, where Asante Twi is spoken — a reasoned default, not a guess, but still subject to the review step below. |
| `/tts/v2/languages` returns a flat array of codes | It returns `{ "languages": { "<Display Name>": "<code>", ... } }` — a name-to-code map. |
| Synthesized audio is MP3 | It is WAV (RIFF/WAVE, mono, 16kHz), confirmed from the real response's `content-type: audio/wav` header and file signature. `scripts/generate_khaya.ts` stores `.wav` files with `contentType: 'audio/wav'` accordingly. |

Each of these would have caused a silent or confusing failure (an audio element that never plays; a script that can't find "tw" and can't explain why) had the original assumptions simply been coded against without checking. The lesson generalises: this project's practice throughout has been to verify a third-party contract against a live call before writing the integration around it (the same discipline behind Issue #4 and Issue #35 in the Development Log), not to trust documentation or a plausible-sounding parameter name.

### 19.4 Data model

`advice_translations` (migration 003) already existed with `advice_id`, `language`, `message`, `source`, `reviewed`. Two migrations extend it for this feature:

- **018** adds `audio_url text` (nullable — a translation can exist as text before or without audio).
- **020** adds the table's first write policy. Migration 003 gave it a read policy only (`for select to authenticated using (true)`); nothing could ever insert into it. This is a deliberate, narrow exception to this schema's otherwise-universal rule that reference/benchmark tables (`crops`, `cost_benchmarks`, `crop_input_norms`, `guides`, `advice_rules`) are read-only to the app and written only directly by the project owner via a migration (§8.2's authorisation matrix). `advice_translations` differs because its own read policy already exposes every row to every signed-in farmer (it is shared advisory content, not farmer-owned data) and because a machine-generated row is never trusted as fact until `reviewed = true` — the integrity bar for who may write a *candidate* translation is lower than for data used as fact everywhere else in the system. If this is ever judged too permissive, the fix is a dedicated reviewer role rather than reopening it to every `authenticated` caller.

**Storage.** A new public-read `audio` bucket (migration 019) holds the generated clips at `advice/{category}/tw.wav`. Bucket creation and its `storage.objects` policies had to be applied via the CLI's owner-privileged `db query` path — the anon key cannot create a bucket or grant itself object policies, confirmed live (`403 new row violates row-level security policy`) rather than assumed. A second policy (migration 021) makes the bucket itself visible to `listBuckets()`/`getBucket()` under an authenticated session — `storage.buckets` and `storage.objects` are separate tables with independent RLS, and only the latter was covered by 019 at first; `generate_khaya.ts`'s own idempotency check surfaced the gap on its first real run.

Storage writes require an authenticated session, consistent with the rest of this schema never granting the anonymous role write access anywhere. Since the generation script runs as a bare Node process with no farmer logged in, it signs in with a dedicated, low-privilege account (`khaya-generator@farmpilot.internal`) that owns no farm data of its own and exists solely to satisfy that check.

### 19.5 Runtime read path

`getTwiAdvice(category: string)` looks up `advice_rules` by category to get its id, then `advice_translations` for a matching `language = 'tw'` row. `EstimateReport.tsx` fetches this for every currently-flagged category in one batched query (`Promise.all`, not one query per card) once the report itself has loaded, and:

- Shows the Twi text instead of English only when the signed-in farmer's `profiles.preferred_language = 'tw'` (Profile.tsx, Appendix — labelled "Twi (Akan)" in the selector, since farmers may know the language by a different name than the bare linguistic term). Changing this preference takes effect immediately across the app with no reload, because both Profile.tsx and EstimateReport.tsx read the same React Query cache key (`['profile', userId]`) and Profile's save mutation invalidates it on success.
- Shows the speaker button independently of that preference — a farmer reading English may still want to hear the Twi audio, or vice versa — and hides it entirely when no `audio_url` exists for that category yet, rather than rendering a button that does nothing.
- Never blocks the page render on Khaya: if the cache lookup itself fails or returns nothing, `getTwiAdvice` falls back to English silently, matching the CRITICAL RULE that a missing translation degrades gracefully rather than surfacing an error to the farmer.

### 19.6 What is verified automatically vs. what still needs a human

`src/lib/khaya.integration.test.ts` proves, against the live database, that all 8 categories have real cached text and a genuinely publicly-downloadable audio URL, and that the English-fallback path works correctly for an unknown category. What it cannot and does not claim to verify is *translation quality* — whether "Wo aduannuru a wode di dwuma no boro nea wɔhwɛ kwan no so..." is natural, correct Twi that a farmer would find clear rather than stilted or wrong. `reviewed` is `false` on every row the script writes and is never set to `true` by any code path in this project; a native Twi speaker must listen to each of the 8 clips and flip it by hand (directly in the database, or via a future review UI — not yet built) before this feature is presented as demo-ready rather than "generated but unverified."

---

*End of document.*

