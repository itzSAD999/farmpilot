/**
 * Integration tests for Category Budgets' CRUD paths not already covered
 * by estimates.integration.test.ts (which covers the spent/remaining/
 * over-budget arithmetic): replacing an existing cap, and deleting one.
 * Run with `npm run test:integration`.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { signUpWithPhone } from './auth';
import * as farmsApi from './farms';
import * as seasonsApi from './seasons';
import * as cropsApi from './crops';
import * as budgetsApi from './budgets';
import { supabase } from '../lib/supabase';

function randomTestPhone() {
  const digits = Math.floor(1000000 + Math.random() * 9000000).toString();
  return '026' + digits;
}

describe('Category Budgets — replace and delete — live integration', () => {
  let farmId: number;
  let seasonId: number;

  beforeAll(async () => {
    const phone = randomTestPhone();
    await signUpWithPhone(phone, 'IntegrationTest123!', 'Budget Test Farmer');

    const farm = await farmsApi.createFarm({
      name: 'Budget Test Farm',
      total_area_acres: 4,
      region: 'Volta',
      district: 'Ho',
    });
    farmId = farm.id as number;

    const crops = await cropsApi.getCrops();
    const maize = crops.find((c) => c.name === 'Maize')!;
    const season = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: maize.id,
      year: 2036,
      season_window: 'major',
      area_planted_acres: 1,
    });
    seasonId = season.id;
  });

  afterAll(async () => {
    if (farmId) await supabase.from('farms').delete().eq('id', farmId);
  });

  it('setCategoryBudget() replaces the cap for the same category rather than duplicating it', async () => {
    await budgetsApi.setCategoryBudget(seasonId, 'transport', 5000);
    await budgetsApi.setCategoryBudget(seasonId, 'transport', 8000);

    const budgets = await budgetsApi.listBudgetsForSeason(seasonId);
    const transportBudgets = budgets.filter((b) => b.category === 'transport');
    expect(transportBudgets).toHaveLength(1);
    expect(transportBudgets[0].limit_pesewas).toBe(8000);
  });

  it('deleteCategoryBudget() removes the cap entirely', async () => {
    await budgetsApi.setCategoryBudget(seasonId, 'storage', 3000);
    let budgets = await budgetsApi.listBudgetsForSeason(seasonId);
    const storageBudget = budgets.find((b) => b.category === 'storage')!;
    expect(storageBudget).toBeDefined();

    await budgetsApi.deleteCategoryBudget(storageBudget.id);

    budgets = await budgetsApi.listBudgetsForSeason(seasonId);
    expect(budgets.find((b) => b.category === 'storage')).toBeUndefined();
  });
});
