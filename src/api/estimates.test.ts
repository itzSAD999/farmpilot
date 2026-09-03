/**
 * Unit tests for handleEstimateError() — the estimate engine's own
 * error-message mapping, including the "nothing was saved" framing that
 * matters because generate_estimate() is transactional. Pure function,
 * no network needed. Run with `npm test`.
 */
import { describe, it, expect } from 'vitest';
import { handleEstimateError } from './estimates';

describe('handleEstimateError', () => {
  it('maps a network failure to a connectivity message', () => {
    const err = handleEstimateError({ message: 'Failed to fetch' });
    expect(err.message).toMatch(/internet connection/i);
  });

  it('maps an expired session to a re-sign-in message that warns of lost changes', () => {
    const err = handleEstimateError({ message: 'JWT expired' });
    expect(err.message).toMatch(/sign in again/i);
    expect(err.message).toMatch(/unsaved changes were lost/i);
  });

  it('maps a not-found / PGRST116 error to a not-found-or-no-permission message', () => {
    const err = handleEstimateError({ code: 'PGRST116', message: 'no rows' });
    expect(err.message).toMatch(/not found|deleted|permission/i);
  });

  it('falls back to a "nothing was saved" message, reflecting that generate_estimate() is transactional', () => {
    const err = handleEstimateError({ message: 'division by zero' });
    expect(err.message).toMatch(/nothing was saved/i);
    expect(err.message).not.toContain('division by zero');
  });
});
