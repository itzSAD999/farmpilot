-- ============================================================
-- FarmPilot — Migration 023
-- Adds: farm_budgets (one overall spending cap for the whole farm) and
-- farm_category_budgets (that farm-wide total optionally assigned
-- across the 8 cost categories) — a tier above the existing
-- category_budgets (015, per season+category) and crop_budgets
-- (022, per farm+crop).
--
-- WHY THIS EXISTS
-- A farmer may think in terms of one number for the whole farm before
-- ever breaking it down by crop or category — "I have GHS 30,000 to
-- spend this year, total." farm_budgets holds that single ceiling.
-- farm_category_budgets lets the farmer optionally assign portions of
-- that same ceiling to each cost category, farm-wide rather than tied
-- to one season — e.g. "of my GHS 30,000, no more than GHS 6,000 on
-- fertiliser across every season this farm runs, ever." Neither
-- enforces that the category assignments sum to the farm total —
-- that's left as a farmer-visible planning aid, not a hard constraint,
-- same as this project's other budgets never forcing a reconciliation.
--
-- Actual spend for both is measured against every season_costs row on
-- every one of the farm's seasons — the same "sum everything recorded
-- on this farm" v_farm_summary already computes, just checked against
-- a farmer-set ceiling instead of only reported. "Split by season and
-- crop" (the third part of this feature) needs no new table at all —
-- it reads the farm's existing per-season and per-crop totals
-- (listSeasons, v_crop_summary) against the same farm_budgets ceiling,
-- entirely client-side.
-- ============================================================

create table if not exists farm_budgets (
  id                  bigserial primary key,
  farm_id             bigint not null references farms(id) on delete cascade,
  limit_pesewas       bigint not null check (limit_pesewas > 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (farm_id)
);

alter table farm_budgets enable row level security;

drop policy if exists farm_budgets_own on farm_budgets;
create policy farm_budgets_own on farm_budgets for all to authenticated
  using (exists (
    select 1 from farms f where f.id = farm_budgets.farm_id and f.user_id = auth.uid()));

create or replace view v_farm_budget_status with (security_invoker = true) as
select
  b.id,
  b.farm_id,
  b.limit_pesewas,
  coalesce(sc.spent_pesewas, 0)                                as spent_pesewas,
  b.limit_pesewas - coalesce(sc.spent_pesewas, 0)              as remaining_pesewas,
  coalesce(sc.spent_pesewas, 0) > b.limit_pesewas              as is_over_budget,
  case when b.limit_pesewas > 0
    then round((coalesce(sc.spent_pesewas, 0)::numeric / b.limit_pesewas) * 100)
  end                                                            as pct_used
from farm_budgets b
left join lateral (
  select sum(costs.amount_pesewas) as spent_pesewas
  from season_costs costs
  join seasons s on s.id = costs.season_id
  where s.farm_id = b.farm_id
) sc on true;

create table if not exists farm_category_budgets (
  id                  bigserial primary key,
  farm_id             bigint not null references farms(id) on delete cascade,
  category            cost_category not null,
  limit_pesewas       bigint not null check (limit_pesewas > 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (farm_id, category)
);

create index if not exists farm_category_budgets_farm_id_idx on farm_category_budgets(farm_id);

alter table farm_category_budgets enable row level security;

drop policy if exists farm_category_budgets_own on farm_category_budgets;
create policy farm_category_budgets_own on farm_category_budgets for all to authenticated
  using (exists (
    select 1 from farms f where f.id = farm_category_budgets.farm_id and f.user_id = auth.uid()));

create or replace view v_farm_category_budget_status with (security_invoker = true) as
select
  b.id,
  b.farm_id,
  b.category,
  b.limit_pesewas,
  coalesce(sc.spent_pesewas, 0)                                as spent_pesewas,
  b.limit_pesewas - coalesce(sc.spent_pesewas, 0)              as remaining_pesewas,
  coalesce(sc.spent_pesewas, 0) > b.limit_pesewas              as is_over_budget,
  case when b.limit_pesewas > 0
    then round((coalesce(sc.spent_pesewas, 0)::numeric / b.limit_pesewas) * 100)
  end                                                            as pct_used
from farm_category_budgets b
left join lateral (
  select sum(costs.amount_pesewas) as spent_pesewas
  from season_costs costs
  join seasons s on s.id = costs.season_id
  where s.farm_id = b.farm_id and costs.category = b.category
) sc on true;
