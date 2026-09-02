-- ============================================================
-- 1. Secure the views to enforce Row Level Security
-- ============================================================
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
  el.potential_saving_pesewas
from estimates e
join seasons s   on s.id = e.season_id
join farms f     on f.id = s.farm_id
join crops cr    on cr.id = s.crop_id
join estimate_lines el on el.estimate_id = e.id;

create or replace view v_farm_summary with (security_invoker = true) as
select
  f.id                                as farm_id,
  f.user_id,
  f.name                              as farm_name,
  f.total_area_acres,
  count(distinct s.id)                as season_count,
  count(distinct s.crop_id)           as crop_count,
  count(distinct s.id) filter (where s.is_complete)     as completed_seasons,
  coalesce(sum(s.area_planted_acres), 0)               as total_planted_acres,
  coalesce(sum(sc.total_recorded), 0)                  as total_recorded_pesewas,
  coalesce(sum(e.total_pesewas), 0)                    as total_estimated_pesewas,
  coalesce(sum(e.total_saving), 0)                     as total_possible_saving_pesewas
from farms f
left join seasons s on s.farm_id = f.id
left join lateral (
  select sum(amount_pesewas) as total_recorded
  from season_costs where season_id = s.id
) sc on true
left join lateral (
  select e2.total_pesewas,
         (select sum(potential_saving_pesewas)
            from estimate_lines where estimate_id = e2.id) as total_saving
  from estimates e2
  where e2.season_id = s.id
  order by e2.created_at desc
  limit 1
) e on true
group by f.id, f.user_id, f.name, f.total_area_acres;

create or replace view v_crop_summary with (security_invoker = true) as
select
  s.farm_id,
  f.user_id,
  c.id                                as crop_id,
  c.name                              as crop_name,
  count(s.id)                         as season_count,
  sum(s.area_planted_acres)           as total_acres,
  coalesce(sum(sc.total_recorded), 0) as total_recorded_pesewas,
  case when sum(s.area_planted_acres) > 0
    then round(coalesce(sum(sc.total_recorded), 0)
               / sum(s.area_planted_acres))
  end                                 as cost_per_acre_pesewas
from seasons s
join farms f on f.id = s.farm_id
join crops c on c.id = s.crop_id
left join lateral (
  select sum(amount_pesewas) as total_recorded
  from season_costs where season_id = s.id
) sc on true
group by s.farm_id, f.user_id, c.id, c.name;


-- ============================================================
-- 2. Seed the crops (ignoring duplicates if they exist)
-- ============================================================
insert into crops (name, local_name, avg_yield_mt_ha, potential_yield_mt_ha) values
  ('Maize',       'Aburoo',   2.26,  5.50),
  ('Rice (Paddy)','Emo',      2.96,  6.00),
  ('Cassava',     'Bankye',  21.33, 45.00),
  ('Yam',         'Bayere',  16.58, 52.00),
  ('Plantain',    'Borɔdeɛ', 12.11, 38.00),
  ('Cowpea',      'Adua',     1.51,  2.50),
  ('Groundnut',   'Nkatie',   1.63,  3.50),
  ('Soya bean',   null,       1.72,  3.00),
  ('Tomato',      'Ntoos',    7.93, 20.00),
  ('Pepper',      'Mako',     8.88, 30.00)
ON CONFLICT (name) DO NOTHING;
