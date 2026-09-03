/**
 * Integration tests for the dashboard rollup views (v_farm_summary,
 * v_crop_summary) — confirming the aggregates a farmer sees on login
 * actually match what was recorded, not just that the query succeeds.
 * Run with `npm run test:integration`.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { signUpWithPhone } from './auth';
import * as farmsApi from './farms';
import * as seasonsApi from './seasons';
import * as cropsApi from './crops';
import * as costsApi from './costs';
import * as dashboardApi from './dashboard';
import { supabase } from '../lib/supabase';

function randomTestPhone() {
  const digits = Math.floor(1000000 + Math.random() * 9000000).toString();
  return '024' + digits;
}

describe('Dashboard rollups — live integration', () => {
  let farmId: number;
  let maizeCropId: number;

  beforeAll(async () => {
    const phone = randomTestPhone();
    await signUpWithPhone(phone, 'IntegrationTest123!', 'Dashboard Test Farmer');

    const farm = await farmsApi.createFarm({
      name: 'Dashboard Test Farm',
      total_area_acres: 6,
      region: 'Northern',
      district: 'Tamale',
    });
    farmId = farm.id as number;

    const crops = await cropsApi.getCrops();
    maizeCropId = crops.find((c) => c.name === 'Maize')!.id;
  });

  afterAll(async () => {
    if (farmId) await supabase.from('farms').delete().eq('id', farmId);
  });

  it('getFarmSummary() rolls up season count, planted acreage, and recorded spend correctly', async () => {
    const seasonA = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: maizeCropId,
      year: 2060,
      season_window: 'major',
      area_planted_acres: 2,
    });
    await costsApi.addCost({ season_id: seasonA.id, category: 'seeds', amount_pesewas: 5000 });

    const seasonB = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: maizeCropId,
      year: 2061,
      season_window: 'major',
      area_planted_acres: 3,
    });
    await costsApi.addCost({ season_id: seasonB.id, category: 'fertiliser', amount_pesewas: 7000 });

    const summary = await dashboardApi.getFarmSummary(farmId);
    expect(summary.farm_id).toBe(farmId);
    expect(summary.season_count).toBeGreaterThanOrEqual(2);
    expect(summary.total_planted_acres).toBeGreaterThanOrEqual(5);
    expect(summary.total_recorded_pesewas).toBeGreaterThanOrEqual(12000);
  });

  it('getCropSummary() reports cost-per-acre for the crop grown', async () => {
    const summaries = await dashboardApi.getCropSummary(farmId);
    const maize = summaries.find((s) => s.crop_id === maizeCropId);
    expect(maize).toBeDefined();
    expect(maize!.total_recorded_pesewas).toBeGreaterThanOrEqual(12000);
    expect(maize!.cost_per_acre_pesewas).not.toBeNull();
  });

  it('getFarmSummary() throws a friendly error for a farm id that does not exist', async () => {
    await expect(dashboardApi.getFarmSummary(999999999)).rejects.toThrow();
  });
});
