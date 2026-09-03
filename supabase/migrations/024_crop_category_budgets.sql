-- ============================================================
-- FarmPilot — Migration 024
-- Adds: crop_category_budgets — the most granular budgeting tier: a
-- spending cap for one category WITHIN one crop, farm-wide across every
-- season of that crop. This is how a farmer actually plans a crop —
-- "for my Maize this year: Labour GHS 300, Seeds GHS 400, Fertiliser
-- GHS 600" — rather than one lump total per crop (crop_budgets, 022) or
-- one lump total per category across every crop (farm_category_budgets,
-- 023).
--
-- Scoped to (farm_id, crop_id, category): one optional limit per
-- category per crop per farm. Actual spend is measured the same way as
-- every other budget tier here — summed from season_costs across every
-- one of the farm's seasons that match both the crop and the category.
-- ============================================================

create table if not exists crop_category_budgets (
  id                  bigserial primary key,
  farm_id             bigint not null references farms(id) on delete cascade,
  crop_id             bigint not null references crops(id) on delete cascade,
  category            cost_category not null,
  limit_pesewas       bigint not null check (limit_pesewas > 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (farm_id, crop_id, category)
);

create index if not exists crop_category_budgets_farm_id_idx on crop_category_budgets(farm_id);
create index if not exists crop_category_budgets_crop_id_idx on crop_category_budgets(crop_id);

alter table crop_category_budgets enable row level security;

drop policy if exists crop_category_budgets_own on crop_category_budgets;
create policy crop_category_budgets_own on crop_category_budgets for all to authenticated
  using (exists (
    select 1 from farms f where f.id = crop_category_budgets.farm_id and f.user_id = auth.uid()));

create or replace view v_crop_category_budget_status with (security_invoker = true) as
select
  b.id,
  b.farm_id,
  b.crop_id,
  c.name                                                        as crop_name,
  b.category,
  b.limit_pesewas,
  coalesce(sc.spent_pesewas, 0)                                as spent_pesewas,
  b.limit_pesewas - coalesce(sc.spent_pesewas, 0)              as remaining_pesewas,
  coalesce(sc.spent_pesewas, 0) > b.limit_pesewas              as is_over_budget,
  case when b.limit_pesewas > 0
    then round((coalesce(sc.spent_pesewas, 0)::numeric / b.limit_pesewas) * 100)
  end                                                            as pct_used
from crop_category_budgets b
join crops c on c.id = b.crop_id
left join lateral (
  select sum(costs.amount_pesewas) as spent_pesewas
  from season_costs costs
  join seasons s on s.id = costs.season_id
  where s.farm_id = b.farm_id and s.crop_id = b.crop_id and costs.category = b.category
) sc on true;
