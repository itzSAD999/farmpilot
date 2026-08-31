-- ============================================================
-- FarmPilot — Migration 003
-- Adds: phone-based identity, farm-level rollup view,
--       offline sync support.
-- Run AFTER 001_schema.sql and 002_seed_benchmarks.sql
-- ============================================================


-- ============================================================
-- SECTION 1 — PROFILES (phone identity)
--
-- WHY THIS EXISTS
-- Supabase phone auth sends an OTP, which requires a paid SMS
-- provider (Twilio, MessageBird). That cost is out of scope for
-- this project.
--
-- Instead the farmer signs up with PHONE + PASSWORD. The client
-- converts the phone number into a synthetic email
-- (0501234567@farmpilot.local) and calls the normal email
-- sign-up. The farmer never sees an email field.
--
-- The real phone number is stored here so that:
--   a) it can be displayed back to the farmer
--   b) SMS/OTP can be switched on later with no data migration
--   c) an email address can be linked to the same account
-- ============================================================

create table profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  phone             text unique,          -- normalised: 0XXXXXXXXX (10 digits)
  email             text unique,          -- real email, if the farmer links one
  full_name         text,
  preferred_language text not null default 'en'
                     check (preferred_language in ('en','tw','ee','gaa','dag')),
  auth_method       text not null default 'phone'
                     check (auth_method in ('phone','email')),
  created_at        timestamptz not null default now()
);

-- Ghana mobile numbers are 10 digits starting with 0.
-- Validation also happens client-side; this is the authority.
alter table profiles add constraint profiles_phone_format
  check (phone is null or phone ~ '^0[235][0-9]{8}$');

comment on column profiles.phone is
  'Normalised Ghana mobile number, 10 digits starting 0. '
  'Stored separately from auth.users because sign-up uses a '
  'synthetic email derived from this value.';

create index profiles_phone_idx on profiles(phone);


-- Auto-create a profile row whenever a user registers, so the
-- client never has to make two calls that could half-fail.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, phone, email, auth_method)
  values (
    new.id,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'real_email',
    coalesce(new.raw_user_meta_data->>'auth_method', 'phone')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ============================================================
-- SECTION 2 — SYNC SUPPORT (offline)
--
-- WHY THIS EXISTS
-- The client queues writes in IndexedDB while offline and
-- flushes them on reconnect. Two problems follow:
--
--   1. A queued write may be sent twice (flush interrupted,
--      user refreshes, retry fires). client_id makes the insert
--      idempotent — the second attempt hits a unique violation
--      and is safely ignored.
--
--   2. The client needs to know what changed server-side since
--      it last synced. updated_at gives it a cursor.
-- ============================================================

alter table season_costs add column client_id uuid;
alter table season_costs add column updated_at timestamptz not null default now();
create unique index season_costs_client_id_idx
  on season_costs(client_id) where client_id is not null;

alter table seasons add column client_id uuid;
alter table seasons add column updated_at timestamptz not null default now();
create unique index seasons_client_id_idx
  on seasons(client_id) where client_id is not null;

comment on column season_costs.client_id is
  'UUID generated on the device before the row is sent. Makes '
  'offline flush idempotent — a replayed write collides on the '
  'unique index instead of creating a duplicate.';


-- Keep updated_at honest without the client having to set it.
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger season_costs_touch before update on season_costs
  for each row execute function touch_updated_at();
create trigger seasons_touch before update on seasons
  for each row execute function touch_updated_at();


-- ============================================================
-- SECTION 3 — FARM-LEVEL ROLLUP
--
-- WHY THIS EXISTS
-- An estimate is per SEASON, and a season is one crop in one
-- window of one year. That is correct — maize and cassava have
-- completely different input requirements, so they cannot share
-- an estimate.
--
-- But the farmer asks "what does my FARM cost to run?", which
-- means summing across every crop he is growing. This view does
-- that rollup so the dashboard is one query.
-- ============================================================

create or replace view v_farm_summary as
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
-- Only the most recent estimate per season counts toward the rollup;
-- re-running an estimate must not double the farm total.
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


-- Per-crop rollup: "what does each crop cost me to run?"
create or replace view v_crop_summary as
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
-- SECTION 4 — RLS FOR NEW OBJECTS
-- ============================================================

alter table profiles enable row level security;

create policy profiles_own on profiles for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Views inherit RLS from their base tables in Postgres 15 when
-- created by a non-superuser. The user_id column is exposed so
-- the client can filter explicitly as a second line of defence.


-- ============================================================
-- SECTION 5 — LOCALISATION SUPPORT
--
-- Advice messages are translated ahead of time and cached here
-- rather than calling the Khaya API on every page load. The API
-- is called once, when a message is first needed in a language,
-- and the result stored.
-- ============================================================

create table advice_translations (
  id            bigserial primary key,
  advice_id     bigint not null references advice_rules(id) on delete cascade,
  language      text not null check (language in ('tw','ee','gaa','dag')),
  message       text not null,
  source        text not null default 'khaya_api',
  reviewed      boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (advice_id, language)
);

alter table advice_translations enable row level security;
create policy advice_tr_read on advice_translations
  for select to authenticated using (true);

comment on table advice_translations is
  'Machine translations are unreviewed by default. Agricultural '
  'terms translate badly; the reviewed flag marks messages a '
  'native speaker has checked.';


-- ============================================================
-- END OF MIGRATION 003
-- ============================================================
