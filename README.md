# FarmPilot

A web application that tells a small-scale Ghanaian farmer what a farming
season should cost, and where they are spending more than they need to.
Built as a Year 3 mini project for the Department of Computer Science,
Kwame Nkrumah University of Science and Technology (2025/2026).

**Course:** CSM 366 — Mini Project, BSc Computer Science, Year 3
**Team:** Osmond Abdul-Karim Woriwi · Aboagye Jeffery Ohene · Ayisha Abdullah
**Supervisor:** Dr. Najim Ussiph

**Live app:** https://farmpilot-chi.vercel.app
**Repository:** https://github.com/itzSAD999/farmpilot

**Try it now** with the seeded demonstration account (see
`docs/FarmPilot_MiniProject_Report.md`, Appendix D, for what it contains):

```
Email:    kwame.mensah@farmpilot.demo
Password: FarmPilotDemo2026!
```

## Key features

- **Estimation engine** — a per-category cost estimate for a season, from the farmer's own history where it exists and an independent MoFA-derived benchmark otherwise; never a prediction compared against itself (see Development Log Issue #3).
- **Overspend detection** — any *actually recorded* category more than 30% above benchmark is flagged with the variance, a possible saving in cedis, and a specific, sourced suggestion.
- **Budgets** — five independent, farmer-set spending caps (category-in-season, crop total, farm total, category farm-wide, category-in-crop), each checked live while recording a cost.
- **Cost Lab** (`/lab`) — a what-if sandbox for trying quantities and rates before recording anything for real.
- **Compare** — season-vs-season, crop-vs-crop (up to 4 crops, exact season/window pairs, bar or radar view), and me-vs-benchmark.
- **Weekly Check-in** — a standing prompt to log shared costs across active seasons, split by planted acreage.
- **FarmBot** — an AI assistant with live read access to the farmer's real farm, seasons, costs, overspend flags, and budgets.
- **Offline cost recording** — costs entered with no signal queue locally and sync automatically on reconnect, with no duplicate on a retried flush.
- **Twi localisation** — a flagged category's advice can be read and heard in Twi, generated once and cached, never called live.
- **PDF export** — the Estimate Report and Costs pages print cleanly via the browser's native print-to-PDF.

## How it works

A farmer records their farm, a growing season, and what they spend on it —
either a flat total or a quantity and rate — with up to three previous
years back-fillable per crop at season creation, so estimates can use
real history from day one. FarmPilot compares that spending, category by
category, against an independent benchmark built from MoFA input-price
data and per-acre application norms, flags any category more than 30%
above the expected rate, and gives a specific, sourced suggestion for
reducing it. A farmer with no history yet still gets a usable estimate
from the benchmark alone — the whole design exists to make that true.

Beyond that core loop: **Cost Lab** (`/lab`) is a what-if sandbox for
trying different cost assumptions before recording anything for real;
**Budgets** (`/budgets`) let a farmer cap their own spend, independent of
the benchmark, at five levels — one category in one season, a crop's
total across every season, the whole farm, a category farm-wide, or a
category within one specific crop — with a live warning while recording
a cost that would exceed any of them; the Estimate Report and Costs
pages can each be downloaded as a PDF; and an AI assistant (FarmBot)
answers questions using the farmer's real recorded, flagged, and
budgeted data.

## Documentation

Everything about the project — not just the code — lives in `docs/`:

| Document | What it's for |
|---|---|
| [`FarmPilot_PRD.md`](docs/FarmPilot_PRD%20(1).md) | Product requirements: goals, scope, functional/non-functional requirements, business rules (also available as a self-contained `.html`) |
| [`FarmPilot_SDD.md`](docs/FarmPilot_SDD.md) | System design: architecture, data model, the estimation algorithm, security model, and the Twi localisation feature (§19) (also available as a self-contained `.html`) |
| [`FarmPilot_MiniProject_Report.md`](docs/FarmPilot_MiniProject_Report.md) | The submitted mini-project report (also available as a self-contained, Word-openable `.html` with every screenshot embedded) |
| [`FarmPilot_Development_Log.md`](docs/FarmPilot_Development_Log.md) | Full build history, architecture-decision index, and a 48-item issue register from a post-build hardening pass — root cause, fix, and live verification evidence for each |
| [`FarmPilot_Presentation_Guide.md`](docs/FarmPilot_Presentation_Guide.md) | Not a submitted deliverable — a condensed study aid for presenting the project: the elevator pitch, how it works step by step, every architecture decision explained in plain terms, and what's automated vs. manually tested vs. not tested at all |
| [`CHANGELOG.md`](docs/CHANGELOG.md) | Raw, PR-by-PR change history |
| [`DECISIONS.md`](docs/DECISIONS.md) | Architecture Decision Records (why the system is built the way it is) |
| `docs/adr/` | Additional standalone ADRs |
| `docs/screenshots/`, `docs/diagrams/` | Assets referenced by the report (real app screenshots; the Use Case and ER diagrams) |

Start with the PRD for *why*, the SDD for *how*, and the Development Log
for *what changed and what was found wrong along the way*.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript, Vite, Tailwind CSS v4, TanStack Query, React Hook Form + Zod, Recharts |
| Backend | Supabase — managed PostgreSQL 17, Auth (GoTrue), auto-generated REST (PostgREST), Storage |
| Business logic | PL/pgSQL functions (`generate_estimate`, `quick_fill_costs`, and the budget status views) — no separate application server |
| AI | Claude via OpenRouter (FarmBot); Ghana NLP's Khaya AI for Twi translation/TTS, generated once and cached |
| Offline | `vite-plugin-pwa` + IndexedDB (`idb`) |
| Hosting | Vercel (frontend), Supabase (database) |
| Testing | Vitest — unit (network-free) and integration (against the live, linked database) |

See `FarmPilot_SDD.md` §4 for the full stack with justification for each choice.

## Project structure

```
farmpilot/
├── docs/                    Everything documentation — see table above
├── src/
│   ├── api/                 Typed data-access layer — every Supabase call goes through here
│   ├── components/          domain/ (feature UI), features/ (WeeklyCatchUp, CostList), layout/, ui/
│   ├── hooks/                useAuth, useFarm, useTheme, useOnline, useOfflineStatus
│   ├── lib/                  supabase client, database.types.ts (generated), money/categories helpers
│   └── pages/                One file per route
├── supabase/
│   ├── migrations/           Numbered, applied-in-order schema history (001–024)
│   └── demo_seed.sql         Reproducible demonstration account — see docs/…Report.md Appendix D
├── scripts/
│   ├── test_crud.ts          Manual end-to-end CRUD smoke test
│   ├── run_mig.ts, test_*.ts/.sql   Ad-hoc scripts used during development
│   └── report-tools/         Regenerates the ER/use-case diagram images and the report's .html build
└── README.md                 This file
```

## Setup (from a fresh clone)

**Prerequisites:** Node.js 20+ and npm. A Supabase project — either the
shared one this app already runs against (ask a team member for the URL
and anon key) or your own (free tier is enough; see **Database
Migrations** below for how to load the schema into a fresh project).

```bash
# 1. Clone and install
git clone https://github.com/itzSAD999/farmpilot.git
cd farmpilot
npm install

# 2. Configure environment variables
cp .env.example .env
# then open .env and fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
# (Project Settings → API in the Supabase dashboard)

# 3. Run the dev server
npm run dev
# opens at http://localhost:5173
```

To sign in immediately without creating an account, use the seeded demo
account from the top of this README. To type-check and build for
production: `npm run build` (runs `tsc -b` then `vite build`); to preview
that production build locally: `npm run preview`.

If `npm run dev` starts but the app errors on load, it's almost always
the `.env` file — confirm both variables are set and that there's no
stray quote or trailing space around the values.

## Testing

```bash
npm test              # fast, network-free unit tests (pure functions only)
npm run test:watch    # same, in watch mode
npm run test:integration   # hits the real, linked Supabase project — needs .env
```

Unit tests (`vitest.config.ts`, 76 tests) cover pesewa/cedi conversion,
category-list and Ghana-region/district consistency, every API module's
error-message mapping — including all five budget tiers' — and the
Weekly Check-in's proportional-by-acreage split rule. Integration tests
(`vitest.integration.config.ts`, 64 tests, run one file at a time — see
Issue #38 on why) exercise every `src/api/*.ts` module directly against
the linked database — recording, `generate_estimate()` and the benchmark
RPCs, comparisons, budgets, dashboards, guides, auth, and a database
trigger that writes overspend notifications with no application code
involved — using throwaway test accounts and farms created and torn down
within each run, so nothing in the demo account or your own data is
touched. See
`FarmPilot_Development_Log.md`, Issues #34, #36–38, for what each tier
covers and why.

## Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Both are public, client-safe values (the anon key is meant to be exposed
in a browser bundle — access is enforced server-side by Row Level
Security, see `FarmPilot_SDD.md` §5). `.env.example` in the project root
has the same two keys with placeholder values, which is what `cp
.env.example .env` above copies.

## Database Migrations

Schema and reference data are committed as numbered SQL files under
`supabase/migrations/`, applied in order — the system is reproducible from
source with no manual step. Migrations in this project have generally been
applied directly against the shared Supabase project (via the SQL editor,
or `npx supabase db query --linked -f <file>`) rather than
`supabase db push`, since the CLI's own migration-history table doesn't
reflect them — see `FarmPilot_SDD.md` §16.3.

**Setting up a brand-new Supabase project from scratch:** run every file
in `supabase/migrations/` in numeric order (001 → 024) — either paste
each into the Supabase Dashboard's SQL Editor one at a time, or, once
`npx supabase login` and `npx supabase link --project-ref <your-ref>`
are done, run each with `npx supabase db query --linked -f <file>`. They
are not idempotent as a whole (some later files alter earlier tables),
so order matters.

To seed the demonstration account (safe to re-run — it resets the account
to a known clean state):

```bash
npx supabase db query --linked -f supabase/demo_seed.sql
```

## Regenerating the report documents

If any of the four core documents change, rebuild its `.html` twin (every
screenshot embedded, openable directly in Word or a browser):

```bash
node scripts/report-tools/build_report_doc.mjs docs/FarmPilot_MiniProject_Report.md docs/FarmPilot_MiniProject_Report.html
node scripts/report-tools/build_report_doc.mjs docs/FarmPilot_Development_Log.md docs/FarmPilot_Development_Log.html
node scripts/report-tools/build_report_doc.mjs docs/FarmPilot_SDD.md docs/FarmPilot_SDD.html
node scripts/report-tools/build_report_doc.mjs "docs/FarmPilot_PRD (1).md" docs/FarmPilot_PRD.html
```

To regenerate the Use Case / ER diagram images after editing
`scripts/report-tools/diagrams.html`:

```bash
node scripts/report-tools/render_diagrams.mjs
```

## Deployment

Deployed on Vercel, auto-deploying from `main`. If deploying your own
instance:

1. Connect the GitHub repository to a new Vercel project.
2. Add the environment variables above in the Vercel project settings.
3. Deploy.
4. In the **Supabase Dashboard → Authentication → URL Configuration**, add
   your Vercel domain to the Redirect URLs list — authentication will
   fail in production otherwise.
