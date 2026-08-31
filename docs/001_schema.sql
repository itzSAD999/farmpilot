-- ============================================================
-- FarmPilot — Full Data Model
-- KNUST Mini Project 2025/2026
-- Target: Supabase (PostgreSQL 15+)
--
-- Run order: this file is one migration. Run top to bottom.
-- Money is stored as INTEGER PESEWAS. Never use floats for money.
-- Area is stored in ACRES. All comparison happens per acre.
-- ============================================================


-- ============================================================
-- SECTION 0 — ENUMS
-- ============================================================

-- Fixed cost categories. Hardcoded on purpose: every category must
-- have a benchmark, otherwise the engine cannot flag it as overspend.
create type cost_category as enum (
  'seeds',
  'fertiliser',
  'agrochem',
  'land_prep',
  'labour',
  'transport',
  'storage',
  'other'
);

-- Ghana's middle belt is bimodal. 'dry' covers irrigated off-season.
create type season_window as enum ('major', 'minor', 'dry');

create type price_basis as enum ('subsidised', 'open_market');

create type estimate_method as enum ('benchmark', 'blended', 'history');


-- ============================================================
-- SECTION 1 — REFERENCE TABLES
-- Seeded by the developers. Read-only to farmers.
-- ============================================================

-- ---------- 1.1 app_settings ----------
-- Single-row config table. Holds the values you will need to tune
-- during marking without a redeploy.
create table app_settings (
  id                  boolean primary key default true,
  -- MoFA input prices are from 2018. This multiplier brings them to
  -- present-day cedis. VERIFY against current market before demo.
  price_multiplier    numeric(6,2) not null default 4.50,
  -- A category is flagged as overspend above this variance.
  flag_threshold_pct  numeric(5,2) not null default 30.00,
  updated_at          timestamptz not null default now(),
  constraint app_settings_single_row check (id)
);

insert into app_settings (id) values (true);


-- ---------- 1.2 crops ----------
create table crops (
  id                  bigserial primary key,
  name                text not null unique,
  local_name          text,                    -- Twi / Dagbani
  maturity_days       integer,
  avg_yield_mt_ha     numeric(8,2),            -- MoFA F&F 2018 Table 4.6
  potential_yield_mt_ha numeric(8,2),          -- MoFA F&F 2018 Table 4.6
  created_at          timestamptz not null default now()
);

comment on column crops.avg_yield_mt_ha is
  'National on-farm average. Used to compute cost per unit harvested.';


-- ---------- 1.3 cost_benchmarks ----------
-- Unit prices of inputs. This is the table that solves cold start.
create table cost_benchmarks (
  id                  bigserial primary key,
  input_name          text not null,
  category            cost_category not null,
  unit                text not null,           -- '50kg', 'litre', 'acre', 'person_day'
  year                integer not null,
  price_pesewas       integer not null check (price_pesewas >= 0),
  basis               price_basis not null default 'open_market',
  source              text not null,
  created_at          timestamptz not null default now(),
  unique (input_name, unit, year, basis)
);

comment on table cost_benchmarks is
  'Unit prices only. Per-acre cost is computed via crop_input_norms.';


-- ---------- 1.4 crop_input_norms ----------
-- THE BRIDGE. Benchmarks give price per unit; norms give units per acre.
-- Multiply the two to get an expected per-acre cost for a new farmer.
-- Without this table the benchmark prices are unusable.
create table crop_input_norms (
  id                  bigserial primary key,
  crop_id             bigint not null references crops(id) on delete cascade,
  benchmark_id        bigint not null references cost_benchmarks(id) on delete restrict,
  category            cost_category not null,
  quantity_per_acre   numeric(10,3) not null check (quantity_per_acre >= 0),
  window              season_window,           -- null = applies to all windows
  source              text not null,
  unique (crop_id, benchmark_id, window)
);

comment on table crop_input_norms is
  'Agronomic application rates. Source these from CSIR-CRI Fumesua '
  'extension recommendations, not from guesswork.';


-- ---------- 1.5 advice_rules ----------
-- One suggestion per category. Kept as a table so the text can be
-- edited without touching the function.
create table advice_rules (
  id                  bigserial primary key,
  category            cost_category not null unique,
  message             text not null
);


-- ============================================================
-- SECTION 2 — FARMER RECORDS
-- Owned data. RLS enforced.
-- ============================================================

-- ---------- 2.1 farms ----------
create table farms (
  id                  bigserial primary key,
  user_id             uuid not null references auth.users(id) on delete cascade,
  name                text not null,
  district            text,
  region              text,
  total_area_acres    numeric(8,2) not null check (total_area_acres > 0),
  created_at          timestamptz not null default now()
);

create index farms_user_id_idx on farms(user_id);


-- ---------- 2.2 seasons ----------
create table seasons (
  id                  bigserial primary key,
  farm_id             bigint not null references farms(id) on delete cascade,
  crop_id             bigint not null references crops(id) on delete restrict,
  year                integer not null check (year between 2015 and 2100),
  window              season_window not null,
  area_planted_acres  numeric(8,2) not null check (area_planted_acres > 0),
  harvest_qty         numeric(12,2),
  harvest_unit        text,                    -- 'bag_100kg', 'bag_50kg', 'mt'
  revenue_pesewas     bigint check (revenue_pesewas >= 0),
  is_complete         boolean not null default false,
  created_at          timestamptz not null default now(),
  -- A farmer can grow the same crop in major and minor season of the
  -- same year, but not twice in the same window.
  unique (farm_id, crop_id, year, window)
);

create index seasons_farm_id_idx on seasons(farm_id);
create index seasons_lookup_idx on seasons(farm_id, crop_id, year desc);


-- ---------- 2.3 season_costs ----------
create table season_costs (
  id                  bigserial primary key,
  season_id           bigint not null references seasons(id) on delete cascade,
  category            cost_category not null,
  description         text,
  -- quantity and unit are OPTIONAL. A farmer often knows only the
  -- total he spent, not the bag rate. Do not make these required.
  quantity            numeric(10,2),
  unit                text,
  unit_cost_pesewas   integer check (unit_cost_pesewas >= 0),
  amount_pesewas      integer not null check (amount_pesewas >= 0),
  date_incurred       date,
  created_at          timestamptz not null default now()
);

create index season_costs_season_id_idx on season_costs(season_id);
create index season_costs_category_idx on season_costs(season_id, category);


-- ============================================================
-- SECTION 3 — OUTPUT (SNAPSHOTS)
-- Written by the engine. Snapshotted because benchmarks change and
-- the farmer must be able to see what he was told last season.
-- ============================================================

-- ---------- 3.1 estimates ----------
create table estimates (
  id                  bigserial primary key,
  season_id           bigint not null references seasons(id) on delete cascade,
  method              estimate_method not null,
  seasons_used        integer not null default 0,
  area_acres          numeric(8,2) not null,
  total_pesewas       bigint not null,
  price_multiplier    numeric(6,2) not null,   -- snapshot of the setting used
  created_at          timestamptz not null default now()
);

create index estimates_season_id_idx on estimates(season_id, created_at desc);


-- ---------- 3.2 estimate_lines ----------
-- One row per category. Carries the estimate, the comparison, the
-- flag, and the advice — so the results screen is a single query.
create table estimate_lines (
  id                  bigserial primary key,
  estimate_id         bigint not null references estimates(id) on delete cascade,
  category            cost_category not null,
  estimated_pesewas   bigint not null,
  benchmark_pesewas   bigint,
  variance_pct        numeric(7,2),
  is_flagged          boolean not null default false,
  advice              text,
  potential_saving_pesewas bigint,
  unique (estimate_id, category)
);


-- ============================================================
-- SECTION 4 — ROW LEVEL SECURITY
-- The reference/owned split IS the RLS boundary.
-- ============================================================

alter table crops             enable row level security;
alter table cost_benchmarks   enable row level security;
alter table crop_input_norms  enable row level security;
alter table advice_rules      enable row level security;
alter table app_settings      enable row level security;
alter table farms             enable row level security;
alter table seasons           enable row level security;
alter table season_costs      enable row level security;
alter table estimates         enable row level security;
alter table estimate_lines    enable row level security;

-- Reference: everyone signed in can read, nobody can write.
create policy ref_read_crops      on crops            for select to authenticated using (true);
create policy ref_read_benchmarks on cost_benchmarks  for select to authenticated using (true);
create policy ref_read_norms      on crop_input_norms for select to authenticated using (true);
create policy ref_read_advice     on advice_rules     for select to authenticated using (true);
create policy ref_read_settings   on app_settings     for select to authenticated using (true);

-- Owned: farm ownership traced through the foreign keys.
create policy farms_own on farms for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy seasons_own on seasons for all to authenticated
  using (exists (select 1 from farms f where f.id = seasons.farm_id and f.user_id = auth.uid()))
  with check (exists (select 1 from farms f where f.id = seasons.farm_id and f.user_id = auth.uid()));

create policy season_costs_own on season_costs for all to authenticated
  using (exists (
    select 1 from seasons s join farms f on f.id = s.farm_id
    where s.id = season_costs.season_id and f.user_id = auth.uid()))
  with check (exists (
    select 1 from seasons s join farms f on f.id = s.farm_id
    where s.id = season_costs.season_id and f.user_id = auth.uid()));

create policy estimates_own on estimates for all to authenticated
  using (exists (
    select 1 from seasons s join farms f on f.id = s.farm_id
    where s.id = estimates.season_id and f.user_id = auth.uid()))
  with check (exists (
    select 1 from seasons s join farms f on f.id = s.farm_id
    where s.id = estimates.season_id and f.user_id = auth.uid()));

create policy estimate_lines_own on estimate_lines for all to authenticated
  using (exists (
    select 1 from estimates e join seasons s on s.id = e.season_id
    join farms f on f.id = s.farm_id
    where e.id = estimate_lines.estimate_id and f.user_id = auth.uid()))
  with check (exists (
    select 1 from estimates e join seasons s on s.id = e.season_id
    join farms f on f.id = s.farm_id
    where e.id = estimate_lines.estimate_id and f.user_id = auth.uid()));


-- ============================================================
-- SECTION 5 — SEED DATA
-- ============================================================

-- ---------- 5.1 crops (MoFA F&F 2018, Table 4.6) ----------
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
  ('Pepper',      'Mako',     8.88, 30.00);


-- ---------- 5.2 cost_benchmarks (MoFA F&F 2018, Tables 7.3 & 7.5) ----------
-- 2018 prices in pesewas. Adjusted at query time by price_multiplier.
insert into cost_benchmarks (input_name, category, unit, year, price_pesewas, basis, source) values
  ('NPK 15-15-15',        'fertiliser', '50kg',  2018, 10250, 'open_market', 'MoFA F&F 2018 T7.3'),
  ('Sulphate of Ammonia', 'fertiliser', '50kg',  2018,  9175, 'open_market', 'MoFA F&F 2018 T7.3'),
  ('Urea',                'fertiliser', '50kg',  2018,  9506, 'open_market', 'MoFA F&F 2018 T7.3'),
  ('Round Up',            'agrochem',   'litre', 2018,  1649, 'open_market', 'MoFA F&F 2018 T7.3'),
  ('Karate',              'agrochem',   'litre', 2018,  2114, 'open_market', 'MoFA F&F 2018 T7.3'),
  ('Actellic',            'agrochem',   'litre', 2018,  3120, 'open_market', 'MoFA F&F 2018 T7.3'),
  ('Hoe',                 'other',      'single',2018,  1284, 'open_market', 'MoFA F&F 2018 T7.3'),
  ('Cutlass',             'other',      'single',2018,  1761, 'open_market', 'MoFA F&F 2018 T7.3'),
  ('Jute Sack',           'storage',    'single',2018,   433, 'open_market', 'MoFA F&F 2018 T7.3');

-- Subsidised fertiliser (MoFA F&F 2018, Table 7.5 — govt pays 50%).
-- The gap between these and the rows above is your single most
-- valuable recommendation.
insert into cost_benchmarks (input_name, category, unit, year, price_pesewas, basis, source) values
  ('NPK 15-15-15',        'fertiliser', '50kg', 2018, 6800, 'subsidised', 'MoFA F&F 2018 T7.5'),
  ('NPK 23-10-05',        'fertiliser', '50kg', 2018, 6800, 'subsidised', 'MoFA F&F 2018 T7.5'),
  ('Urea',                'fertiliser', '50kg', 2018, 6300, 'subsidised', 'MoFA F&F 2018 T7.5');

-- ⚠️ PLACEHOLDERS — MoFA F&F does NOT publish these. You must replace
-- the prices with figures from farmer interviews around Kotei/Ejisu
-- before the demo, and update the source column when you do.
insert into cost_benchmarks (input_name, category, unit, year, price_pesewas, basis, source) values
  ('Tractor ploughing',   'land_prep', 'acre',       2018, 12000, 'open_market', 'PLACEHOLDER — field survey required'),
  ('Manual land clearing','land_prep', 'person_day', 2018,  2000, 'open_market', 'PLACEHOLDER — field survey required'),
  ('Farm labour',         'labour',    'person_day', 2018,  2000, 'open_market', 'PLACEHOLDER — field survey required'),
  ('Maize seed (OPV)',    'seeds',     'kg',         2018,   600, 'open_market', 'PLACEHOLDER — field survey required'),
  ('Transport to market', 'transport', 'bag_100kg',  2018,   500, 'open_market', 'PLACEHOLDER — field survey required');


-- ---------- 5.3 crop_input_norms (maize only, as the demo crop) ----------
-- ⚠️ Application rates below are indicative. Verify against CSIR-CRI
-- Fumesua extension recommendations before you present.
insert into crop_input_norms (crop_id, benchmark_id, category, quantity_per_acre, window, source)
select c.id, b.id, b.category, n.qty, null, 'INDICATIVE — verify with CSIR-CRI'
from (values
  ('NPK 15-15-15',        2.0),   -- 2 bags per acre
  ('Urea',                1.0),   -- 1 bag topdressing
  ('Maize seed (OPV)',    10.0),  -- 10 kg per acre
  ('Round Up',            2.0),   -- 2 litres
  ('Tractor ploughing',   1.0),   -- 1 acre
  ('Farm labour',         12.0),  -- 12 person-days across the season
  ('Jute Sack',           9.0)    -- ~9 bags harvested per acre
) as n(input_name, qty)
join cost_benchmarks b
  on b.input_name = n.input_name and b.basis = 'open_market' and b.year = 2018
join crops c on c.name = 'Maize';


-- ---------- 5.4 advice_rules ----------
insert into advice_rules (category, message) values
  ('fertiliser', 'Your fertiliser spend is above the expected level. Government subsidy cuts NPK and Urea by about half — check with your district MoFA office for the subsidy window before you buy at market price.'),
  ('seeds',      'Your seed spend is high. Certified open-pollinated seed can be saved for one further season, and buying from a registered dealer avoids paying market rates for uncertified grain.'),
  ('agrochem',   'Your agrochemical spend is above the expected level. Spraying to a schedule rather than on need is the usual cause. Spray on inspection, and check your dilution rate — over-concentration wastes product without improving control.'),
  ('land_prep',  'Your land preparation cost is high. Sharing a tractor booking with neighbouring farms lowers the per-acre rate, and minimum tillage cuts ploughing passes on land already under cultivation.'),
  ('labour',     'Your labour cost is above the expected level. Weeding is usually the largest share. Timely first weeding reduces total weeding rounds, and nnoboa (labour exchange) reduces cash outlay.'),
  ('transport',  'Your transport cost is high. Aggregating your load with nearby farmers, or selling at the farmgate when the price gap is smaller than the haulage cost, will reduce this.'),
  ('storage',    'Your storage cost is high. Check whether sacks are being replaced rather than reused, and whether losses in store are pushing you to buy more than you need.'),
  ('other',      'Review this category. Costs recorded here are not compared against a benchmark, so move recurring items into a specific category to get useful feedback.');


-- ============================================================
-- SECTION 6 — THE ESTIMATE ENGINE
-- One function. Returns the new estimate id.
--
-- Logic:
--   1. If the farm has prior completed seasons of this crop, use the
--      farmer's own average per-acre cost per category.  method='history'
--   2. If not, derive per-acre cost from crop_input_norms x
--      cost_benchmarks x price_multiplier.  method='benchmark'
--   3. Either way, compare against the benchmark and flag any category
--      more than flag_threshold_pct above it.
-- ============================================================

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
  history as (
    select
      sc.category,
      sum(sc.amount_pesewas)::numeric / nullif(sum(distinct s.area_planted_acres), 0) as per_acre
    from seasons s
    join season_costs sc on sc.season_id = s.id
    where s.farm_id = v_season.farm_id
      and s.crop_id = v_season.crop_id
      and s.id <> p_season_id
      and s.is_complete
    group by sc.category
  ),
  -- The expected per-acre cost from norms x prices.
  benchmark as (
    select
      n.category,
      sum(n.quantity_per_acre * b.price_pesewas * v_settings.price_multiplier) as per_acre
    from crop_input_norms n
    join cost_benchmarks b on b.id = n.benchmark_id
    where n.crop_id = v_season.crop_id
      and (n.window is null or n.window = v_season.window)
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
    round(coalesce(
      case when v_method = 'history' then m.hist_per_acre else m.bench_per_acre end,
      m.bench_per_acre, m.hist_per_acre, 0
    ) * v_season.area_planted_acres)::bigint as estimated_pesewas,
    round(coalesce(m.bench_per_acre, 0) * v_season.area_planted_acres)::bigint as benchmark_pesewas
  from merged m;

  select coalesce(sum(estimated_pesewas), 0) into v_total from _calc;

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
    c.estimated_pesewas,
    nullif(c.benchmark_pesewas, 0),
    case when c.benchmark_pesewas > 0
      then round(((c.estimated_pesewas - c.benchmark_pesewas)::numeric
                  / c.benchmark_pesewas) * 100, 2)
    end,
    case when c.benchmark_pesewas > 0
      then ((c.estimated_pesewas - c.benchmark_pesewas)::numeric
            / c.benchmark_pesewas) * 100 > v_settings.flag_threshold_pct
      else false end,
    case when c.benchmark_pesewas > 0
      and ((c.estimated_pesewas - c.benchmark_pesewas)::numeric
           / c.benchmark_pesewas) * 100 > v_settings.flag_threshold_pct
      then (select ar.message from advice_rules ar where ar.category = c.category)
    end,
    case when c.estimated_pesewas > c.benchmark_pesewas
      then c.estimated_pesewas - c.benchmark_pesewas else 0 end
  from _calc c;

  drop table if exists _calc;

  return v_estimate_id;
end;
$$;


-- ============================================================
-- SECTION 7 — RESULTS VIEW
-- The whole results screen is one select against this.
-- ============================================================

create or replace view v_estimate_report as
select
  e.id                as estimate_id,
  e.season_id,
  s.farm_id,
  f.name              as farm_name,
  cr.name             as crop_name,
  s.year,
  s.window,
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


-- ============================================================
-- END
--
-- Before the demo you MUST:
--   1. Replace every 'PLACEHOLDER' row in cost_benchmarks with real
--      prices from farmer interviews.
--   2. Verify the crop_input_norms quantities against CSIR-CRI.
--   3. Set app_settings.price_multiplier from current market prices.
-- ============================================================
