/**
 * Integration tests for the Twi-advice cache reader, against the real
 * database — including the real cache scripts/generate_khaya.ts has now
 * populated for all 8 categories (Development Log Issue #41). Proves
 * both states: a translation being found (the current, real state for
 * every category), and the silent-English-fallback path for a category
 * that doesn't exist. Never calls the Khaya API itself. Run with
 * `npm run test:integration`.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { signUpWithPhone } from '../api/auth';
import { getTwiAdvice } from './khaya';

function randomTestPhone() {
  const digits = Math.floor(1000000 + Math.random() * 9000000).toString();
  return '018' + digits;
}

const ALL_CATEGORIES = ['seeds', 'fertiliser', 'agrochem', 'land_prep', 'labour', 'transport', 'storage', 'other'];

describe('getTwiAdvice() — live integration', () => {
  beforeAll(async () => {
    // advice_rules/advice_translations are readable to any signed-in
    // user (RLS: `to authenticated using (true)`), not an anonymous one.
    const phone = randomTestPhone();
    await signUpWithPhone(phone, 'IntegrationTest123!', 'Khaya Test Farmer');
  });

  it('returns the real cached Twi translation and audio URL for a real category', async () => {
    const result = await getTwiAdvice('fertiliser');
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.text).not.toMatch(/fertiliser/i); // it's genuinely Twi, not the English fallback
    expect(result.audioUrl).toMatch(/^https:\/\/.*\/storage\/v1\/object\/public\/audio\/advice\/fertiliser\/tw\.wav$/);
    // Never auto-set true — only a native speaker flips this by hand.
    expect(result.reviewed).toBe(false);
  });

  it('works for every one of the 8 real categories, each with real text and audio', async () => {
    for (const category of ALL_CATEGORIES) {
      const result = await getTwiAdvice(category);
      expect(result.text.length, `${category} has no cached text`).toBeGreaterThan(0);
      expect(result.audioUrl, `${category} has no cached audio URL`).toBeTruthy();
    }
  });

  it('the cached audio URL is genuinely publicly downloadable', async () => {
    const result = await getTwiAdvice('seeds');
    const res = await fetch(result.audioUrl!);
    expect(res.ok).toBe(true);
    expect(res.headers.get('content-type')).toContain('audio');
  });

  it('returns a sensible empty result for a category that does not exist, instead of throwing', async () => {
    const result = await getTwiAdvice('not_a_real_category');
    expect(result).toEqual({ text: '', audioUrl: null, reviewed: false });
  });
});
