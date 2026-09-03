# FarmPilot — Presentation Guide

**This is a personal prep document, not a submitted deliverable.** It exists so you can walk into the presentation and answer "what did you actually build and why" for any part of the system without hesitating. Everything here is drawn from the real report, SDD, PRD, and Development Log — this is the condensed, spoken-out-loud version of those, not new content.

---

## 1. The elevator pitch (30 seconds)

FarmPilot answers two questions a smallholder Ghanaian farmer currently has no way to answer: **what should this season cost**, and **where am I overspending**. A farmer logs what they actually spend — seeds, fertiliser, labour, and so on — and the system compares that, category by category, against an independent standard built from real MoFA price and application data. If a category comes in more than 30% over standard, it's flagged with the exact percentage, the money that could be saved, and one specific, practical suggestion — not generic advice. A farmer's very first season already gets a usable estimate, because the comparison never depends on the farmer having any history of their own.

## 2. The one idea everything is built around

If you remember only one thing to say, say this: **you cannot detect overspending by comparing a farmer only to their own past records.** If the only reference point is your own history, your numbers always equal your own baseline — variance is always zero, by construction. Overspending only becomes visible when you compare against something *independent* of the farmer being measured. That's the whole reason the "benchmark" (MoFA-derived standard prices and per-acre input norms) exists as a completely separate data source from anything a farmer ever enters. This was also the site of the single most serious bug found during development (see §6 below) — the first version of the estimator violated this exact principle by accident.

## 3. How it actually works, step by step

1. **Sign up** (phone or email) → **set up a farm** (name, region, district, acreage) — required once before anything else is reachable.
2. **Start a season**: pick a crop, year, growing window, area planted. If the farmer already has real figures from up to 3 previous years for this crop, they can enter those right here instead of starting blind — those become instantly-usable history.
3. **Record costs** against the season, in one of 8 fixed categories (seeds, fertiliser, agrochemicals, land prep, labour, transport, storage, other), either as a flat total or a quantity × rate (e.g. "3 bags × GHS 461.25").
4. **Generate an estimate.** A single database function (`generate_estimate`) does three things per category: (a) decides whether to predict from the farmer's own history or the standard benchmark, depending on whether they have a completed prior season of that crop; (b) if the farmer has *actually recorded* a cost this season, uses that real number instead of a prediction; (c) for anything actually recorded, compares it to the fixed benchmark and flags it if it's more than 30% over.
5. **See the report**: total estimated cost, a category breakdown labelled "Recorded" or "Predicted," and for anything flagged — the exact percentage over, the possible saving in cedis, and a specific suggestion (e.g. "check the subsidy window before buying fertiliser at market price").
6. Everything else — the dashboard, Compare, Cost Lab, the weekly check-in, FarmBot, Twi audio — supports that core loop; none of it works without it.

## 4. Every feature, one line each, and why it exists

| Feature | Why it exists |
|---|---|
| Benchmark-vs-history estimation engine | The core deliverable — §2 above |
| Weekly Cost Check-in | A standing prompt asking "did you spend anything this week?" — the recording habit is the actual adoption risk, not the math |
| History back-fill at season creation | A returning farmer with real past figures shouldn't be forced through the "no history yet" benchmark path on day one |
| Category Budgets | A farmer's own personal spending cap per category, independent of the benchmark — "don't let me spend more than GHS 500 on labour," warned live while recording |
| Cost Lab | A what-if sandbox — try quantities and rates before committing to a real season, nothing saved until you do |
| Compare (season/crop/benchmark) | Three ways to see spend against something — each other's seasons, each other's crops, or the standard rate |
| FarmBot (AI assistant) | Answers questions using the farmer's *real* recorded and flagged data, not generic chat |
| Agronomic guide library | Deeper how-to content matched to whatever category is currently flagged |
| Offline cost recording | A farmer in a field with no signal can still record a cost — queues locally, syncs automatically on reconnect (this was broken until very late in the build — see §6) |
| PDF export | Native browser print-to-PDF for the report and costs pages — something to hand a lender or cooperative |
| Twi advice translation + audio | A farmer more comfortable in Twi can read and hear flagged-category advice, not just English |

## 5. Architecture decisions — the "why," not just the "what"

Say these in your own words if asked "why did you build it this way":

- **No separate backend server.** The estimation logic runs as a function *inside* the PostgreSQL database (PL/pgSQL), not a separate API service. Reasoning: it runs right next to the data it needs, the same database-level security automatically protects it, and there's one fewer piece of infrastructure to build and secure. Trade-off accepted: PL/pgSQL is less common and harder to unit-test than a general-purpose language — worth it for a project this size.
- **Row-level security, not app-level checks.** "A farmer can only see their own data" is enforced *by the database itself*, on every single query, regardless of which part of the app asked. This can't be bypassed by an app bug, because the app isn't what's enforcing it. Proven directly with an automated test using two real, independent accounts (Issue #36).
- **Money as whole pesewas (integers), never floating-point cedis.** Eliminates rounding drift entirely — a well-known class of bug in financial software.
- **Benchmark data is generated once and cached, never called live.** The same principle governs both the MoFA benchmark data (seeded once via migration) and the newer Twi translation/audio (generated once via a script, read from a cache at runtime, never calling the third-party AI API while a farmer is using the app — this matters concretely because that API is capped at 100 calls/month on the free tier).
- **One shared Supabase project for dev and production**, not separate environments — a deliberate trade-off for a three-person team on a 14-day build, accepted with mitigations (every change goes through a committed migration file, so the database can be rebuilt from scratch).

## 6. The three most important bugs found — tell these stories if asked "what went wrong"

These are the best answers to "what was hard" or "what did you learn," because they're real, specific, and show the testing process actually caught something meaningful — not a rehearsed list.

1. **The estimator could never detect overspending, on day one of the project's first serious test.** The first version compared a farmer's "estimated" figure against a "benchmark" figure computed from the *same source* whenever no history existed — so on any farmer's first season, the two numbers were identical by construction, and no category could ever be flagged, no matter how much someone actually overspent. Caught by testing the engine directly against a deliberately-inflated known figure, not by looking at the UI. Fixed by explicitly checking whether the farmer had *actually recorded* a cost this season, and only ever comparing that real figure — never a prediction — against the benchmark.
2. **A data-loading mistake inflated every cost estimate roughly 5×** — a re-run seed script silently duplicated benchmark rows instead of updating them, because a plain `UNIQUE` constraint doesn't treat two `NULL` rows as conflicting the way a partial index does. Found and fixed during the hardening pass.
3. **Offline cost recording was fully built but never actually connected to the real recording form.** The whole queue-and-retry system existed — correct code, a dedicated database column built specifically for safe retries — but the one function that actually puts a write into that queue had zero callers anywhere in the app. A farmer who lost signal while saving a cost would just see an error and lose what they typed, not get the "saves and syncs later" behaviour the report claimed. Found only because writing an automated test for it required tracing the actual call path — and it wasn't there. This is arguably the single best answer to "why does testing matter," because a human clicking through the app with a good connection would never have noticed.

## 7. What's automated, what's manual, and what's genuinely not tested at all

Be straight about this if asked — it's a stronger answer than pretending everything is covered.

**Automated and passing (67 unit tests, 64 integration tests, both re-runnable on demand):**
- The estimation engine itself — benchmark method, history method, flagging, non-flagging, variance/advice/saving computation
- Every category-budget behaviour (setting, replacing, deleting, spent/remaining/over-budget arithmetic)
- Farm/season/cost CRUD, including cascade deletion (deleting a season removes its costs)
- Cross-user Row-Level-Security isolation, using two genuinely independent accounts
- All three Compare views, the dashboard rollups, the guide-matching logic
- Authentication (sign-up, duplicate rejection, sign-in, wrong password)
- A database trigger that writes overspend notifications automatically
- The offline queue's actual write path against the real database, including the no-duplicate-on-retry guarantee
- The Twi advice cache, including the real translated content and a genuinely downloadable audio file
- Every pure formatting/conversion/validation function (money, phone numbers, category lists, the acreage-split rule)

**Verified manually (Puppeteer, screenshots, or by hand), not re-checked automatically:**
- Every screen's visual layout and responsiveness (mobile especially)
- Dark mode across all pages
- The actual click-through UX of every feature (what a farmer sees and taps)
- PDF export's printed output
- The speaker button's real audio playback in a real browser
- Anything involving FarmBot's live AI responses (inherently non-deterministic — not meaningfully testable the same way)

**Not tested at all, and worth saying so if asked directly:**
- Translation *quality* — whether the generated Twi is natural, correct phrasing a farmer would find clear. This can only be judged by a native speaker, not a test. Every generated row is explicitly marked "not yet reviewed" in the database for exactly this reason.
- No CI pipeline runs any of this automatically on every push — the suite exists and passes, but only when someone runs it by hand.
- No UI-level component tests (e.g. React Testing Library) — all business logic is covered; clicking-and-checking-what-renders is not.
- The indicative benchmark norms for 9 of the 10 crops are not yet verified against CSIR-CRI extension data or real farm records — stated plainly as indicative, not sourced fact.

## 8. Numbers to have ready

- **41** issues found and fixed in the post-build hardening pass, each documented with root cause, fix, and live evidence.
- **67** automated unit tests, **64** automated integration tests (against the real, live database).
- **21** numbered database migrations (schema is 100% reproducible from committed SQL files — no manual step).
- **8** cost categories, **10** crops with benchmark coverage.
- **30%** — the default overspend-flagging threshold.
- **100 calls/month** — the Khaya AI free-tier quota the whole localisation feature is designed around never exceeding (uses 16 calls total, once, ever).

## 9. If you get asked a hard question

- **"Why should I trust this estimate is accurate?"** → It isn't presented as precise — it's explicitly built from 2018 MoFA national averages with a stated inflation multiplier, and the report says plainly that this doesn't yet vary by region or true smallholder farm scale. The value isn't perfect precision; it's having *any* independent reference point at all, where today there is none.
- **"What would you do differently with more time?"** → Region-specific benchmark data, verified crop norms for all 10 crops (currently indicative for 9 of them), UI-level test coverage, and a CI pipeline — all listed honestly in the report's own Recommendations section, not things discovered just for this answer.
- **"How do you know the security actually works, not just that you wrote a policy?"** → Because it's tested directly: two real, independent accounts, one trying to read/update/delete the other's farm through raw database queries (not just through the app's own UI, which could hide a bug) — and it fails every time, provably.

---

*This document is not part of the formal submission set (Report, PRD, SDD, Development Log) — it's a study aid built from them.*
