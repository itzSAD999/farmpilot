/**
 * Integration tests against the REAL, linked Supabase project — the core
 * `generate_estimate()` PL/pgSQL function and the benchmark RPCs built
 * around it, plus Category Budgets. These are the parts of the system a
 * unit test can't reach (business logic lives in the database, not in
 * TypeScript), and the parts most likely to break silently without a
 * check like this — see FarmPilot_Development_Log.md, Issues #3 and #4,
 * both of which were caught by hand, not by an automated test, before
 * this suite existed.
 *
 * Each run creates a throwaway farm/season under a fresh test account and
 * tears the farm down again in afterAll (RLS scopes everything to the
 * owning user, and deleting the farm cascades seasons/costs/estimates/
 * budgets). Requires VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env.
 * Run with `npm run test:integration` — not part of the default `npm test`.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { signUpWithPhone } from './auth';
import * as farmsApi from './farms';
import * as seasonsApi from './seasons';
import * as costsApi from './costs';
import * as estimatesApi from './estimates';
import * as budgetsApi from './budgets';
import * as labApi from './lab';
import * as cropsApi from './crops';
import { supabase } from '../lib/supabase';

function randomTestPhone() {
  const digits = Math.floor(1000000 + Math.random() * 9000000).toString();
  return '020' + digits;
}

describe('generate_estimate() and benchmark RPCs — live integration', () => {
  let farmId: number;
  let maizeCropId: number;

  beforeAll(async () => {
    const phone = randomTestPhone();
    await signUpWithPhone(phone, 'IntegrationTest123!', 'Integration Test Farmer');

    const farm = await farmsApi.createFarm({
      name: 'Integration Test Farm',
      total_area_acres: 10,
      region: 'Ashanti',
      district: 'Kumasi',
    });
    farmId = farm.id as number;

    const crops = await cropsApi.getCrops();
    const maize = crops.find((c) => c.name === 'Maize');
    if (!maize) throw new Error('Maize crop not found — is the DB seeded?');
    maizeCropId = maize.id;
  });

  afterAll(async () => {
    if (farmId) {
      await supabase.from('farms').delete().eq('id', farmId);
    }
  });

  it('with no history and nothing recorded, predicts everything from the benchmark and flags nothing', async () => {
    const season = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: maizeCropId,
      year: 2030,
      season_window: 'major',
      area_planted_acres: 2,
    });

    const estimateId = await estimatesApi.generateEstimate(season.id);
    const lines = await estimatesApi.getReport(estimateId);

    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0].method).toBe('benchmark');
    for (const line of lines) {
      expect(line.is_actual).toBe(false);
      expect(line.is_flagged).toBe(false);
    }
  });

  it('flags a category recorded well above the benchmark, with variance/advice/saving populated', async () => {
    const season = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: maizeCropId,
      year: 2031,
      season_window: 'major',
      area_planted_acres: 2,
    });

    const benchmarkPesewas = await costsApi.getCategoryBenchmarkPesewas(season.id, 'fertiliser');
    expect(benchmarkPesewas).toBeGreaterThan(0);

    // Record 80% above the benchmark — comfortably over the 30% flag threshold.
    await costsApi.addCost({
      season_id: season.id,
      category: 'fertiliser',
      amount_pesewas: Math.round(benchmarkPesewas * 1.8),
      description: 'Deliberately overspent for the test',
    });

    const estimateId = await estimatesApi.generateEstimate(season.id);
    const lines = await estimatesApi.getReport(estimateId);
    const fertiliser = lines.find((l) => l.category === 'fertiliser');

    expect(fertiliser).toBeDefined();
    expect(fertiliser!.is_actual).toBe(true);
    expect(fertiliser!.is_flagged).toBe(true);
    expect(fertiliser!.variance_pct).not.toBeNull();
    expect(fertiliser!.variance_pct!).toBeGreaterThan(30);
    expect(fertiliser!.advice).toBeTruthy();
    expect(fertiliser!.potential_saving_pesewas).toBeGreaterThan(0);
  });

  it('does not flag a category recorded below the benchmark', async () => {
    const season = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: maizeCropId,
      year: 2032,
      season_window: 'major',
      area_planted_acres: 2,
    });

    const benchmarkPesewas = await costsApi.getCategoryBenchmarkPesewas(season.id, 'labour');
    await costsApi.addCost({
      season_id: season.id,
      category: 'labour',
      amount_pesewas: Math.round(benchmarkPesewas * 0.7),
      description: 'Deliberately underspent for the test',
    });

    const estimateId = await estimatesApi.generateEstimate(season.id);
    const lines = await estimatesApi.getReport(estimateId);
    const labour = lines.find((l) => l.category === 'labour');

    expect(labour).toBeDefined();
    expect(labour!.is_actual).toBe(true);
    expect(labour!.is_flagged).toBe(false);
  });

  it('uses history, not just the benchmark, once a prior completed season exists for the same crop', async () => {
    const closedSeason = await seasonsApi.createHistoricalSeason({
      farm_id: farmId,
      crop_id: maizeCropId,
      year: 2028,
      season_window: 'major',
      area_planted_acres: 2,
    });
    await costsApi.addCost({
      season_id: closedSeason.id,
      category: 'seeds',
      amount_pesewas: 10000,
    });

    const newSeason = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: maizeCropId,
      year: 2033,
      season_window: 'major',
      area_planted_acres: 2,
    });

    const estimateId = await estimatesApi.generateEstimate(newSeason.id);
    const lines = await estimatesApi.getReport(estimateId);

    expect(lines[0].method).toBe('history');
    expect(lines[0].seasons_used).toBeGreaterThanOrEqual(1);
  });

  it('get_crop_benchmark_lines() scales linearly with acreage (quantity x rate is internally consistent)', async () => {
    const oneAcre = await labApi.getCropBenchmarkLines(maizeCropId, 'major', 1);
    const twoAcres = await labApi.getCropBenchmarkLines(maizeCropId, 'major', 2);

    expect(oneAcre.length).toBeGreaterThan(0);
    expect(oneAcre.length).toBe(twoAcres.length);

    for (const line of oneAcre) {
      const doubled = twoAcres.find((l) => l.input_name === line.input_name);
      expect(doubled).toBeDefined();
      // Doubling the acreage must double the quantity but leave the
      // per-unit rate untouched — rate is a market price, not a function
      // of how much land you have.
      expect(doubled!.quantity_total).toBeCloseTo(line.quantity_total * 2, 1);
      expect(doubled!.unit_price_pesewas).toBe(line.unit_price_pesewas);
    }
  });
});

describe('Category Budgets — live integration', () => {
  let farmId: number;
  let seasonId: number;

  beforeAll(async () => {
    const phone = randomTestPhone();
    await signUpWithPhone(phone, 'IntegrationTest123!', 'Integration Test Farmer 2');

    const farm = await farmsApi.createFarm({
      name: 'Integration Test Farm 2',
      total_area_acres: 5,
      region: 'Ashanti',
      district: 'Kumasi',
    });
    farmId = farm.id as number;

    const crops = await cropsApi.getCrops();
    const maize = crops.find((c) => c.name === 'Maize')!;

    const season = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: maize.id,
      year: 2034,
      season_window: 'major',
      area_planted_acres: 1,
    });
    seasonId = season.id;
  });

  afterAll(async () => {
    if (farmId) {
      await supabase.from('farms').delete().eq('id', farmId);
    }
  });

  it('reports spent/remaining/over-budget correctly as costs are recorded against a cap', async () => {
    await budgetsApi.setCategoryBudget(seasonId, 'seeds', 10000); // GHS 100.00 cap

    let budgets = await budgetsApi.listBudgetsForSeason(seasonId);
    let seedsBudget = budgets.find((b) => b.category === 'seeds')!;
    expect(seedsBudget.limit_pesewas).toBe(10000);
    expect(seedsBudget.spent_pesewas).toBe(0);
    expect(seedsBudget.is_over_budget).toBe(false);

    await costsApi.addCost({ season_id: seasonId, category: 'seeds', amount_pesewas: 15000 });

    budgets = await budgetsApi.listBudgetsForSeason(seasonId);
    seedsBudget = budgets.find((b) => b.category === 'seeds')!;
    expect(seedsBudget.spent_pesewas).toBe(15000);
    expect(seedsBudget.remaining_pesewas).toBe(-5000);
    expect(seedsBudget.is_over_budget).toBe(true);
    expect(seedsBudget.pct_used).toBe(150);
  });
});
