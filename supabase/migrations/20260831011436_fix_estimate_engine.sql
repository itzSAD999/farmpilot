-- Fix arithmetic bugs in the estimation engine (history averaging & rounding position)
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
  -- The farmer's own average per-acre cost, by category.
  -- Fix: Calculate per-acre per season, THEN average across seasons.
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
  -- The expected per-acre cost from norms x prices.
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
  merged as (
    select
      coalesce(h.category, bm.category) as category,
      h.per_acre  as hist_per_acre,
      bm.per_acre as bench_per_acre
    from history h
    full outer join benchmark bm on bm.category = h.category
  )
  select
    m.category,
    -- Store exact numeric for total sum calculation (Fix: Round at end, not per line)
    (coalesce(
      case when v_method = 'history' then m.hist_per_acre else m.bench_per_acre end,
      m.bench_per_acre, m.hist_per_acre, 0
    ) * v_season.area_planted_acres) as estimated_pesewas_exact,
    (coalesce(m.bench_per_acre, 0) * v_season.area_planted_acres) as benchmark_pesewas_exact
  from merged m;

  -- Fix: Round the exact sum once, instead of summing rounded lines
  select round(coalesce(sum(estimated_pesewas_exact), 0))::bigint into v_total from _calc;

  insert into estimates (season_id, method, seasons_used, area_acres, total_pesewas, price_multiplier)
  values (p_season_id, v_method, v_prior_count, v_season.area_planted_acres, v_total, v_settings.price_multiplier)
  returning id into v_estimate_id;

  insert into estimate_lines (
    estimate_id, category, estimated_pesewas, benchmark_pesewas,
    variance_pct, is_flagged, advice, potential_saving_pesewas
  )
  select
    v_estimate_id,
    c.category,
    round(c.estimated_pesewas_exact)::bigint,
    nullif(round(c.benchmark_pesewas_exact)::bigint, 0),
    case when c.benchmark_pesewas_exact > 0
      then round(((c.estimated_pesewas_exact - c.benchmark_pesewas_exact)::numeric
                  / c.benchmark_pesewas_exact) * 100, 2)
    end,
    case when c.benchmark_pesewas_exact > 0
      then ((c.estimated_pesewas_exact - c.benchmark_pesewas_exact)::numeric
            / c.benchmark_pesewas_exact) * 100 > v_settings.flag_threshold_pct
      else false end,
    case when c.benchmark_pesewas_exact > 0
      and ((c.estimated_pesewas_exact - c.benchmark_pesewas_exact)::numeric
           / c.benchmark_pesewas_exact) * 100 > v_settings.flag_threshold_pct
      then (select ar.message from advice_rules ar where ar.category = c.category)
    end,
    case when c.estimated_pesewas_exact > c.benchmark_pesewas_exact
      then round(c.estimated_pesewas_exact - c.benchmark_pesewas_exact)::bigint else 0 end
  from _calc c;

  drop table if exists _calc;

  return v_estimate_id;
end;
$$;