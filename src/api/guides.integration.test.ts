/**
 * Integration tests for the agronomic guide library: listing/filtering,
 * fetching one by id, and — the more interesting path — guides matched
 * automatically to a season's actually-flagged categories. Run with
 * `npm run test:integration`.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { signUpWithPhone } from './auth';
import * as farmsApi from './farms';
import * as seasonsApi from './seasons';
import * as cropsApi from './crops';
import * as costsApi from './costs';
import * as estimatesApi from './estimates';
import * as guidesApi from './guides';
import { supabase } from '../lib/supabase';

function randomTestPhone() {
  const digits = Math.floor(1000000 + Math.random() * 9000000).toString();
  return '023' + digits;
}

describe('Guide library — reference data — live integration', () => {
  beforeAll(async () => {
    // Reference tables like `guides` are readable to any signed-in user
    // (RLS: `to authenticated using (true)`), but not to a fully
    // anonymous session — so this block needs a signed-in user too.
    const phone = randomTestPhone();
    await signUpWithPhone(phone, 'IntegrationTest123!', 'Guide List Test Farmer');
  });

  it('listGuides() returns the seeded guide library', async () => {
    const guides = await guidesApi.listGuides();
    expect(guides.length).toBeGreaterThan(0);
  });

  it('listGuides() filters by category', async () => {
    const guides = await guidesApi.listGuides({ category: 'fertiliser' });
    expect(guides.length).toBeGreaterThan(0);
    for (const g of guides) expect(g.category).toBe('fertiliser');
  });

  it('listGuides() filters by a text search on title/summary', async () => {
    const guides = await guidesApi.listGuides({ search: 'fertiliz' });
    expect(guides.length).toBeGreaterThan(0);
  });

  it('getGuideById() returns one guide with its steps sorted by position', async () => {
    const all = await guidesApi.listGuides();
    const guide = await guidesApi.getGuideById(all[0].id);
    expect(guide.id).toBe(all[0].id);
    if (guide.guide_steps && guide.guide_steps.length > 1) {
      for (let i = 1; i < guide.guide_steps.length; i++) {
        expect(guide.guide_steps[i].position).toBeGreaterThanOrEqual(guide.guide_steps[i - 1].position);
      }
    }
  });
});

describe('Guides matched to a farm\'s real flagged categories — live integration', () => {
  let farmId: number;
  let maizeCropId: number;

  beforeAll(async () => {
    const phone = randomTestPhone();
    await signUpWithPhone(phone, 'IntegrationTest123!', 'Guides Test Farmer');

    const farm = await farmsApi.createFarm({
      name: 'Guides Test Farm',
      total_area_acres: 3,
      region: 'Bono',
      district: 'Sunyani',
    });
    farmId = farm.id as number;

    const crops = await cropsApi.getCrops();
    maizeCropId = crops.find((c) => c.name === 'Maize')!.id;
  });

  afterAll(async () => {
    if (farmId) await supabase.from('farms').delete().eq('id', farmId);
  });

  it('getGuidesFor() returns nothing before any estimate has been generated', async () => {
    const season = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: maizeCropId,
      year: 2070,
      season_window: 'major',
      area_planted_acres: 1,
    });
    const guides = await guidesApi.getGuidesFor(season.id);
    expect(guides).toEqual([]);
  });

  it('getGuidesFor() and getFlaggedCategoriesForFarm() surface fertiliser once it is flagged', async () => {
    const season = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: maizeCropId,
      year: 2071,
      season_window: 'major',
      area_planted_acres: 1,
    });

    const benchmarkPesewas = await costsApi.getCategoryBenchmarkPesewas(season.id, 'fertiliser');
    await costsApi.addCost({
      season_id: season.id,
      category: 'fertiliser',
      amount_pesewas: Math.round(benchmarkPesewas * 1.9),
      description: 'Deliberately overspent for the guides test',
    });
    await estimatesApi.generateEstimate(season.id);

    const guides = await guidesApi.getGuidesFor(season.id);
    expect(guides.length).toBeGreaterThan(0);
    for (const g of guides) expect(g.category).toBe('fertiliser');

    const flagged = await guidesApi.getFlaggedCategoriesForFarm(farmId);
    expect(flagged).toContain('fertiliser');
  });
});
