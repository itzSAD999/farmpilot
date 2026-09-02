-- ============================================================
-- FarmPilot — Migration 014
-- Adds: get_crop_benchmark_breakdown(crop_id, season_window, area_acres)
--
-- WHY THIS EXISTS
-- Every existing benchmark RPC (get_category_benchmark_pesewas,
-- generate_estimate) reads its crop/window/area from an existing
-- `seasons` row — there was no way to ask "what would the standard
-- benchmark be for this crop, at this acreage" without first creating a
-- real season. The Lab feature is a what-if sandbox — a farmer picks a
-- crop and acreage to experiment with cost assumptions before planting
-- anything for real, so it needs the same benchmark math with no season
-- required.
--
-- Returns one row per category with norms for the crop (the same set
-- generate_estimate() would predict from if there were no history),
-- so the client can seed sliders with real numbers instead of guesses.
-- ============================================================

create or replace function get_crop_benchmark_breakdown(
  p_crop_id bigint,
  p_season_window season_window,
  p_area_acres numeric
)
returns table (category cost_category, benchmark_pesewas bigint)
language sql
security invoker
stable
as $$
  select
    n.category,
    round(sum(n.quantity_per_acre * b.price_pesewas * s.price_multiplier) * p_area_acres)::bigint as benchmark_pesewas
  from crop_input_norms n
  join cost_benchmarks b on b.id = n.benchmark_id
  cross join (select price_multiplier from app_settings where id = true) s
  where n.crop_id = p_crop_id
    and (n.season_window is null or n.season_window = p_season_window)
  group by n.category;
$$;
