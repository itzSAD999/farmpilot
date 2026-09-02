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
DO $$ BEGIN
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
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Ghana's middle belt is bimodal. 'dry' covers irrigated off-season.
DO $$ BEGIN
  create type season_window as enum ('major', 'minor', 'dry');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  create type price_basis as enum ('subsidised', 'open_market');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  create type estimate_method as enum ('benchmark', 'blended', 'history');
EXCEPTION WHEN duplicate_object THEN null; END $$;


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
  season_window       season_window,           
  source              text not null,
  unique (crop_id, benchmark_id, season_window)
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
  season_window       season_window not null,
  area_planted_acres  numeric(8,2) not null check (area_planted_acres > 0),
  harvest_qty         numeric(12,2),
  harvest_unit        text,                    -- 'bag_100kg', 'bag_50kg', 'mt'
  revenue_pesewas     bigint check (revenue_pesewas >= 0),
  is_complete         boolean not null default false,
  created_at          timestamptz not null default now(),
  -- A farmer can grow the same crop in major and minor season of the
  -- same year, but not twice in the same season_window.
  unique (farm_id, crop_id, year, season_window)
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


-- ============================================================
-- END
--
-- Before the demo you MUST:
--   1. Replace every 'PLACEHOLDER' row in cost_benchmarks with real
--      prices from farmer interviews.
--   2. Verify the crop_input_norms quantities against CSIR-CRI.
--   3. Set app_settings.price_multiplier from current market prices.
-- ============================================================
