-- ============================================================
-- FarmPilot — Migration 010
-- Fixes: generate_estimate() never looked at the CURRENT season's
-- own season_costs, so recording costs (via the normal form or the
-- Weekly Check-in) had zero effect on the estimate's variance/flags/
-- advice/savings for any season without prior completed history —
-- estimated_pesewas was always forced equal to benchmark_pesewas,
-- so variance was always 0% and nothing was ever flagged.
--
-- New behaviour, per category, for the season being estimated:
--   - If the farmer has ALREADY recorded a cost this season for that
--     category, estimated_pesewas = what they actually recorded (the
--     "live, as-you-go" number from AddCostForm / WeeklyCatchUp).
--   - If not yet recorded, estimated_pesewas falls back to a
--     PREDICTION: their own historical per-acre average (if they have
--     a completed prior season of this crop) or the standard MoFA
--     benchmark rate — exactly as before.
--   - is_actual (new column) tells the two apart so the UI can badge
--     "Recorded" vs "Predicted".
--   - Flagging/variance/advice/potential-savings are computed ONLY
--     for actually-recorded categories, always compared against the
--     fixed benchmark rate (never against the farmer's own history —
--     history only informs the *prediction*, per the engine's
--     original documented intent in 001_schema.sql section 6).
-- ============================================================

alter table estimate_lines add column if not exists is_actual boolean not null default false;

create or replace function generate_estimate(p_season_id bigint)
returns bigint
language plpgsql
security invoker
as $$
declare
  v_season        seasons%rowtype;
  v_settings      app_settings%rowtype;
  v_prior_count   integer;
  v_estimate_id   bigint;
  v_method        estimate_method;
  v_total         bigint;
begin
  select * into v_season from seasons where id = p_season_id;
  if not found then
    raise exception 'Season % not found or not accessible', p_season_id;
  end if;

  select * into v_settings from app_settings where id = true;

  -- How many prior seasons of this crop does this farm have?
  select count(*) into v_prior_count
  from seasons s
  where s.farm_id = v_season.farm_id
    and s.crop_id = v_season.crop_id
    and s.id <> p_season_id
    and s.is_complete
    and exists (select 1 from season_costs sc where sc.season_id = s.id);

  v_method := case when v_prior_count > 0 then 'history' else 'benchmark' end;

  drop table if exists _calc;
  create temp table _calc as
  with
  -- The farmer's own average per-acre cost, by category, from OTHER
  -- completed seasons of this crop. Feeds the *prediction* only.
  history as (
    select
      category,
      avg(amount_pesewas::numeric / area_planted_acres) as per_acre
    from (
      select s.id, sc.category, sum(sc.amount_pesewas) as amount_pesewas, s.area_planted_acres
      from seasons s
      join season_costs sc on sc.season_id = s.id
      where s.farm_id = v_season.farm_id
        and s.crop_id = v_season.crop_id
        and s.id <> p_season_id
        and s.is_complete
      group by s.id, sc.category, s.area_planted_acres
    ) season_category_totals
    group by category
  ),
  -- The expected per-acre cost from norms x prices. Feeds both the
  -- prediction (when no history) and the flagging reference (always).
  benchmark as (
    select
      n.category,
      sum(n.quantity_per_acre * b.price_pesewas * v_settings.price_multiplier) as per_acre
    from crop_input_norms n
    join cost_benchmarks b on b.id = n.benchmark_id
    where n.crop_id = v_season.crop_id
      and (n.season_window is null or n.season_window = v_season.season_window)
    group by n.category
  ),
  -- What the farmer has ACTUALLY recorded for THIS season, right now —
  -- from the normal cost form and/or the Weekly Check-in, both of
  -- which just insert rows into season_costs.
  actual as (
    select category, sum(amount_pesewas) as total_pesewas
    from season_costs
    where season_id = p_season_id
    group by category
  ),
  categories as (
    select category from history
    union
    select category from benchmark
    union
    select category from actual
  ),
  merged as (
    select
      c.category,
      h.per_acre as hist_per_acre,
      bm.per_acre as bench_per_acre,
      a.total_pesewas as actual_total_pesewas
    from categories c
    left join history h on h.category = c.category
    left join benchmark bm on bm.category = c.category
    left join actual a on a.category = c.category
  )
  select
    m.category,
    (coalesce(m.actual_total_pesewas, 0) > 0) as is_actual,
    -- Store exact numeric for total sum calculation (round at end, not per line).
    -- Actual recorded spend wins when present; otherwise fall back to prediction.
    coalesce(
      nullif(m.actual_total_pesewas::numeric, 0),
      (case when v_method = 'history' then m.hist_per_acre else m.bench_per_acre end) * v_season.area_planted_acres,
      m.bench_per_acre * v_season.area_planted_acres,
      m.hist_per_acre * v_season.area_planted_acres,
      0
    ) as estimated_pesewas_exact,
    (coalesce(m.bench_per_acre, 0) * v_season.area_planted_acres) as benchmark_pesewas_exact
  from merged m;

  select round(coalesce(sum(estimated_pesewas_exact), 0))::bigint into v_total from _calc;

  insert into estimates (season_id, method, seasons_used, area_acres, total_pesewas, price_multiplier)
  values (p_season_id, v_method, v_prior_count, v_season.area_planted_acres, v_total, v_settings.price_multiplier)
  returning id into v_estimate_id;

  insert into estimate_lines (
    estimate_id, category, estimated_pesewas, benchmark_pesewas,
    variance_pct, is_flagged, advice, potential_saving_pesewas, is_actual
  )
  select
    v_estimate_id,
    c.category,
    round(c.estimated_pesewas_exact)::bigint,
    nullif(round(c.benchmark_pesewas_exact)::bigint, 0),
    -- Only compare against the benchmark once the farmer has actually
    -- recorded something in that category this season — a still-
    -- predicted line has nothing real to flag yet.
    case when c.is_actual and c.benchmark_pesewas_exact > 0
      then round(((c.estimated_pesewas_exact - c.benchmark_pesewas_exact)::numeric
                  / c.benchmark_pesewas_exact) * 100, 2)
    end,
    case when c.is_actual and c.benchmark_pesewas_exact > 0
      then ((c.estimated_pesewas_exact - c.benchmark_pesewas_exact)::numeric
            / c.benchmark_pesewas_exact) * 100 > v_settings.flag_threshold_pct
      else false end,
    case when c.is_actual and c.benchmark_pesewas_exact > 0
      and ((c.estimated_pesewas_exact - c.benchmark_pesewas_exact)::numeric
           / c.benchmark_pesewas_exact) * 100 > v_settings.flag_threshold_pct
      then (select ar.message from advice_rules ar where ar.category = c.category)
    end,
    case when c.is_actual and c.estimated_pesewas_exact > c.benchmark_pesewas_exact
      then round(c.estimated_pesewas_exact - c.benchmark_pesewas_exact)::bigint else 0 end,
    c.is_actual
  from _calc c;

  drop table if exists _calc;

  return v_estimate_id;
end;
$$;

-- The report view lists its columns explicitly, so it needs is_actual
-- added too or the frontend can never see the recorded-vs-predicted flag.
create or replace view v_estimate_report with (security_invoker = true) as
select
  e.id                as estimate_id,
  e.season_id,
  s.farm_id,
  f.name              as farm_name,
  cr.name             as crop_name,
  s.year,
  s.season_window,
  e.area_acres,
  e.method,
  e.seasons_used,
  e.total_pesewas,
  e.created_at,
  el.category,
  el.estimated_pesewas,
  el.benchmark_pesewas,
  el.variance_pct,
  el.is_flagged,
  el.advice,
  el.potential_saving_pesewas,
  el.is_actual
from estimates e
join seasons s   on s.id = e.season_id
join farms f     on f.id = s.farm_id
join crops cr    on cr.id = s.crop_id
join estimate_lines el on el.estimate_id = e.id;
