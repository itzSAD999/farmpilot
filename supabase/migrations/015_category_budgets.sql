-- ============================================================
-- FarmPilot — Migration 015
-- Adds: category_budgets — an optional, farmer-set spending cap per
-- category per season (e.g. "I don't want to spend more than GHS 500 on
-- labour for this Maize season").
--
-- WHY THIS EXISTS
-- The benchmark comparison (generate_estimate) tells a farmer when a
-- category is above the *standard* rate — useful, but it's a fixed,
-- external number the farmer doesn't control. A farmer who has their
-- own ceiling in mind for a specific season (their own cash on hand,
-- not MoFA's national average) had no way to express that or be warned
-- against it. This is deliberately separate from the benchmark: a
-- category can be within benchmark and still over a farmer's own budget,
-- or vice versa.
--
-- Scoped to (season_id, category) — one optional limit per category per
-- season, not per crop overall, since "labour for this Maize season" is
-- exactly a season+category pair, matching how season_costs is itself
-- scoped. Not applied to Lab or historical back-filled seasons — a
-- budget is a live, going-forward constraint.
-- ============================================================

create table if not exists category_budgets (
  id                  bigserial primary key,
  season_id           bigint not null references seasons(id) on delete cascade,
  category            cost_category not null,
  limit_pesewas        bigint not null check (limit_pesewas > 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (season_id, category)
);

create index if not exists category_budgets_season_id_idx on category_budgets(season_id);

alter table category_budgets enable row level security;

-- CREATE POLICY has no IF NOT EXISTS in Postgres, so drop-then-create is
-- what makes this migration safely re-runnable (see supabase/migrations/
-- README pattern used elsewhere — matches the rest of this project's
-- migrations being re-applied directly rather than tracked by the CLI).
drop policy if exists category_budgets_own on category_budgets;
create policy category_budgets_own on category_budgets for all to authenticated
  using (exists (
    select 1 from seasons s join farms f on f.id = s.farm_id
    where s.id = category_budgets.season_id and f.user_id = auth.uid()));

-- ------------------------------------------------------------
-- v_category_budget_status — a budget joined against what has actually
-- been recorded in season_costs for the same (season, category), so the
-- client gets "limit, spent, remaining, over" in one row instead of
-- computing it from two separate queries.
-- ------------------------------------------------------------
create or replace view v_category_budget_status with (security_invoker = true) as
select
  b.id,
  b.season_id,
  b.category,
  b.limit_pesewas,
  coalesce(sc.spent_pesewas, 0)                                as spent_pesewas,
  b.limit_pesewas - coalesce(sc.spent_pesewas, 0)              as remaining_pesewas,
  coalesce(sc.spent_pesewas, 0) > b.limit_pesewas              as is_over_budget,
  case when b.limit_pesewas > 0
    then round((coalesce(sc.spent_pesewas, 0)::numeric / b.limit_pesewas) * 100)
  end                                                            as pct_used
from category_budgets b
left join lateral (
  select sum(amount_pesewas) as spent_pesewas
  from season_costs
  where season_id = b.season_id and category = b.category
) sc on true;
