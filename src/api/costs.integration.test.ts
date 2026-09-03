/**
 * Integration tests for cost recording (both entry paths), quickFillCosts,
 * getExpectedCategoriesForCrop, and the season total. Also verifies all
 * ten seeded crops have at least essential benchmark coverage (Issue #17).
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
  return '029' + digits;
}

describe('Cost recording — live integration', () => {
  let farmId: number;
  let seasonId: number;

  beforeAll(async () => {
    const phone = randomTestPhone();
    await signUpWithPhone(phone, 'IntegrationTest123!', 'Cost Test Farmer');

    const farm = await farmsApi.createFarm({
      name: 'Cost Test Farm',
      total_area_acres: 5,
      region: 'Central',
      district: 'Cape Coast',
    });
    farmId = farm.id as number;

    const crops = await cropsApi.getCrops();
    const maize = crops.find((c) => c.name === 'Maize')!;
    const season = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: maize.id,
      year: 2044,
      season_window: 'major',
      area_planted_acres: 2,
    });
    seasonId = season.id;
  });

  afterAll(async () => {
    if (farmId) await supabase.from('farms').delete().eq('id', farmId);
  });

  it('records a total-only cost entry', async () => {
    const cost = await costsApi.addCost({
      season_id: seasonId,
      category: 'seeds',
      amount_pesewas: 25000,
      description: 'Total-only test entry',
    });
    expect(cost.amount_pesewas).toBe(25000);
    expect(cost.quantity).toBeNull();
  });

  it('records a quantity x rate cost entry, with amount_pesewas as the source of truth', async () => {
    const cost = await costsApi.addCost({
      season_id: seasonId,
      category: 'fertiliser',
      quantity: 3,
      unit: 'bag',
      unit_cost_pesewas: 15000,
      amount_pesewas: 45000, // 3 x 15000 — computed client-side, same as the real form
    });
    expect(cost.amount_pesewas).toBe(45000);
    expect(cost.quantity).toBe(3);
  });

  it('updates and then deletes a cost item', async () => {
    const cost = await costsApi.addCost({ season_id: seasonId, category: 'storage', amount_pesewas: 1000 });
    const updated = await costsApi.updateCost(cost.id, { amount_pesewas: 2000 });
    expect(updated.amount_pesewas).toBe(2000);

    await costsApi.deleteCost(cost.id);
    const remaining = await costsApi.listCosts(seasonId);
    expect(remaining.find((c) => c.id === cost.id)).toBeUndefined();
  });

  it('getSeasonTotalPesewas() sums every recorded cost for the season', async () => {
    const costs = await costsApi.listCosts(seasonId);
    const expectedTotal = costs.reduce((sum, c) => sum + c.amount_pesewas, 0);
    const total = await costsApi.getSeasonTotalPesewas(seasonId);
    expect(total).toBe(expectedTotal);
  });

  it('getExpectedCategoriesForCrop() returns Maize\'s real seeded categories', async () => {
    const crops = await cropsApi.getCrops();
    const maize = crops.find((c) => c.name === 'Maize')!;
    const categories = await costsApi.getExpectedCategoriesForCrop(maize.id);
    expect(categories.length).toBeGreaterThan(0);
    expect(categories).toContain('fertiliser');
  });

  it('quickFillCosts() fills every expected category from the benchmark on a fresh season', async () => {
    const crops = await cropsApi.getCrops();
    const maize = crops.find((c) => c.name === 'Maize')!;
    const freshSeason = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: maize.id,
      year: 2045,
      season_window: 'major',
      area_planted_acres: 1,
    });

    await costsApi.quickFillCosts(freshSeason.id);
    const filled = await costsApi.listCosts(freshSeason.id);
    expect(filled.length).toBeGreaterThan(0);
    expect(filled.every((c) => c.amount_pesewas > 0)).toBe(true);
  });
});

describe('Benchmark coverage across all ten seeded crops — live integration', () => {
  it('every seeded crop has at least the four essential categories covered', async () => {
    const crops = await cropsApi.getCrops();
    expect(crops.length).toBeGreaterThanOrEqual(10);

    const essentials = ['seeds', 'fertiliser', 'land_prep', 'labour'];
    for (const crop of crops) {
      const categories = await costsApi.getExpectedCategoriesForCrop(crop.id);
      for (const essential of essentials) {
        expect(
          categories.includes(essential as any),
          `${crop.name} is missing "${essential}" benchmark coverage`
        ).toBe(true);
      }
    }
  });
});
