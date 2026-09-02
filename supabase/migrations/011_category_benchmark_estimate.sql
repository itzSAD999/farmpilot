-- ============================================================
-- FarmPilot — Migration 011
-- Adds: get_category_benchmark_pesewas(season_id, category)
--
-- WHY THIS EXISTS
-- quick_fill_costs() already fills EVERY expected category from the
-- standard benchmark rates at once, but only when a season has zero
-- costs recorded. There was no way to fill in ONE category on demand
-- from inside the normal "Add Cost" form when a farmer simply doesn't
-- know that one number (e.g. they've recorded seeds and fertiliser
-- but have no idea what land prep should cost).
--
-- This reuses the exact same math as quick_fill_costs()/generate_estimate()
-- (norms x benchmark price x price_multiplier x this season's acreage)
-- for a single category, so the number a farmer taps to accept always
-- matches what the estimate engine would show as the benchmark for
-- that category.
-- ============================================================

create or replace function get_category_benchmark_pesewas(p_season_id bigint, p_category cost_category)
returns bigint
language plpgsql
security invoker
as $$
declare
  v_season   seasons%rowtype;
  v_settings app_settings%rowtype;
  v_amount   bigint;
begin
  select * into v_season from seasons where id = p_season_id;
  if not found then
    raise exception 'Season % not found or not accessible', p_season_id;
  end if;

  select * into v_settings from app_settings where id = true;

  select round(sum(n.quantity_per_acre * b.price_pesewas * v_settings.price_multiplier) * v_season.area_planted_acres)::bigint
  into v_amount
  from crop_input_norms n
  join cost_benchmarks b on b.id = n.benchmark_id
  where n.crop_id = v_season.crop_id
    and n.category = p_category
    and (n.season_window is null or n.season_window = v_season.season_window);

  return coalesce(v_amount, 0);
end;
$$;
