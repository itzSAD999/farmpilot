-- 007_quick_fill_costs.sql
create or replace function quick_fill_costs(p_season_id bigint)
returns void
language plpgsql
security invoker
as $$
declare
  v_season seasons%rowtype;
  v_settings app_settings%rowtype;
  v_inserted integer := 0;
begin
  select * into v_season from seasons where id = p_season_id;
  select * into v_settings from app_settings where id = true;

  -- Insert benchmarks if available
  insert into season_costs (season_id, category, description, amount_pesewas, date_incurred)
  select 
    p_season_id,
    n.category,
    'Auto-filled average estimate',
    round(sum(n.quantity_per_acre * b.price_pesewas * v_settings.price_multiplier) * v_season.area_planted_acres)::bigint,
    now()
  from crop_input_norms n
  join cost_benchmarks b on b.id = n.benchmark_id
  where n.crop_id = v_season.crop_id
    and (n.season_window is null or n.season_window = v_season.season_window)
  group by n.category;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- If no benchmarks exist (e.g. new crop), just insert empty records for the 4 core categories
  if v_inserted = 0 then
    insert into season_costs (season_id, category, description, amount_pesewas, date_incurred)
    values
      (p_season_id, 'seeds', 'Auto-filled placeholder', 0, now()),
      (p_season_id, 'land_prep', 'Auto-filled placeholder', 0, now()),
      (p_season_id, 'fertiliser', 'Auto-filled placeholder', 0, now()),
      (p_season_id, 'labour', 'Auto-filled placeholder', 0, now());
  end if;
end;
$$;
