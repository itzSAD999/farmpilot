# FarmPilot

Farm cost estimation and reduction tool for Ghanaian smallholder farmers.

**KNUST Mini Project 2025/2026**

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your Supabase credentials
3. Install dependencies:
   ```bash
   npm install
   ```
4. Apply migrations in your Supabase SQL editor:
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/003_profiles_and_views.sql`
5. Start the dev server:
   ```bash
   npm run dev
   ```

## Project Structure

```
├── supabase/migrations/   SQL schema + seed data
├── src/
│   ├── api/               Data access layer (typed Supabase queries)
│   ├── components/        React components (layout, ui, domain)
│   ├── hooks/             Custom React hooks
│   ├── lib/               Supabase client, types, money utils
│   └── pages/             Route-level page components
├── docs/                  PRD, SDD, changelog, decisions
└── .env.example           Required environment variables
```

## Documentation

- [Product Requirements](docs/FarmPilot_PRD%20(1).md)
- [System Design](docs/FarmPilot_SDD.md)
- [Changelog](docs/CHANGELOG.md)
- [Architecture Decisions](docs/DECISIONS.md)

## Team

- Osmond Abdul-Karim Woriwi (21034402)
- Aboagye Jeffery Ohene (21013336)
- Ayisha Abdullah (20950630)
