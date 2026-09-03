# Architecture Decision Record

Every significant technical decision, why it was made, and what was given
up. When someone asks "why is it built this way?", the answer is here.

**Rule for the team:** if a decision takes more than five minutes of
discussion, it gets an ADR. Reversing an earlier decision means adding a
new ADR that supersedes it — never edit history.

---

## ADR-001 — No separate Python/FastAPI service

**Status:** Accepted · **Date:** 2026-08-30

**Context.** The approved proposal specified React + Supabase + a Python
(FastAPI) service to perform cost calculations.

**Decision.** Drop the Python service. Business logic runs as a PL/pgSQL
function inside PostgreSQL.

**Reasoning.** The computation is sums, averages, and a percentage
comparison over the user's own rows — relational work. Running it in the
database avoids shipping every cost row to a service and back, removes a
second deployment, removes CORS and JWT forwarding between services, and
means row-level security applies automatically instead of being
re-implemented.

**Trade-off accepted.** PL/pgSQL is harder to unit test than Python, and
the logic is now tied to PostgreSQL. Both acceptable at this scope;
PostgreSQL is not a dependency we would want to remove anyway.

---

## ADR-002 — Money stored as integer pesewas

**Status:** Accepted · **Date:** 2026-08-30

**Decision.** Every monetary value is an `integer` or `bigint` holding
pesewas. Conversion to cedis happens only at render.

**Reasoning.** Floating-point arithmetic accumulates rounding error
across sums. The entire output of this product is a money figure, so
drift is not tolerable.

**Consequence.** No arithmetic on a cedi value anywhere. A single `Money`
component handles all formatting.

---

## ADR-003 — Benchmark comparison must be external

**Status:** Accepted · **Date:** 2026-08-30

**Context.** The proposal states estimates come from the farmer's own
records.

**Problem found.** Comparing a farmer only against himself makes
overspend undetectable — his figures always equal his own baseline,
variance is always zero, nothing can ever be flagged. Objective 4 of the
proposal ("find where the farmer is overspending") would be unachievable.

**Decision.** Carry an independent reference layer: input prices
(`cost_benchmarks`) × application rates per acre (`crop_input_norms`).

**Consequence.** This also solves cold start — a farmer with zero records
still receives an estimate. One mechanism, two problems.

---

## ADR-004 — Fixed cost categories, not user-extensible

**Status:** Accepted · **Date:** 2026-08-30

**Decision.** `cost_category` is an eight-value Postgres enum. Farmers
cannot add categories.

**Reasoning.** Every category must map to a benchmark to be comparable. A
farmer-invented category has nothing to compare against, so it could
never be flagged and would be invisible to the estimation engine. It
would appear to work while silently doing nothing.

**Consequence.** Unusual spending goes under `other`, which counts toward
the total but is never flagged. The report says so explicitly.

---

## ADR-005 — All benchmark values isolated in three tables

**Status:** Accepted · **Date:** 2026-08-30

**Context.** Real benchmark data (family farm records, field survey) will
not be available until roughly day 10 of a 14-day build.

**Decision.** Every rate, price, and threshold lives in
`cost_benchmarks`, `crop_input_norms`, or `app_settings`. No number
appears in application code or in the estimate function.

**Consequence.** The system is built and tested end to end against
placeholders; real data is a single seed-file swap with zero code change.

**Verification.** The absurd-value test — set tractor ploughing to GHS 5
per acre and confirm the report total visibly breaks. If it does not, a
value has been hardcoded and this decision has been violated.

---

## ADR-006 — Phone-first sign-up via synthetic email

**Status:** Accepted · **Date:** 2026-08-30

**Context.** Target users are smallholder farmers who use mobile phones.
Many have no email address. Supabase phone auth requires OTP delivery
through a paid SMS provider (Twilio, MessageBird) — a cost and an
integration outside this project's scope.

**Decision.** The farmer signs up with **phone number + password**. The
client normalises the number and derives a synthetic email
(`0501234567@farmpilot.local`), then calls standard Supabase email
sign-up. The real phone is stored in `profiles`. An email address may
optionally be linked to the same account.

**Reasoning.** Delivers the phone-based experience farmers expect, at no
cost, with no SMS dependency, using auth code that is already battle
tested.

**Trade-off accepted.** No number verification — someone can register a
phone they do not own. Acceptable because the number is an identifier,
not a channel; nothing is sent to it. Documented as a limitation.

**Migration path.** Switching on real SMS OTP later requires only
enabling the provider; phone numbers are already stored and normalised.

---

## ADR-007 — Estimates are per season, rollups are views

**Status:** Accepted · **Date:** 2026-08-30

**Question raised.** Is the estimate for the farm, or for each crop?

**Decision.** An estimate belongs to a **season** — one crop, one window,
one year, one farm. Farm-level and crop-level figures are derived through
`v_farm_summary` and `v_crop_summary`.

**Reasoning.** Input norms are crop-specific: an acre of maize and an
acre of cassava need entirely different inputs in different quantities. A
single farm-wide estimate would have to average across crops, which
produces a number that describes no actual field. Estimating per crop and
summing upward is correct in both directions.

**Consequence.** A farmer growing three crops sees three estimates plus
one farm total. The dashboard shows the rollup; the report shows the
detail.

**Guard.** `v_farm_summary` counts only the most recent estimate per
season, so re-running an estimate cannot double the farm total.

---

## ADR-008 — Offline via IndexedDB queue with idempotent writes

**Status:** Proposed (P1 — build only if the schedule allows) · **Date:** 2026-08-30

**Context.** Cost entry happens standing in a field, where connectivity
is poor. Supabase has no built-in offline sync.

**Decision.** Ship as a PWA. Cache reference and season data in
IndexedDB. Queue writes locally and flush on reconnect. Every queued row
carries a `client_id` UUID generated on the device.

**Reasoning.** The `client_id` unique index makes replay safe — an
interrupted flush that retries collides on the index instead of creating
duplicate cost entries. Without it, a farmer who loses signal mid-save
could end up recording the same GHS 400 of fertiliser three times, which
would corrupt his estimate.

**Scope limit.** Offline applies to cost entry only. Estimates require
the server function and are online-only. This is stated in the UI.

---

## ADR-009 — Localisation via Khaya API with cached translations

**Status:** Accepted, implemented for Twi only · **Date:** 2026-08-30, implemented 2026-09-03

**Context.** Farmers are more comfortable in Twi, Dagbani, Ga, or Ewe
than English. Khaya AI (Ghana NLP) provides translation and
text-to-speech APIs for exactly these languages, with a JavaScript SDK.

**Decision.** Translate advice messages through the Khaya API once, cache
the result in `advice_translations`, and serve from cache thereafter.
Text-to-speech for advice playback is the higher-value half — a farmer
who reads English poorly can still listen.

**Reasoning.** Calling a translation API on every page load is slow,
costly, and pointless for text that changes once a season.

**Risk noted.** Machine translation of agricultural terminology is
unreliable. Translations are stored with `reviewed = false` until a
native speaker checks them.

**Implementation note (2026-09-03).** Built exactly as decided —
`scripts/generate_khaya.ts` (run once, not part of the app bundle) and
`src/lib/khaya.ts` (runtime cache reader, never calls Khaya). All 8
advice categories are generated for Twi; Ewe/Ga/Dagbani are not yet
generated. One piece of this ADR's own risk mitigation is **not yet
built**: "the UI marks unreviewed text" was the original intent, but the
shipped UI (the Estimate Report's speaker button) does not currently
show any reviewed/unreviewed indicator to the farmer — only the database
row does. See `FarmPilot_SDD.md` §19 and `FarmPilot_PRD (1).md` §7.13 for
the full, honest status, including three real corrections Step-1 API
verification found before this was built (the language code, the
response shape, and the audio format all differed from what was
assumed).

---

## ADR-010 — Single shared Supabase project for dev and production

**Status:** Accepted · **Date:** 2026-08-30

**Decision.** One Supabase project serves local development and the
deployed app.

**Reasoning.** Three developers over fourteen days. Separate environments
would cost more in migration synchronisation than they save.

**Trade-off accepted.** A bad migration affects everyone at once.
Mitigated by: migrations reviewed before running, and every migration
committed to the repository so the database can be rebuilt from scratch.

**This would be wrong in production work.** It is right here, and the
report should say why.

---

## ADR-011 — Commercial Scale Caveat for Benchmarks

**Status:** Accepted · **Date:** 2026-08-30

**Context.** FarmPilot benchmarks spending to flag inefficiencies. However, our benchmark data is sourced from commercial-scale farm records and CSIR-CRI extension recommendations. A 100-acre commercial farm purchases inputs in bulk, utilizes mechanized equipment across large areas, and distributes fixed costs efficiently. Their per-acre cost is significantly lower than that of a 2-acre smallholder farmer.

**Decision.** We chose to use the unadjusted commercial-scale figures and state plainly in the report limitations that the benchmarks represent commercial-scale efficiency.

**Reasoning.** Adjusting the data upward for smallholders would require fabricating statistical adjustments, risking "made up" numbers that lack empirical backing. By presenting unadjusted commercial figures, the data remains defensible. The gap between the farmer's cost and the benchmark represents an *improvement ceiling* and long-term aspirational goal, rather than a baseline pass/fail metric.

---

## ADR-012 — Price Multiplier applied via Data Deflation

**Status:** Accepted · **Date:** 2026-08-30

**Context.** MoFA benchmark prices are from 2018 and require the `price_multiplier` (default 4.50 in `app_settings`) to reflect present-day currency values. New benchmark data was collected in 2026, creating a mixed dataset of base years. 

**Decision.** Deflate the new 2026 data back to their 2018 equivalents (divide by 4.50) before inserting them into the database seed.

**Reasoning.** The estimate engine universally applies the `price_multiplier` to all rows. If we inserted 2026 prices directly, we would either have to modify the engine to selectively apply the multiplier based on year (breaking Rule 1: zero code changes), or update the multiplier to 1.0 and manually overwrite the published 2018 MoFA values with 2026 estimates (losing the published integrity). Deflating the new data allows the single universal multiplier to scale both datasets perfectly without requiring any code changes.
