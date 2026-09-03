# FarmPilot

A web application that tells a small-scale Ghanaian farmer what a farming
season should cost, and where they are spending more than they need to.
Built as a Year 3 mini project for the Department of Computer Science,
Kwame Nkrumah University of Science and Technology (2025/2026).

**Live app:** https://farmpilot-chi.vercel.app
**Repository:** https://github.com/itzSAD999/farmpilot

**Try it now** with the seeded demonstration account (see
`docs/FarmPilot_MiniProject_Report.md`, Appendix D, for what it contains):

```
Email:    kwame.mensah@farmpilot.demo
Password: FarmPilotDemo2026!
```

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
**Category Budgets** let a farmer cap their own spend per category per
season, independent of the benchmark, with a live warning while
recording a cost that would exceed it; the Estimate Report and Costs
pages can each be downloaded as a PDF; and an AI assistant (FarmBot)
answers questions using the farmer's real recorded and flagged data.

## Documentation

Everything about the project — not just the code — lives in `docs/`:

| Document | What it's for |
|---|---|
| [`FarmPilot_PRD.md`](docs/FarmPilot_PRD%20(1).md) | Product requirements: goals, scope, functional/non-functional requirements, business rules |
| [`FarmPilot_SDD.md`](docs/FarmPilot_SDD.md) | System design: architecture, data model, the estimation algorithm, security model |
| [`FarmPilot_MiniProject_Report.md`](docs/FarmPilot_MiniProject_Report.md) | The submitted mini-project report (also available as a self-contained, Word-openable `.html` with every screenshot embedded) |
| [`FarmPilot_Development_Log.md`](docs/FarmPilot_Development_Log.md) | Full build history, architecture-decision index, and a 38-item issue register from a post-build hardening pass — root cause, fix, and live verification evidence for each |
| [`CHANGELOG.md`](docs/CHANGELOG.md) | Raw, PR-by-PR change history |
| [`DECISIONS.md`](docs/DECISIONS.md) | Architecture Decision Records (why the system is built the way it is) |
| `docs/adr/` | Additional standalone ADRs |
| `docs/screenshots/`, `docs/diagrams/` | Assets referenced by the report (real app screenshots; the Use Case and ER diagrams) |

Start with the PRD for *why*, the SDD for *how*, and the Development Log
for *what changed and what was found wrong along the way*.

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
│   ├── migrations/           Numbered, applied-in-order schema history (001–016)
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

Unit tests (`vitest.config.ts`, 67 tests) cover pesewa/cedi conversion,
category-list and Ghana-region/district consistency, every API module's
error-message mapping, and the Weekly Check-in's proportional-by-acreage
split rule. Integration tests (`vitest.integration.config.ts`, 62 tests,
run one file at a time — see Issue #38 on why) exercise every
`src/api/*.ts` module directly against the linked database — recording,
`generate_estimate()` and the benchmark RPCs, comparisons, budgets,
dashboards, guides, auth, and a database trigger that writes overspend
notifications with no application code involved — using throwaway test
accounts and farms created and torn down within each run, so nothing in
the demo account or your own data is touched. See
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
in `supabase/migrations/` in numeric order (001 → 016) — either paste
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

If `docs/FarmPilot_MiniProject_Report.md` or `FarmPilot_Development_Log.md`
change, rebuild their `.html` twins (every screenshot embedded, openable
directly in Word or a browser):

```bash
node scripts/report-tools/build_report_doc.mjs docs/FarmPilot_MiniProject_Report.md docs/FarmPilot_MiniProject_Report.html
node scripts/report-tools/build_report_doc.mjs docs/FarmPilot_Development_Log.md docs/FarmPilot_Development_Log.html
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
