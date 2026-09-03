/**
 * Integration tests for farm CRUD, and — the more important case — that
 * Row Level Security actually enforces data isolation between two
 * different farmers. This is Objective #6 from the report ("a farmer can
 * only ever read or write their own records, using database-level
 * authorisation rather than trusting the client") and, until this suite,
 * had never been checked by anything other than manual sign-in-as-two-
 * accounts testing.
 *
 * Two farmers means two separate Supabase clients (each with its own
 * session), the same as two different browsers — not one client signing
 * in and out, which would be a weaker test of the same thing.
 *
 * Run with `npm run test:integration` (see vitest.integration.config.ts).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { signUpWithPhone } from './auth';
import * as farmsApi from './farms';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function randomTestPhone() {
  const digits = Math.floor(1000000 + Math.random() * 9000000).toString();
  return '027' + digits;
}

describe('Farm CRUD — live integration', () => {
  let farmId: number;
  let userId: string;

  beforeAll(async () => {
    const phone = randomTestPhone();
    const { session } = await signUpWithPhone(phone, 'IntegrationTest123!', 'Farm CRUD Test');
    userId = session!.user.id;
  });

  afterAll(async () => {
    if (farmId) await supabase.from('farms').delete().eq('id', farmId);
  });

  it('creates a farm owned by the signed-in user', async () => {
    const farm = await farmsApi.createFarm({
      name: 'CRUD Test Farm',
      total_area_acres: 4,
      region: 'Volta',
      district: 'Ho',
    });
    farmId = farm.id as number;
    expect(farm.name).toBe('CRUD Test Farm');
    expect(farm.user_id).toBe(userId);
  });

  it('fetches the farm back by user id', async () => {
    const farm = await farmsApi.getFarm(userId);
    expect(farm).not.toBeNull();
    expect(farm!.id).toBe(farmId);
  });

  it('updates the farm and returns the new values', async () => {
    const updated = await farmsApi.updateFarm(userId, farmId, { total_area_acres: 6.5 });
    expect(Number(updated.total_area_acres)).toBe(6.5);
  });

  it('rejects a zero or negative area before any network call', async () => {
    await expect(
      farmsApi.createFarm({ name: 'Bad Farm', total_area_acres: 0, region: 'Volta', district: 'Ho' })
    ).rejects.toThrow(/greater than zero/i);
  });
});

describe('Row Level Security — cross-user isolation', () => {
  // clientA === the shared `supabase` singleton (Farmer A's session,
  // the same client the rest of the app uses). clientB is a second,
  // independent client — Farmer B's own browser, in effect.
  let clientB: SupabaseClient;
  let farmAId: number;
  let userAId: string;
  let originalFarmAName: string;

  beforeAll(async () => {
    const phoneA = randomTestPhone();
    const { session: sessionA } = await signUpWithPhone(phoneA, 'IntegrationTest123!', 'Farmer A');
    userAId = sessionA!.user.id;

    const farmA = await farmsApi.createFarm({
      name: "Farmer A's Private Farm",
      total_area_acres: 3,
      region: 'Ashanti',
      district: 'Kumasi',
    });
    farmAId = farmA.id as number;
    originalFarmAName = farmA.name;

    clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const phoneB = randomTestPhone();
    await clientB.auth.signUp({
      email: `${phoneB}@farmpilot.local`,
      password: 'IntegrationTest123!',
      options: { data: { phone: phoneB, full_name: 'Farmer B', auth_method: 'phone' } },
    });
  });

  afterAll(async () => {
    // Cleanup as Farmer A (clientA / the shared `supabase` client), the
    // only session allowed to delete this row.
    await supabase.from('farms').delete().eq('id', farmAId);
  });

  it("Farmer B's own getFarm(A's user id) call returns nothing", async () => {
    // Even asking directly for Farmer A's user_id, RLS scopes the query
    // to rows Farmer B is allowed to see — which is none of Farmer A's.
    const { data } = await clientB.from('farms').select('*').eq('user_id', userAId).maybeSingle();
    expect(data).toBeNull();
  });

  it("Farmer B cannot read Farmer A's farm by id via a direct query", async () => {
    const { data, error } = await clientB.from('farms').select('*').eq('id', farmAId);
    // RLS silently filters the row out rather than erroring — the correct,
    // information-non-leaking behaviour (not even revealing the row exists).
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("Farmer B cannot update Farmer A's farm", async () => {
    const { data, error } = await clientB
      .from('farms')
      .update({ name: 'Hijacked!' })
      .eq('id', farmAId)
      .select();
    // RLS's `with check` blocks the write; no row matches to update.
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("Farmer B cannot delete Farmer A's farm", async () => {
    await clientB.from('farms').delete().eq('id', farmAId);
    // Prove the delete had no effect by reading the row back as Farmer A.
    const { data } = await supabase.from('farms').select('id').eq('id', farmAId).maybeSingle();
    expect(data).not.toBeNull();
  });

  it("Farmer A's farm still has its original name after all of Farmer B's attempts", async () => {
    const stillMine = await farmsApi.getFarm(userAId);
    expect(stillMine).not.toBeNull();
    expect(stillMine!.name).toBe(originalFarmAName);
  });
});
