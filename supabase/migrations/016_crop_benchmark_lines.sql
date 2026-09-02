-- ============================================================
-- FarmPilot — Migration 016
-- Adds: get_crop_benchmark_lines(crop_id, season_window, area_acres)
--
-- WHY THIS EXISTS
-- get_crop_benchmark_breakdown() (migration 014) collapses Cost Lab's
-- numbers to one lump total per category — useful for the headline
-- figures, but it means dragging "Labour" only ever moves an abstract
-- cedi amount. A farmer thinks in real units: "20 person-days," "3 bags
-- of NPK," not "GHS 1,350." This returns one row per underlying input
-- (the same crop_input_norms x cost_benchmarks join the engine already
-- uses), with the quantity and per-unit price kept separate, so the
-- client can show and adjust "quantity x rate = cost" directly.
-- ============================================================

create or replace function get_crop_benchmark_lines(
  p_crop_id bigint,
  p_season_window season_window,
  p_area_acres numeric
)
returns table (
  category cost_category,
  input_name text,
  unit text,
  quantity_per_acre numeric,
  quantity_total numeric,
  unit_price_pesewas bigint
)
language sql
security invoker
stable
as $$
  select
    n.category,
    b.input_name,
    b.unit,
    n.quantity_per_acre,
    round((n.quantity_per_acre * p_area_acres)::numeric, 2) as quantity_total,
    round(b.price_pesewas * s.price_multiplier)::bigint as unit_price_pesewas
  from crop_input_norms n
  join cost_benchmarks b on b.id = n.benchmark_id
  cross join (select price_multiplier from app_settings where id = true) s
  where n.crop_id = p_crop_id
    and (n.season_window is null or n.season_window = p_season_window)
  order by n.category, b.input_name;
$$;
