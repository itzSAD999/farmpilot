/**
 * Integration tests for notifications — including the database trigger
 * (on_estimate_flag_trigger, migration 004) that writes an "Overspend
 * Alert" notification automatically the moment an estimate line is
 * flagged, with no application code involved. This is exactly the kind
 * of behind-the-scenes logic that is easy to break silently, since
 * nothing in the UI would show a missing notification as an error.
 * Run with `npm run test:integration`.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { signUpWithPhone } from './auth';
import * as farmsApi from './farms';
import * as seasonsApi from './seasons';
import * as cropsApi from './crops';
import * as costsApi from './costs';
import * as estimatesApi from './estimates';
import * as notificationsApi from './notifications';
import { supabase } from '../lib/supabase';

function randomTestPhone() {
  const digits = Math.floor(1000000 + Math.random() * 9000000).toString();
  return '022' + digits;
}

describe('Notifications — live integration', () => {
  let farmId: number;
  let maizeCropId: number;

  beforeAll(async () => {
    const phone = randomTestPhone();
    await signUpWithPhone(phone, 'IntegrationTest123!', 'Notifications Test Farmer');

    const farm = await farmsApi.createFarm({
      name: 'Notifications Test Farm',
      total_area_acres: 3,
      region: 'Eastern',
      district: 'Koforidua',
    });
    farmId = farm.id as number;

    const crops = await cropsApi.getCrops();
    maizeCropId = crops.find((c) => c.name === 'Maize')!.id;
  });

  afterAll(async () => {
    if (farmId) await supabase.from('farms').delete().eq('id', farmId);
  });

  it('flagging a category by generating an estimate automatically creates an "Overspend Alert" notification', async () => {
    const before = await notificationsApi.getNotifications();

    const season = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: maizeCropId,
      year: 2080,
      season_window: 'major',
      area_planted_acres: 1,
    });
    const benchmarkPesewas = await costsApi.getCategoryBenchmarkPesewas(season.id, 'seeds');
    await costsApi.addCost({
      season_id: season.id,
      category: 'seeds',
      amount_pesewas: Math.round(benchmarkPesewas * 2),
      description: 'Deliberately overspent to trigger a notification',
    });
    await estimatesApi.generateEstimate(season.id);

    const after = await notificationsApi.getNotifications();
    expect(after.length).toBeGreaterThan(before.length);

    const alert = after.find((n) => n.title.includes('seeds') && n.type === 'limit_reached');
    expect(alert).toBeDefined();
    expect(alert!.is_read).toBe(false);
  });

  it('a category recorded under benchmark does not create a notification for that category', async () => {
    const season = await seasonsApi.createSeason({
      farm_id: farmId,
      crop_id: maizeCropId,
      year: 2081,
      season_window: 'major',
      area_planted_acres: 1,
    });
    const benchmarkPesewas = await costsApi.getCategoryBenchmarkPesewas(season.id, 'labour');
    await costsApi.addCost({
      season_id: season.id,
      category: 'labour',
      amount_pesewas: Math.round(benchmarkPesewas * 0.5),
    });
    await estimatesApi.generateEstimate(season.id);

    const all = await notificationsApi.getNotifications();
    expect(all.find((n) => n.title.includes('labour'))).toBeUndefined();
  });

  it('markNotificationAsRead() marks exactly one notification read', async () => {
    const all = await notificationsApi.getNotifications();
    const unread = all.find((n) => !n.is_read)!;
    expect(unread).toBeDefined();

    await notificationsApi.markNotificationAsRead(unread.id);

    const refreshed = await notificationsApi.getNotifications();
    expect(refreshed.find((n) => n.id === unread.id)!.is_read).toBe(true);
  });

  it('markAllNotificationsAsRead() clears every remaining unread notification', async () => {
    await notificationsApi.markAllNotificationsAsRead();
    const all = await notificationsApi.getNotifications();
    expect(all.every((n) => n.is_read)).toBe(true);
  });

  it('deleteNotification() removes it from the list', async () => {
    const all = await notificationsApi.getNotifications();
    const target = all[0];
    expect(target).toBeDefined();

    await notificationsApi.deleteNotification(target.id);

    const refreshed = await notificationsApi.getNotifications();
    expect(refreshed.find((n) => n.id === target.id)).toBeUndefined();
  });
});
