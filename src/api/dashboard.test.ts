/**
 * Unit tests for handleDashboardError() — the dashboard views' error
 * mapping, including the expired-session case. Pure function, no
 * network needed. Run with `npm test`.
 */
import { describe, it, expect } from 'vitest';
import { handleDashboardError } from './dashboard';

describe('handleDashboardError', () => {
  it('maps a network failure to a connectivity message', () => {
    const err = handleDashboardError({ message: 'Failed to fetch' });
    expect(err.message).toMatch(/internet connection/i);
  });

  it('maps an expired-JWT message to a re-sign-in message', () => {
    const err = handleDashboardError({ message: 'JWT expired' });
    expect(err.message).toMatch(/sign in again/i);
  });

  it('maps a PGRST301 code to a re-sign-in message even with a different wording', () => {
    const err = handleDashboardError({ message: 'unauthorized', code: 'PGRST301' });
    expect(err.message).toMatch(/sign in again/i);
  });

  it('falls back to a generic load-failure message for anything else', () => {
    const err = handleDashboardError({ message: 'relation v_farm_summary does not exist' });
    expect(err.message).toMatch(/could not load dashboard/i);
    expect(err.message).not.toContain('relation');
  });
});
