/**
 * Integration test proving the offline queue's write path actually works
 * end to end against the real database — not just that enqueue()/flush()
 * call the right functions, but that a queued season_costs insert is
 * accepted by the live schema and its client_id idempotency guard
 * (migration 003) really does what it's there for. This is the piece
 * that AddCostForm.tsx now calls when a cost is recorded while offline
 * (previously nothing in the app ever called enqueue() at all — see
 * FarmPilot_Development_Log.md, Issue #40).
 *
 * Uses fake-indexeddb so this can run under Vitest's Node environment
 * (there is no real IndexedDB outside a browser). Run with
 * `npm run test:integration`.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { signUpWithPhone } from '../../api/auth';
import * as farmsApi from '../../api/farms';
import * as seasonsApi from '../../api/seasons';
import * as cropsApi from '../../api/crops';
import * as costsApi from '../../api/costs';
import { supabase } from '../supabase';
import { enqueue, flush } from './queue';
import { queueStore } from './db';

function randomTestPhone() {
  const digits = Math.floor(1000000 + Math.random() * 9000000).toString();
  return '019' + digits;
}

describe('Offline queue write path — live integration', () => {
  let farmId: number;
  let seasonId: number;

  beforeAll(async () => {
    const phone = randomTestPhone();
    await signUpWithPhone(phone, 'IntegrationTest123!', 'Offline Queue Test Farmer');

    const farm = await farmsApi.createFarm({
      name: 'Offline Queue Test Farm',
      total_area_acres: 2,
      region: 'Ashanti',
      district: 'Kumasi',
    });
    farmId = farm.id as number;

    const crops = await cropsApi.getCrops();
    const maize = crops.find((c) => c.name === 'Maize')!;
    const season = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: maize.id,
      year: 2099,
      season_window: 'major',
      area_planted_acres: 1,
    });
    seasonId = season.id;
  });

  afterAll(async () => {
    if (farmId) await supabase.from('farms').delete().eq('id', farmId);
  });

  it('a queued cost insert actually reaches the real season_costs table on flush()', async () => {
    await queueStore.clear();

    const clientId = await enqueue({
      table: 'season_costs',
      op: 'insert',
      payload: {
        season_id: seasonId,
        category: 'seeds',
        amount_pesewas: 12345,
        description: 'Queued while offline',
      },
    });
    expect(clientId).toBeTruthy();

    // Still pending — nothing sent yet.
    const pendingBefore = await queueStore.list();
    expect(pendingBefore).toHaveLength(1);

    await flush();

    // Queue drained...
    const pendingAfter = await queueStore.list();
    expect(pendingAfter).toHaveLength(0);

    // ...and the cost genuinely exists in the real database.
    const costs = await costsApi.listCosts(seasonId);
    const match = costs.find((c) => c.amount_pesewas === 12345 && c.description === 'Queued while offline');
    expect(match).toBeDefined();
  });

  it('re-flushing the same client_id again is a no-op, not a duplicate row (the whole point of the client_id column)', async () => {
    await queueStore.clear();
    const before = await costsApi.listCosts(seasonId);

    const payload = {
      season_id: seasonId,
      category: 'labour',
      amount_pesewas: 5000,
      description: 'Idempotency check',
    };
    const clientId = await enqueue({ table: 'season_costs', op: 'insert', payload });
    await flush();

    const afterFirstFlush = await costsApi.listCosts(seasonId);
    expect(afterFirstFlush.length).toBe(before.length + 1);

    // Simulate a retried flush after a connection drop right after the
    // server actually committed the row but before the client saw the
    // success response — re-enqueue the identical payload (same
    // client_id, as queue.ts's own retryFailed()/retryAllFailed() do)
    // and flush again.
    await queueStore.add({
      id: clientId,
      table: 'season_costs',
      op: 'insert',
      payload: { ...payload, client_id: clientId },
      createdAt: Date.now(),
      attempts: 0,
    });
    await flush();

    const afterSecondFlush = await costsApi.listCosts(seasonId);
    expect(afterSecondFlush.length).toBe(afterFirstFlush.length); // no duplicate row
  });
});
