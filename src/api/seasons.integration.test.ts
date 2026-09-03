/**
 * Integration tests for season CRUD, including the historical-season
 * backfill path (Issue #20) and cascade deletion.
 * Run with `npm run test:integration`.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { signUpWithPhone } from './auth';
import * as farmsApi from './farms';
import * as seasonsApi from './seasons';
import * as cropsApi from './crops';
import * as costsApi from './costs';
import { supabase } from '../lib/supabase';

function randomTestPhone() {
  const digits = Math.floor(1000000 + Math.random() * 9000000).toString();
  return '028' + digits;
}

describe('Season CRUD and history back-fill — live integration', () => {
  let farmId: number;
  let cropId: number;

  beforeAll(async () => {
    const phone = randomTestPhone();
    await signUpWithPhone(phone, 'IntegrationTest123!', 'Season Test Farmer');

    const farm = await farmsApi.createFarm({
      name: 'Season Test Farm',
      total_area_acres: 8,
      region: 'Eastern',
      district: 'Koforidua',
    });
    farmId = farm.id as number;

    const crops = await cropsApi.getCrops();
    cropId = crops.find((c) => c.name === 'Cassava')!.id;
  });

  afterAll(async () => {
    if (farmId) await supabase.from('farms').delete().eq('id', farmId);
  });

  it('creates a live (not-yet-complete) season', async () => {
    const season = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: cropId,
      year: 2040,
      season_window: 'major',
      area_planted_acres: 2,
    });
    expect(season.is_complete).toBe(false);
    expect(season.farm_id).toBe(farmId);
  });

  it('back-fills a historical season as already-complete, with no live recording phase', async () => {
    const historical = await seasonsApi.createHistoricalSeason({
      farm_id: farmId,
      crop_id: cropId,
      year: 2024,
      season_window: 'minor',
      area_planted_acres: 1.5,
    });
    expect(historical.is_complete).toBe(true);

    // A back-filled season is a completely ordinary season row otherwise —
    // costs can be added to it exactly like a live one.
    await costsApi.addCost({
      season_id: historical.id,
      category: 'seeds',
      amount_pesewas: 8000,
      description: 'Historical total (2024)',
    });
    const costs = await costsApi.listCosts(historical.id);
    expect(costs).toHaveLength(1);
    expect(costs[0].amount_pesewas).toBe(8000);
  });

  it('updates a season', async () => {
    const season = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: cropId,
      year: 2041,
      season_window: 'major',
      area_planted_acres: 2,
    });
    await seasonsApi.updateSeason(season.id, { area_planted_acres: 3.5 });
    const refetched = await seasonsApi.getSeason(season.id);
    expect(Number(refetched.area_planted_acres)).toBe(3.5);
  });

  it('completeSeason() records harvest and revenue and flips is_complete', async () => {
    const season = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: cropId,
      year: 2042,
      season_window: 'major',
      area_planted_acres: 2,
    });
    const completed = await seasonsApi.completeSeason(season.id, 12, 'bag_100kg', 500000);
    expect(completed.is_complete).toBe(true);
    expect(Number(completed.harvest_qty)).toBe(12);
    expect(completed.revenue_pesewas).toBe(500000);
  });

  it('deleting a season cascades and removes its costs too', async () => {
    const season = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: cropId,
      year: 2043,
      season_window: 'major',
      area_planted_acres: 1,
    });
    await costsApi.addCost({ season_id: season.id, category: 'labour', amount_pesewas: 3000 });

    await seasonsApi.deleteSeason(season.id);

    const { data: remainingCosts } = await supabase.from('season_costs').select('id').eq('season_id', season.id);
    expect(remainingCosts).toEqual([]);
    await expect(seasonsApi.getSeason(season.id)).rejects.toThrow();
  });

  it('listSeasons() includes both live and back-filled seasons for the farm', async () => {
    const all = await seasonsApi.listSeasons(farmId);
    expect(all.length).toBeGreaterThanOrEqual(3);
    expect(all.some((s) => s.is_complete)).toBe(true);
    expect(all.some((s) => !s.is_complete)).toBe(true);
  });
});
