/**
 * Structural consistency checks for GHANA_DISTRICTS — the region/district
 * data driving farm setup's dropdowns. Ghana has 16 regions; a mismatch
 * here (a region with zero districts, or a duplicate) would silently
 * break the farm-setup form for that region. Run with `npm test`.
 */
import { describe, it, expect } from 'vitest';
import { GHANA_DISTRICTS } from './districts';

describe('GHANA_DISTRICTS', () => {
  it('lists all 16 of Ghana\'s regions', () => {
    expect(Object.keys(GHANA_DISTRICTS)).toHaveLength(16);
  });

  it('gives every region at least one district', () => {
    for (const [region, districts] of Object.entries(GHANA_DISTRICTS)) {
      expect(districts.length, `${region} has no districts`).toBeGreaterThan(0);
    }
  });

  it('has no duplicate district names within a single region', () => {
    for (const [region, districts] of Object.entries(GHANA_DISTRICTS)) {
      const unique = new Set(districts);
      expect(unique.size, `${region} has duplicate district entries`).toBe(districts.length);
    }
  });

  it('has no blank region or district names', () => {
    for (const [region, districts] of Object.entries(GHANA_DISTRICTS)) {
      expect(region.trim().length).toBeGreaterThan(0);
      for (const d of districts) {
        expect(d.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
