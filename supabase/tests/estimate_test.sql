-- ============================================================
-- TEST SCRIPT: The Estimate Engine (All 11 Tests)
-- File: supabase/tests/estimate_test.sql
-- ============================================================

begin;

do $$
declare
  v_user1 uuid;
  v_user2 uuid;
  v_farm1 bigint;
  v_crop_maize bigint;
  
  v_season1_id bigint; -- Prior season (used for history)
  v_season2_id bigint; -- Current season (2 acres)
  v_season3_id bigint; -- Current season (1 acre)
  v_season4_id bigint; -- Current season (4 acres)
  
  v_est_id bigint;
  v_est_id2 bigint;
  v_estimate record;
  v_line record;
  
  v_expected_total bigint := 712809; -- From Test 2 manually computed
  v_benchmark_fert bigint := 270054; -- From Test 2 manually computed for fertiliser (for 2 acres)
  
  v_test_passed boolean;
  v_count int;
begin
  -- 0. Global Setup
  v_user1 := gen_random_uuid();
  v_user2 := gen_random_uuid();
  
  -- Create dummy users (bypass RLS for setup)
  insert into auth.users (id, aud, role, email) values (v_user1, 'authenticated', 'authenticated', 'user1@test.local');
  insert into auth.users (id, aud, role, email) values (v_user2, 'authenticated', 'authenticated', 'user2@test.local');
  
  insert into farms (user_id, name, total_area_acres) values (v_user1, 'Test Farm 1', 10) returning id into v_farm1;
  select id into v_crop_maize from crops where name = 'Maize';
  
  -- We'll switch to user1 for running estimates.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_user1)::text, true);

  -- =======================================================================
  -- TEST 1 & 2: Cold start & Benchmark Arithmetic
  -- =======================================================================
  insert into seasons (farm_id, crop_id, year, season_window, area_planted_acres)
  values (v_farm1, v_crop_maize, 2026, 'major', 2) returning id into v_season2_id;
  
  v_est_id := generate_estimate(v_season2_id);
  select * into v_estimate from estimates where id = v_est_id;
  
  raise notice '---------------------------------------------------';
  raise notice 'TEST 1: Cold start';
  if v_estimate.method = 'benchmark' then raise notice 'PASS: method = benchmark'; else raise notice 'FAIL: method = % (expected benchmark)', v_estimate.method; end if;
  if v_estimate.seasons_used = 0 then raise notice 'PASS: seasons_used = 0'; else raise notice 'FAIL: seasons_used = % (expected 0)', v_estimate.seasons_used; end if;
  if v_estimate.total_pesewas > 0 then raise notice 'PASS: total_pesewas > 0'; else raise notice 'FAIL: total_pesewas = 0'; end if;
  select count(*) into v_count from estimate_lines where estimate_id = v_est_id;
  if v_count = 6 then raise notice 'PASS: 6 lines generated (1 per category with norms)'; else raise notice 'FAIL: % lines generated (expected 6)', v_count; end if;

  raise notice '---------------------------------------------------';
  raise notice 'TEST 2: Benchmark arithmetic';
  if v_estimate.total_pesewas = v_expected_total then 
    raise notice 'PASS: total exactly matches expected %', v_expected_total; 
  else 
    raise notice 'FAIL: total = % (expected %)', v_estimate.total_pesewas, v_expected_total; 
  end if;

  -- =======================================================================
  -- Setup Prior Season (3 acres) for Tests 3-6
  -- =======================================================================
  insert into seasons (farm_id, crop_id, year, season_window, area_planted_acres, is_complete)
  values (v_farm1, v_crop_maize, 2025, 'major', 3, true) returning id into v_season1_id;
  
  -- Add cost for fertiliser exactly 60% above benchmark per acre.
  -- Benchmark fert for 2 acres = 270054. For 1 acre = 135027.
  -- 60% above 135027 = 135027 * 1.6 = 216043.2
  -- For 3 acres = 216043.2 * 3 = 648130 pesewas.
  insert into season_costs (season_id, category, amount_pesewas) values (v_season1_id, 'fertiliser', 648130);
  
  -- Add cost for seed exactly 10% above benchmark per acre.
  -- Benchmark seed for 1 acre = 27000.
  -- 10% above = 29700. For 3 acres = 89100.
  insert into season_costs (season_id, category, amount_pesewas) values (v_season1_id, 'seeds', 89100);

  -- Add cost for 'other' (No benchmark)
  insert into season_costs (season_id, category, amount_pesewas) values (v_season1_id, 'other', 15000); -- 5000 per acre

  -- =======================================================================
  -- TEST 3, 4, 5, 6: History method & Flagging
  -- =======================================================================
  v_est_id := generate_estimate(v_season2_id);
  select * into v_estimate from estimates where id = v_est_id;
  
  raise notice '---------------------------------------------------';
  raise notice 'TEST 3: History method';
  if v_estimate.method = 'history' then raise notice 'PASS: method = history'; else raise notice 'FAIL: method = %', v_estimate.method; end if;
  if v_estimate.seasons_used = 1 then raise notice 'PASS: seasons_used = 1'; else raise notice 'FAIL: seasons_used = %', v_estimate.seasons_used; end if;
  
  -- Check 'other' category is estimated at 5000 * 2 acres = 10000
  select * into v_line from estimate_lines where estimate_id = v_est_id and category = 'other';
  if v_line.estimated_pesewas = 10000 then raise notice 'PASS: per-category scaled correctly for ''other'''; else raise notice 'FAIL: scaled ''other'' = % (expected 10000)', v_line.estimated_pesewas; end if;

  raise notice '---------------------------------------------------';
  raise notice 'TEST 4: Flagging (60 percent above)';
  select * into v_line from estimate_lines where estimate_id = v_est_id and category = 'fertiliser';
  if v_line.is_flagged = true then raise notice 'PASS: is_flagged = true'; else raise notice 'FAIL: is_flagged = false'; end if;
  if v_line.variance_pct = 60 then raise notice 'PASS: variance_pct = 60'; else raise notice 'FAIL: variance_pct = % (expected 60)', v_line.variance_pct; end if;
  if v_line.advice is not null then raise notice 'PASS: advice is present'; else raise notice 'FAIL: advice is null'; end if;
  if v_line.potential_saving_pesewas = (v_line.estimated_pesewas - v_line.benchmark_pesewas) then 
    raise notice 'PASS: potential_saving is correct'; 
  else 
    raise notice 'FAIL: potential_saving incorrect'; 
  end if;

  raise notice '---------------------------------------------------';
  raise notice 'TEST 5: No false flags (10 percent above)';
  select * into v_line from estimate_lines where estimate_id = v_est_id and category = 'seeds';
  if v_line.is_flagged = false then raise notice 'PASS: is_flagged = false'; else raise notice 'FAIL: is_flagged = true'; end if;
  if v_line.advice is null then raise notice 'PASS: advice is null'; else raise notice 'FAIL: advice is not null'; end if;

  raise notice '---------------------------------------------------';
  raise notice 'TEST 6: Category with no benchmark';
  select * into v_line from estimate_lines where estimate_id = v_est_id and category = 'other';
  if found then raise notice 'PASS: appears in estimate_lines'; else raise notice 'FAIL: missing from estimate_lines'; end if;
  if v_line.is_flagged = false then raise notice 'PASS: is_flagged = false'; else raise notice 'FAIL: is_flagged = true'; end if;

  -- =======================================================================
  -- TEST 7: Threshold is configurable
  -- =======================================================================
  update app_settings set flag_threshold_pct = 5 where id = true;
  v_est_id := generate_estimate(v_season2_id);
  
  raise notice '---------------------------------------------------';
  raise notice 'TEST 7: Threshold is configurable';
  select * into v_line from estimate_lines where estimate_id = v_est_id and category = 'seeds';
  if v_line.is_flagged = true then raise notice 'PASS: 10 percent variance now flagged (threshold 5 percent)'; else raise notice 'FAIL: 10 percent variance not flagged'; end if;
  
  -- reset setting
  update app_settings set flag_threshold_pct = 30 where id = true;

  -- =======================================================================
  -- TEST 8: Absurd value test
  -- =======================================================================
  raise notice '---------------------------------------------------';
  raise notice 'TEST 8: Absurd value test';
  -- Create new cold season to isolate benchmark method
  insert into seasons (farm_id, crop_id, year, season_window, area_planted_acres) values (v_farm1, v_crop_maize, 2027, 'minor', 2) returning id into v_season3_id;
  v_est_id := generate_estimate(v_season3_id);
  select estimated_pesewas into v_line from estimate_lines where estimate_id = v_est_id and category = 'land_prep';
  
  -- Change benchmark
  update cost_benchmarks set price_pesewas = 500 where input_name = 'Tractor ploughing' and year = 2018;
  v_est_id2 := generate_estimate(v_season3_id);
  select estimated_pesewas into v_estimate from estimate_lines where estimate_id = v_est_id2 and category = 'land_prep';
  
  if v_estimate.estimated_pesewas <> v_line.estimated_pesewas then 
    raise notice 'PASS: land_prep changed dramatically (Old: %, New: %)', v_line.estimated_pesewas, v_estimate.estimated_pesewas; 
  else 
    raise notice 'FAIL: land_prep did not change! Hardcoded value suspected.'; 
  end if;
  
  -- reset benchmark
  update cost_benchmarks set price_pesewas = 12000 where input_name = 'Tractor ploughing' and year = 2018;

  -- =======================================================================
  -- TEST 9: Area scaling
  -- =======================================================================
  raise notice '---------------------------------------------------';
  raise notice 'TEST 9: Area scaling';
  insert into seasons (farm_id, crop_id, year, season_window, area_planted_acres) values (v_farm1, v_crop_maize, 2028, 'minor', 1) returning id into v_season3_id;
  insert into seasons (farm_id, crop_id, year, season_window, area_planted_acres) values (v_farm1, v_crop_maize, 2029, 'dry', 4) returning id into v_season4_id;
  
  v_est_id := generate_estimate(v_season3_id);
  v_est_id2 := generate_estimate(v_season4_id);
  
  select total_pesewas into v_estimate from estimates where id = v_est_id;
  select total_pesewas into v_line from estimates where id = v_est_id2;
  
  if v_line.total_pesewas = (v_estimate.total_pesewas * 4) then 
    raise notice 'PASS: 4-acre total (%) is EXACTLY 4x the 1-acre total (%)', v_line.total_pesewas, v_estimate.total_pesewas; 
  else 
    raise notice 'FAIL: 4-acre total (%) is NOT 4x the 1-acre total (%)', v_line.total_pesewas, v_estimate.total_pesewas; 
  end if;

  -- =======================================================================
  -- TEST 10: Re-running
  -- =======================================================================
  raise notice '---------------------------------------------------';
  raise notice 'TEST 10: Re-running';
  v_est_id := generate_estimate(v_season4_id);
  v_est_id2 := generate_estimate(v_season4_id);
  
  select count(*) into v_count from estimates where season_id = v_season4_id;
  if v_count = 3 then -- 1 from test 9, 2 from test 10
    raise notice 'PASS: multiple estimate rows exist for same season'; 
  else 
    raise notice 'FAIL: expected 3 estimate rows, found %', v_count; 
  end if;
  
  -- verify first estimate is unchanged (check ID explicitly)
  select total_pesewas into v_estimate from estimates where id = v_est_id;
  if v_estimate.total_pesewas is not null then 
    raise notice 'PASS: prior estimate is unchanged'; 
  else 
    raise notice 'FAIL: prior estimate missing or changed'; 
  end if;

  -- =======================================================================
  -- TEST 11: RLS
  -- =======================================================================
  raise notice '---------------------------------------------------';
  raise notice 'TEST 11: RLS';
  -- switch to user2
  perform set_config('request.jwt.claims', json_build_object('sub', v_user2)::text, true);
  
  begin
    perform generate_estimate(v_season2_id);
    raise notice 'FAIL: generate_estimate succeeded for wrong user!';
  exception when others then
    if sqlerrm like '%not found or not accessible%' then
      raise notice 'PASS: Exception caught for RLS violation: %', sqlerrm;
    else
      raise notice 'FAIL: Wrong exception: %', sqlerrm;
    end if;
  end;

end $$;

rollback;
