-- ============================================================
-- FarmPilot — Migration 013
-- Extends crop_input_norms beyond Maize, which was previously the
-- only crop with any seeded benchmark data (§8.2 of the PRD lists
-- this as a known gap — "to collect").
--
-- Coverage: the four essential categories per crop (seeds, fertiliser,
-- land_prep, labour) — the same fallback set the app already uses
-- client-side (ESSENTIAL_CATEGORIES) when a crop has no norms. This
-- gives every seeded crop a real cold-start benchmark instead of
-- falling back to the generic checklist, without requiring a new
-- cost_benchmarks row for every category on every crop.
--
-- Source: quantities are INDICATIVE smallholder application rates —
-- the same status the existing Maize norms carry (source =
-- "INDICATIVE — verify with CSIR-CRI"). They are a reasonable planning
-- starting point, not verified field data, and must be checked against
-- CSIR-CRI extension recommendations or real farm records before being
-- presented as sourced fact — exactly the same caveat already
-- documented for Maize.
--
-- Seed/planting-material prices are new, crop-specific cost_benchmarks
-- rows (year 2018, open_market — consistent with the rest of the
-- table, so the existing price_multiplier scales them the same way).
-- Fertiliser, land preparation, and labour reuse the existing NPK,
-- Urea, Tractor ploughing, and Farm labour benchmark rows.
-- ============================================================

-- ---------- New crop-specific seed/planting-material benchmarks ----------
insert into cost_benchmarks (input_name, category, unit, year, price_pesewas, basis, source) values
  ('Rice seed (certified)',    'seeds', 'kg',      2018,   700, 'open_market', 'INDICATIVE — verify with CSIR-CRI'),
  ('Cassava stem cuttings',    'seeds', 'bundle',  2018,  5000, 'open_market', 'INDICATIVE — verify with CSIR-CRI'),
  ('Yam setts',                'seeds', 'sett',    2018,   300, 'open_market', 'INDICATIVE — verify with CSIR-CRI'),
  ('Plantain suckers',         'seeds', 'sucker',  2018,   500, 'open_market', 'INDICATIVE — verify with CSIR-CRI'),
  ('Cowpea seed',              'seeds', 'kg',      2018,   900, 'open_market', 'INDICATIVE — verify with CSIR-CRI'),
  ('Groundnut seed (unshelled)','seeds','kg',      2018,   850, 'open_market', 'INDICATIVE — verify with CSIR-CRI'),
  ('Soya bean seed',           'seeds', 'kg',      2018,   950, 'open_market', 'INDICATIVE — verify with CSIR-CRI'),
  ('Tomato seedlings',         'seeds', 'seedling',2018,    20, 'open_market', 'INDICATIVE — verify with CSIR-CRI'),
  ('Pepper seedlings',         'seeds', 'seedling',2018,    20, 'open_market', 'INDICATIVE — verify with CSIR-CRI')
ON CONFLICT (input_name, unit, year, basis) DO UPDATE SET
  price_pesewas = EXCLUDED.price_pesewas,
  source = EXCLUDED.source;

-- ---------- Norms per crop: seeds, fertiliser, land_prep, labour ----------
-- quantity_per_acre reads against the benchmark's own unit (see table above).
insert into crop_input_norms (crop_id, benchmark_id, category, quantity_per_acre, season_window, source)
select c.id, b.id, b.category, n.qty, null, 'INDICATIVE — verify with CSIR-CRI'
from (values
  -- Rice (Paddy) — labour-intensive (transplanting, bird-scaring, weeding)
  ('Rice (Paddy)', 'Rice seed (certified)', 25.0),
  ('Rice (Paddy)', 'NPK 15-15-15',           3.0),
  ('Rice (Paddy)', 'Urea',                   2.0),
  ('Rice (Paddy)', 'Tractor ploughing',      1.0),
  ('Rice (Paddy)', 'Farm labour',           20.0),

  -- Cassava — low input, low labour relative to yield
  ('Cassava', 'Cassava stem cuttings',       3.0),
  ('Cassava', 'NPK 15-15-15',                1.0),
  ('Cassava', 'Tractor ploughing',           1.0),
  ('Cassava', 'Farm labour',                15.0),

  -- Yam — dense, expensive setts; heavy mounding and staking labour
  ('Yam', 'Yam setts',                    3000.0),
  ('Yam', 'NPK 15-15-15',                    1.0),
  ('Yam', 'Tractor ploughing',               1.0),
  ('Yam', 'Farm labour',                    25.0),

  -- Plantain — perennial; suckers and establishment labour dominate
  ('Plantain', 'Plantain suckers',         300.0),
  ('Plantain', 'NPK 15-15-15',               1.0),
  ('Plantain', 'Tractor ploughing',          1.0),
  ('Plantain', 'Farm labour',               10.0),

  -- Cowpea — legume, low fertiliser need (nitrogen-fixing)
  ('Cowpea', 'Cowpea seed',                 15.0),
  ('Cowpea', 'NPK 15-15-15',                 0.5),
  ('Cowpea', 'Tractor ploughing',            1.0),
  ('Cowpea', 'Farm labour',                  8.0),

  -- Groundnut — legume, low fertiliser need
  ('Groundnut', 'Groundnut seed (unshelled)', 40.0),
  ('Groundnut', 'NPK 15-15-15',               0.5),
  ('Groundnut', 'Tractor ploughing',          1.0),
  ('Groundnut', 'Farm labour',               12.0),

  -- Soya bean — legume, low fertiliser need
  ('Soya bean', 'Soya bean seed',           25.0),
  ('Soya bean', 'NPK 15-15-15',              0.5),
  ('Soya bean', 'Tractor ploughing',         1.0),
  ('Soya bean', 'Farm labour',               8.0),

  -- Tomato — heavy feeder, dense transplanting, staking and harvest labour
  ('Tomato', 'Tomato seedlings',          6000.0),
  ('Tomato', 'NPK 15-15-15',                 3.0),
  ('Tomato', 'Tractor ploughing',            1.0),
  ('Tomato', 'Farm labour',                 20.0),

  -- Pepper — similar profile to tomato, slightly lighter feeding
  ('Pepper', 'Pepper seedlings',          6000.0),
  ('Pepper', 'NPK 15-15-15',                 2.0),
  ('Pepper', 'Tractor ploughing',            1.0),
  ('Pepper', 'Farm labour',                 18.0)
) as n(crop_name, input_name, qty)
join cost_benchmarks b
  on b.input_name = n.input_name and b.basis = 'open_market' and b.year = 2018
join crops c on c.name = n.crop_name
ON CONFLICT (crop_id, benchmark_id) WHERE season_window is null DO UPDATE SET
  quantity_per_acre = EXCLUDED.quantity_per_acre,
  source = EXCLUDED.source;
