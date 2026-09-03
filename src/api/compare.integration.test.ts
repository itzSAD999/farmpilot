/**
 * Integration tests for the three Compare views — season-vs-season,
 * crop-vs-crop (both the unfiltered view path and the year-filtered
 * direct-aggregation path), and me-vs-benchmark. Run with
 * `npm run test:integration`.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { signUpWithPhone } from './auth';
import * as farmsApi from './farms';
import * as seasonsApi from './seasons';
import * as cropsApi from './crops';
import * as costsApi from './costs';
import * as estimatesApi from './estimates';
import * as compareApi from './compare';
import { supabase } from '../lib/supabase';

function randomTestPhone() {
  const digits = Math.floor(1000000 + Math.random() * 9000000).toString();
  return '025' + digits;
}

describe('Compare — live integration', () => {
  let farmId: number;
  let maizeCropId: number;
  let cassavaCropId: number;

  beforeAll(async () => {
    const phone = randomTestPhone();
    await signUpWithPhone(phone, 'IntegrationTest123!', 'Compare Test Farmer');

    const farm = await farmsApi.createFarm({
      name: 'Compare Test Farm',
      total_area_acres: 10,
      region: 'Central',
      district: 'Cape Coast',
    });
    farmId = farm.id as number;

    const crops = await cropsApi.getCrops();
    maizeCropId = crops.find((c) => c.name === 'Maize')!.id;
    cassavaCropId = crops.find((c) => c.name === 'Cassava')!.id;
  });

  afterAll(async () => {
    if (farmId) await supabase.from('farms').delete().eq('id', farmId);
  });

  it('compareSeasons() excludes a zero-cost season and computes cost-per-acre for the rest', async () => {
    const withCosts = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: maizeCropId,
      year: 2050,
      season_window: 'major',
      area_planted_acres: 2,
    });
    await costsApi.addCost({ season_id: withCosts.id, category: 'seeds', amount_pesewas: 20000 });

    const empty = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: maizeCropId,
      year: 2051,
      season_window: 'major',
      area_planted_acres: 1,
    });

    const result = await compareApi.compareSeasons([withCosts.id, empty.id]);

    expect(result.seasons).toHaveLength(1);
    expect(result.seasons[0].id).toBe(withCosts.id);
    expect(result.excluded.length).toBe(1);

    const seedsRow = result.data.find((r: any) => r.category === 'seeds');
    expect(seedsRow[result.seasons[0].name]).toBe(10000); // 20000 pesewas / 2 acres
  });

  it('compareSeasons() with an empty id list returns an empty result, not an error', async () => {
    const result = await compareApi.compareSeasons([]);
    expect(result).toEqual({ data: [], excluded: [], seasons: [] });
  });

  it('compareCrops() (unfiltered) reports both crops via the pre-aggregated view', async () => {
    const maizeSeason = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: maizeCropId,
      year: 2052,
      season_window: 'major',
      area_planted_acres: 2,
    });
    await costsApi.addCost({ season_id: maizeSeason.id, category: 'fertiliser', amount_pesewas: 40000 });

    const cassavaSeason = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: cassavaCropId,
      year: 2052,
      season_window: 'major',
      area_planted_acres: 4,
    });
    await costsApi.addCost({ season_id: cassavaSeason.id, category: 'fertiliser', amount_pesewas: 40000 });

    const result = await compareApi.compareCrops(farmId);
    const names = result.data.map((r: any) => r.name);
    expect(names).toContain('Maize');
    expect(names).toContain('Cassava');
    expect(result.years).toBeUndefined();
  });

  it('compareCrops() with a year filter aggregates directly and matches the manual sum', async () => {
    const result = await compareApi.compareCrops(farmId, [2052]);
    const maizeRow = result.data.find((r: any) => r.name === 'Maize');
    expect(maizeRow).toBeDefined();
    expect(maizeRow.cost_per_acre).toBe(20000); // 40000 pesewas / 2 acres, from the 2052 season only
    expect(result.years).toEqual([2052]);
  });

  it('compareToBenchmark() reports actual vs. benchmark per acre after an estimate exists', async () => {
    const season = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: maizeCropId,
      year: 2053,
      season_window: 'major',
      area_planted_acres: 2,
    });
    await costsApi.addCost({ season_id: season.id, category: 'labour', amount_pesewas: 30000 });
    await estimatesApi.generateEstimate(season.id);

    const result = await compareApi.compareToBenchmark(season.id);
    const labourRow = result.data.find((r: any) => r.category === 'labour');
    expect(labourRow).toBeDefined();
    expect(labourRow.actual).toBe(15000); // 30000 pesewas / 2 acres
    expect(labourRow.benchmark).not.toBeNull();

    const otherRow = result.data.find((r: any) => r.category === 'other');
    expect(otherRow.benchmark).toBeNull(); // 'other' has no benchmark, by design
  });
});
