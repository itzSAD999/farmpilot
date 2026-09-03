-- ============================================================
-- FarmPilot — Demo Account Seed
--
-- Creates (or resets) a single, fully-populated demo account for
-- presentations and for the mini-project report screenshots. Safe to
-- re-run: it deletes any existing account with the same email first
-- (cascades to farms/seasons/costs/estimates via FK) and rebuilds it
-- from scratch, so the demo is always in a known, clean state.
--
-- LOGIN — DEMO ACCOUNT
--   Email:    kwame.mensah@farmpilot.demo
--   Password: FarmPilotDemo2026!
--
-- This is "Kwame", the primary persona already described in
-- FarmPilot_PRD.md §4.1 (42, Ejisu district, Ashanti Region, 2.5
-- acres, maize in major season). The seeded data is written to show
-- off the app's actual strengths, not just to be present:
--
--   • Farm: 2.5 acres, Ejisu, Ashanti — matches the PRD persona.
--   • A COMPLETED 2025 major-season Maize season with full costs
--     recorded, so the 2026 season's estimate uses method='history'
--     (not just the cold-start benchmark) — demonstrates FR-6.3.
--   • A live 2026 major-season Maize season with:
--       - Fertiliser recorded well ABOVE benchmark (bought at open
--         market instead of the subsidy window) → flagged, with a
--         real possible-saving figure and specific advice.
--       - Labour recorded UNDER benchmark (used nnoboa exchange) →
--         shown as "Recorded" but correctly NOT flagged.
--       - Seeds recorded near benchmark.
--       - Land prep, agrochem and storage left UNRECORDED → shown as
--         "Predicted" (history-based, since a completed season now
--         exists), demonstrating the Recorded-vs-Predicted split.
--   • A second crop (Cassava, minor season) with its own recorded
--     costs — populates Crop-vs-Crop and Season-vs-Season comparisons.
--     Cassava now has real seeded norms too (migration 013), so this
--     also gets a genuine benchmark comparison rather than the
--     essentials-checklist fallback (FR-9.11) — that fallback is now
--     exercised only by a crop with no seeded norms at all.
--   • Costs entered through BOTH paths (flat total AND quantity ×
--     rate) and some tagged "Weekly catch-up", matching what the
--     Weekly Check-in feature itself would write.
--   • Generated estimates for both active seasons, so the dashboard,
--     report, and every Compare tab have real data the moment you
--     log in — nothing needs to be clicked through first.
--   • All five budgeting tiers populated with real, meaningfully mixed
--     numbers against the spend above (migrations 015, 022, 023, 024) —
--     a Farm Budget sitting at 84% used, a farm-wide Fertiliser category
--     budget already OVER (echoing the same fertiliser-overspend story
--     told throughout the rest of the demo), a Maize crop budget
--     cutting it close at 99%, a Cassava crop budget already OVER, and
--     granular crop x category budgets ("Maize Labour", "Maize Seeds",
--     ...) mixing fine/close/over states of their own — so the /budgets
--     page shows every visual state (fine, close, over, and "not set
--     yet") on first login, not just empty forms.
--
-- Run with:
--   npx supabase db query --linked -f supabase/demo_seed.sql
-- ============================================================

do $$
declare
  v_user_id           uuid;
  v_farm_id            bigint;
  v_maize_id           bigint;
  v_cassava_id         bigint;
  v_season_2025_id     bigint;
  v_season_2026_id     bigint;
  v_season_cassava_id  bigint;
  v_estimate_2026_id   bigint;
  v_estimate_cassava_id bigint;
  v_demo_email         text := 'kwame.mensah@farmpilot.demo';
  v_demo_password      text := 'FarmPilotDemo2026!';
begin
  -- 1. Clean up any previous run of this seed.
  delete from auth.users where email = v_demo_email;

  -- 2. Create the auth user directly (bypasses email confirmation —
  -- this account is ready to sign in immediately). The
  -- on_auth_user_created trigger fires exactly as it would on a real
  -- sign-up and creates the matching profiles row from raw_user_meta_data.
  v_user_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_demo_email,
    extensions.crypt(v_demo_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object(
      'real_email', v_demo_email,
      'full_name', 'Kwame Mensah',
      'auth_method', 'email'
    ),
    now(), now(),
    '', '', '', '',
    false, false
  );

  -- 3. Farm — matches the PRD persona exactly (§4.1).
  insert into farms (user_id, name, region, district, total_area_acres, check_in_day)
  values (v_user_id, 'Mensah Family Farm', 'Ashanti', 'Ejisu', 2.5, 'Monday')
  returning id into v_farm_id;

  select id into v_maize_id from crops where name = 'Maize';
  select id into v_cassava_id from crops where name = 'Cassava';

  -- ============================================================
  -- 4. COMPLETED prior season (2025, major) — becomes real history.
  -- Fertiliser bought at the subsidy price this year: good compliance.
  -- ============================================================
  insert into seasons (farm_id, crop_id, year, season_window, area_planted_acres, is_complete, harvest_qty, harvest_unit, revenue_pesewas)
  values (v_farm_id, v_maize_id, 2025, 'major', 2.5, true, 55, 'bag_100kg', 2200000)
  returning id into v_season_2025_id;

  insert into season_costs (season_id, category, description, amount_pesewas, date_incurred) values
    (v_season_2025_id, 'seeds',       'Maize seed (OPV), certified',        65000,  '2025-03-10'),
    (v_season_2025_id, 'fertiliser',  'NPK + Urea, subsidised window',      320000, '2025-04-02'),
    (v_season_2025_id, 'agrochem',    'Round Up, pre-planting',             36000,  '2025-03-15'),
    (v_season_2025_id, 'land_prep',   'Tractor ploughing, 2.5 acres',       110000, '2025-02-28'),
    (v_season_2025_id, 'labour',      'Planting, weeding and harvest labour', 260000, '2025-05-20'),
    (v_season_2025_id, 'storage',     'Jute sacks',                         42000,  '2025-07-10');

  -- ============================================================
  -- 5. ACTIVE season (2026, major) — the one the demo should open on.
  -- Deliberately mixed: one clear overspend, one clear good result,
  -- one near-benchmark, and three left unrecorded (shown as
  -- Predicted, from history now that 2025 is complete).
  -- ============================================================
  insert into seasons (farm_id, crop_id, year, season_window, area_planted_acres, is_complete)
  values (v_farm_id, v_maize_id, 2026, 'major', 2.5, false)
  returning id into v_season_2026_id;

  insert into season_costs (season_id, category, description, quantity, unit, unit_cost_pesewas, amount_pesewas, date_incurred) values
    (v_season_2026_id, 'seeds', 'Maize seed (OPV)', 25, 'kg', 2700, 67500, '2026-03-08'),
    (v_season_2026_id, 'fertiliser', 'NPK + Urea, bought at open market — missed the subsidy window', null, null, null, 480000, '2026-04-06'),
    (v_season_2026_id, 'labour', 'Weekly catch-up', null, null, null, 105000, '2026-04-20'),
    (v_season_2026_id, 'labour', 'Weekly catch-up', null, null, null, 95000, '2026-04-27');

  select generate_estimate(v_season_2026_id) into v_estimate_2026_id;

  -- ============================================================
  -- 6. Second crop, no benchmark norms seeded — shows the
  -- essentials-checklist fallback and feeds Crop-vs-Crop / Season-vs-
  -- Season comparisons with a genuinely different crop.
  -- ============================================================
  insert into seasons (farm_id, crop_id, year, season_window, area_planted_acres, is_complete)
  values (v_farm_id, v_cassava_id, 2026, 'minor', 1.0, false)
  returning id into v_season_cassava_id;

  insert into season_costs (season_id, category, description, amount_pesewas, date_incurred) values
    (v_season_cassava_id, 'land_prep', 'Manual clearing and mounding', 60000, '2026-09-05'),
    (v_season_cassava_id, 'labour',    'Planting labour',              45000, '2026-09-12');

  select generate_estimate(v_season_cassava_id) into v_estimate_cassava_id;

  -- ============================================================
  -- 7. Budgeting — all four tiers, deliberately mixed states.
  -- Farm-wide recorded spend across every season above is GHS 16,855.00
  -- (seeds 1,325 + fertiliser 8,000 + agrochem 360 + land_prep 1,700 +
  -- labour 5,050 + storage 420); Maize alone is GHS 15,805.00; Cassava
  -- alone is GHS 1,050.00 — the limits below are chosen against those
  -- real totals, not round numbers picked in isolation.
  -- ============================================================

  -- Farm Budget (023) — one overall ceiling, sitting at 84% used.
  insert into farm_budgets (farm_id, limit_pesewas) values (v_farm_id, 2000000);

  -- Budget by Category (023) — farm-wide, not tied to one season.
  -- Fertiliser is deliberately already OVER, echoing the same
  -- open-market-vs-subsidy overspend story the estimate report itself
  -- tells for this account. Agrochem, storage, transport and other are
  -- left unassigned on purpose, to show that state too.
  insert into farm_category_budgets (farm_id, category, limit_pesewas) values
    (v_farm_id, 'fertiliser', 600000),
    (v_farm_id, 'labour',     600000),
    (v_farm_id, 'seeds',      150000),
    (v_farm_id, 'land_prep',  200000);

  -- Crop Budgets (022) — one total cap per crop, across every season.
  -- Maize is cutting it close (99%); Cassava is already OVER.
  insert into crop_budgets (farm_id, crop_id, limit_pesewas) values
    (v_farm_id, v_maize_id,   1600000),
    (v_farm_id, v_cassava_id, 80000);

  -- Crop Category Budgets (024) — the most granular tier, e.g. "for
  -- Maize: Labour GHS 4,000, Seeds GHS 1,500" — how a farmer actually
  -- plans a crop. Maize fertiliser and labour are deliberately OVER
  -- (the same open-market/no-subsidy story as everywhere else in this
  -- demo); Maize seeds and both Cassava lines show the fine/over mix
  -- too, so this tier's UI isn't only ever demoed empty.
  insert into crop_category_budgets (farm_id, crop_id, category, limit_pesewas) values
    (v_farm_id, v_maize_id,   'labour',     400000),
    (v_farm_id, v_maize_id,   'seeds',      150000),
    (v_farm_id, v_maize_id,   'fertiliser', 700000),
    (v_farm_id, v_cassava_id, 'labour',     50000),
    (v_farm_id, v_cassava_id, 'land_prep',  50000);

  -- Category Budgets (015) — per season+category, on the active 2026
  -- Maize season specifically. Fertiliser is already OVER (matches the
  -- flagged benchmark overspend on this exact season); labour is
  -- comfortably under, since it was recorded via nnoboa exchange below
  -- benchmark.
  insert into category_budgets (season_id, category, limit_pesewas) values
    (v_season_2026_id, 'fertiliser', 400000),
    (v_season_2026_id, 'labour',     250000);

  raise notice 'Demo account ready — email: %, password: %, farm_id: %, active maize season: %, cassava season: %',
    v_demo_email, v_demo_password, v_farm_id, v_season_2026_id, v_season_cassava_id;
end $$;
