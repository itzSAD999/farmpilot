/**
 * Integration tests for phone-based sign-up/sign-in, profile fetch,
 * email-linking, and profile updates — against the real, linked
 * Supabase project. Deliberately shares ONE throwaway account across
 * most of these assertions (only the duplicate-signup check needs a
 * second sign-up attempt) rather than creating a fresh account per
 * test — Supabase's own Auth service rate-limits sign-ups per project,
 * and there is no reason to spend that budget testing things (profile
 * fetch, language, name) that don't depend on a fresh account.
 * Run with `npm run test:integration`.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as authApi from './auth';
import { supabase } from '../lib/supabase';

function randomTestPhone() {
  const digits = Math.floor(1000000 + Math.random() * 9000000).toString();
  return '027' + digits;
}

describe('Phone auth — live integration', () => {
  const mainPhone = randomTestPhone();
  const mainPassword = 'IntegrationTest123!';

  beforeAll(async () => {
    await authApi.signUpWithPhone(mainPhone, mainPassword, 'Auth Test Farmer');
  });

  it('creates a matching profile on sign-up', async () => {
    const profile = await authApi.getProfile();
    expect(profile).not.toBeNull();
    expect(profile!.full_name).toBe('Auth Test Farmer');
    expect(profile!.phone).toBe(mainPhone);
    expect(profile!.auth_method).toBe('phone');
  });

  it('rejects a second sign-up with the same phone number', async () => {
    await expect(
      authApi.signUpWithPhone(mainPhone, 'DifferentPass123!', 'Second Farmer')
    ).rejects.toThrow(/already registered/i);
  });

  it('signs back in with the correct password', async () => {
    const { user } = await authApi.signInWithPhone(mainPhone, mainPassword);
    expect(user).toBeTruthy();
  });

  it('rejects sign-in with the wrong password', async () => {
    await expect(
      authApi.signInWithPhone(mainPhone, 'TotallyWrongPassword!')
    ).rejects.toThrow(/incorrect/i);
  });

  it('links a real email address to the phone-based account', async () => {
    const email = `linktest+${Date.now()}@example.com`;
    await authApi.linkEmail(email);

    const profile = await authApi.getProfile();
    expect(profile!.email).toBe(email);
  });

  it('updates the preferred language', async () => {
    await authApi.updateLanguage('tw');
    const profile = await authApi.getProfile();
    expect(profile!.preferred_language).toBe('tw');
  });

  it('updates the profile full name', async () => {
    await authApi.updateProfile({ full_name: 'Updated Name' });
    const profile = await authApi.getProfile();
    expect(profile!.full_name).toBe('Updated Name');
  });

  it('getProfile() returns null once signed out', async () => {
    await supabase.auth.signOut();
    const profile = await authApi.getProfile();
    expect(profile).toBeNull();
  });
});
