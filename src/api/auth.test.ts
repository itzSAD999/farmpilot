/**
 * Unit tests for handleAuthError() — the mapping from raw Supabase Auth
 * errors to farmer-facing messages. Pure function, no network needed.
 * Run with `npm test`.
 */
import { describe, it, expect } from 'vitest';
import { handleAuthError } from './auth';

describe('handleAuthError', () => {
  it('maps a network failure to a connectivity message', () => {
    const err = handleAuthError({ message: 'Failed to fetch' });
    expect(err.message).toMatch(/internet connection/i);
  });

  it('maps a network failure phrased as "network error" too', () => {
    const err = handleAuthError({ message: 'NetworkError when attempting to fetch resource' });
    expect(err.message).toMatch(/internet connection/i);
  });

  it('maps a duplicate-registration error to "already registered"', () => {
    const err = handleAuthError({ message: 'User already registered' });
    expect(err.message).toMatch(/already registered/i);
  });

  it('maps a 422 status to "already registered" even with a different message', () => {
    const err = handleAuthError({ message: 'Unprocessable', status: 422 });
    expect(err.message).toMatch(/already registered/i);
  });

  it('maps user_already_exists code to "already registered"', () => {
    const err = handleAuthError({ message: 'conflict', code: 'user_already_exists' });
    expect(err.message).toMatch(/already registered/i);
  });

  it('maps invalid login credentials to a wrong-password message', () => {
    const err = handleAuthError({ message: 'Invalid login credentials' });
    expect(err.message).toMatch(/incorrect/i);
  });

  it('maps a weak-password error to a clear minimum-length message', () => {
    const err = handleAuthError({ message: 'Password should be at least 6 characters' });
    expect(err.message).toMatch(/too weak/i);
  });

  it('falls back to a generic, non-leaking message for anything unrecognised', () => {
    const err = handleAuthError({ message: 'relation "profiles" does not exist' });
    expect(err.message).toMatch(/something went wrong/i);
    expect(err.message).not.toContain('relation');
  });

  it('handles an error object with no message property at all', () => {
    const err = handleAuthError({});
    expect(err).toBeInstanceOf(Error);
    expect(err.message.length).toBeGreaterThan(0);
  });
});
