/**
 * Unit tests for mapRegionName() — reconciles the SVG map's region names
 * (from gh.svg's path[name] attributes) with the region names used
 * everywhere else in the app (GHANA_DISTRICTS, farms.region). A silent
 * mismatch here was the suspected root cause class behind Issue #28's
 * unreproduced farm-creation 400 error. Run with `npm test`.
 */
import { describe, it, expect } from 'vitest';
import { mapRegionName } from './GhanaMap';
import { GHANA_DISTRICTS } from '../../lib/districts';

describe('mapRegionName', () => {
  it('maps the SVG\'s "Northern East" to the app\'s "North East"', () => {
    expect(mapRegionName('Northern East')).toBe('North East');
  });

  it('passes through every other region name unchanged', () => {
    expect(mapRegionName('Ashanti')).toBe('Ashanti');
    expect(mapRegionName('Greater Accra')).toBe('Greater Accra');
  });

  it('returns null for a missing or empty region name', () => {
    expect(mapRegionName(null)).toBeNull();
    expect(mapRegionName(undefined)).toBeNull();
    expect(mapRegionName('')).toBeNull();
  });

  it('every mapped region name is a real region in GHANA_DISTRICTS', () => {
    // The set of names the map can ever hand back to the app, after
    // mapRegionName has run, must line up exactly with the districts
    // data used for the district dropdown right below the map.
    const svgRegionNames = [...Object.keys(GHANA_DISTRICTS), 'Northern East'];
    for (const raw of svgRegionNames) {
      const mapped = mapRegionName(raw);
      expect(GHANA_DISTRICTS, `"${raw}" mapped to "${mapped}", which is not a known region`).toHaveProperty(mapped!);
    }
  });
});
