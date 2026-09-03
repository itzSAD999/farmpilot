-- ============================================================
-- FarmPilot — Migration 022
-- Adds: crop_budgets — a farmer-set spending cap for a crop as a whole,
-- across every season of that crop on the farm — independent of the
-- existing per-season, per-category caps in category_budgets (015).
--
-- WHY THIS EXISTS
-- category_budgets caps one category in one season ("don't spend more
-- than GHS 500 on labour this season"). A farmer separately wants one
-- simple ceiling for the crop overall — "don't let my total Maize spend
-- go over GHS 8,000" — that isn't split by category and doesn't reset
-- every time a new season of the same crop is started. Scoped to
-- (farm_id, crop_id): one optional limit per crop per farm, checked
-- against the sum of season_costs across every one of that farm's
-- seasons for that crop (any year, any window).
-- ============================================================

create table if not exists crop_budgets (
  id                  bigserial primary key,
  farm_id             bigint not null references farms(id) on delete cascade,
  crop_id             bigint not null references crops(id) on delete cascade,
  limit_pesewas       bigint not null check (limit_pesewas > 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (farm_id, crop_id)
);

create index if not exists crop_budgets_farm_id_idx on crop_budgets(farm_id);

alter table crop_budgets enable row level security;

-- CREATE POLICY has no IF NOT EXISTS in Postgres, so drop-then-create is
-- what makes this migration safely re-runnable, matching category_budgets.
drop policy if exists crop_budgets_own on crop_budgets;
create policy crop_budgets_own on crop_budgets for all to authenticated
  using (exists (
    select 1 from farms f where f.id = crop_budgets.farm_id and f.user_id = auth.uid()));

-- ------------------------------------------------------------
-- v_crop_budget_status — a crop budget joined against what has actually
-- been recorded in season_costs across every season of that crop on the
-- farm, so the client gets "limit, spent, remaining, over" in one row.
-- ------------------------------------------------------------
create or replace view v_crop_budget_status with (security_invoker = true) as
select
  b.id,
  b.farm_id,
  b.crop_id,
  c.name                                                        as crop_name,
  b.limit_pesewas,
  coalesce(sc.spent_pesewas, 0)                                as spent_pesewas,
  b.limit_pesewas - coalesce(sc.spent_pesewas, 0)              as remaining_pesewas,
  coalesce(sc.spent_pesewas, 0) > b.limit_pesewas              as is_over_budget,
  case when b.limit_pesewas > 0
    then round((coalesce(sc.spent_pesewas, 0)::numeric / b.limit_pesewas) * 100)
  end                                                            as pct_used
from crop_budgets b
join crops c on c.id = b.crop_id
left join lateral (
  select sum(costs.amount_pesewas) as spent_pesewas
  from season_costs costs
  join seasons s on s.id = costs.season_id
  where s.farm_id = b.farm_id and s.crop_id = b.crop_id
) sc on true;
