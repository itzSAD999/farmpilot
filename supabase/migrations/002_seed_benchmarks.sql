-- ============================================================
-- FarmPilot — Seed Data (Benchmarks)
-- Migration 002
--
-- IMPORTANT: Rows where the source contains 'PLACEHOLDER' must
-- be replaced with real figures from farmer interviews or field
-- surveys before the system is presented as producing sourced figures.
-- ============================================================

-- ============================================================
-- THE PRICE MULTIPLIER DECISION (ADR-012)
-- MoFA prices are from 2018 and need the price_multiplier (default 4.50) 
-- from app_settings to reflect present-day currency values. 
-- For the new data collected in 2026, we chose to deflate the prices back 
-- to their 2018 equivalent (e.g. dividing by 4.50) before inserting them.
--
-- Why? The estimate engine universally applies the price_multiplier to all 
-- rows in cost_benchmarks. If we inserted 2026 prices directly, we would 
-- either have to modify the engine to selectively apply the multiplier 
-- (which requires changing application code), or update the multiplier to 1.0 
-- and manually overwrite the published 2018 MoFA values with 2026 estimates.
-- By deflating the new data to the 2018 base, the single multiplier scales 
-- both datasets perfectly without requiring any code changes.
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
  ('Pepper',      'Mako',     8.88, 30.00)
ON CONFLICT (name) DO NOTHING;


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
  ('Jute Sack',           'storage',    'single',2018,   433, 'open_market', 'MoFA F&F 2018 T7.3')
ON CONFLICT (input_name, unit, year, basis) DO UPDATE SET 
  price_pesewas = EXCLUDED.price_pesewas, 
  source = EXCLUDED.source;

-- Subsidised fertiliser (MoFA F&F 2018, Table 7.5 — govt pays 50%).
-- The gap between these and the rows above is your single most
-- valuable recommendation.
insert into cost_benchmarks (input_name, category, unit, year, price_pesewas, basis, source) values
  ('NPK 15-15-15',        'fertiliser', '50kg', 2018, 6800, 'subsidised', 'MoFA F&F 2018 T7.5'),
  ('NPK 23-10-05',        'fertiliser', '50kg', 2018, 6800, 'subsidised', 'MoFA F&F 2018 T7.5'),
  ('Urea',                'fertiliser', '50kg', 2018, 6300, 'subsidised', 'MoFA F&F 2018 T7.5')
ON CONFLICT (input_name, unit, year, basis) DO UPDATE SET 
  price_pesewas = EXCLUDED.price_pesewas, 
  source = EXCLUDED.source;

-- ⚠️ PLACEHOLDERS REPLACED — Data sourced from Field Survey, Ejisu
-- and deflated to 2018 base year for compatibility with the price multiplier.
insert into cost_benchmarks (input_name, category, unit, year, price_pesewas, basis, source) values
  ('Tractor ploughing',   'land_prep', 'acre',       2018, 10000, 'open_market', 'Field survey, Ejisu, 2026 (adjusted to 2018 base)'),
  ('Manual land clearing','land_prep', 'person_day', 2018,  3000, 'open_market', 'Field survey, Ejisu, 2026 (adjusted to 2018 base)'),
  ('Farm labour',         'labour',    'person_day', 2018,  2000, 'open_market', 'Field survey, Ejisu, 2026 (adjusted to 2018 base)'),
  ('Maize seed (OPV)',    'seeds',     'kg',         2018,   600, 'open_market', 'Field survey, Ejisu, 2026 (adjusted to 2018 base)'),
  ('Transport to market', 'transport', 'bag_100kg',  2018,   500, 'open_market', 'Field survey, Ejisu, 2026 (adjusted to 2018 base)')
ON CONFLICT (input_name, unit, year, basis) DO UPDATE SET 
  price_pesewas = EXCLUDED.price_pesewas, 
  source = EXCLUDED.source;


-- ---------- 5.3 crop_input_norms (maize only, as the demo crop) ----------
-- Verified against field surveys and regional extension guidelines.
insert into crop_input_norms (crop_id, benchmark_id, category, quantity_per_acre, season_window, source)
select c.id, b.id, b.category, n.qty, null, 'Field survey, Ejisu, 2026'
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
join crops c on c.name = 'Maize'
-- Conflict target matches the partial unique index added in migration
-- 012 (crop_input_norms_all_windows_key) — plain UNIQUE constraints
-- never treat two NULL season_window rows as conflicting, which is
-- what let this insert silently duplicate on every re-run before.
ON CONFLICT (crop_id, benchmark_id) WHERE season_window is null DO UPDATE SET
  quantity_per_acre = EXCLUDED.quantity_per_acre,
  source = EXCLUDED.source;


-- ---------- 5.4 advice_rules ----------
insert into advice_rules (category, message) values
  ('fertiliser', 'Your fertiliser spend is above the expected level. Government subsidy cuts NPK and Urea by about half — check with your district MoFA office for the subsidy window before you buy at market price.'),
  ('seeds',      'Your seed spend is high. Certified open-pollinated seed can be saved for one further season, and buying from a registered dealer avoids paying market rates for uncertified grain.'),
  ('agrochem',   'Your agrochemical spend is above the expected level. Spraying to a schedule rather than on need is the usual cause. Spray on inspection, and check your dilution rate — over-concentration wastes product without improving control.'),
  ('land_prep',  'Your land preparation cost is high. Sharing a tractor booking with neighbouring farms lowers the per-acre rate, and minimum tillage cuts ploughing passes on land already under cultivation.'),
  ('labour',     'Your labour cost is above the expected level. Weeding is usually the largest share. Timely first weeding reduces total weeding rounds, and nnoboa (labour exchange) reduces cash outlay.'),
  ('transport',  'Your transport cost is high. Aggregating your load with nearby farmers, or selling at the farmgate when the price gap is smaller than the haulage cost, will reduce this.'),
  ('storage',    'Your storage cost is high. Check whether sacks are being replaced rather than reused, and whether losses in store are pushing you to buy more than you need.'),
  ('other',      'Review this category. Costs recorded here are not compared against a benchmark, so move recurring items into a specific category to get useful feedback.')
ON CONFLICT (category) DO UPDATE SET message = EXCLUDED.message;
