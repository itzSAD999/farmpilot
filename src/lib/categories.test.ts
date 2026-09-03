import { describe, it, expect } from 'vitest';
import { CATEGORIES, ESSENTIAL_CATEGORIES } from './categories';

describe('categories', () => {
  it('every category config is internally consistent (its own id matches its key)', () => {
    for (const [key, config] of Object.entries(CATEGORIES)) {
      expect(config.id).toBe(key);
      expect(config.label.length).toBeGreaterThan(0);
      expect(config.description.length).toBeGreaterThan(0);
    }
  });

  it("'other' is the only category with no fixed unit list (free text)", () => {
    for (const [key, config] of Object.entries(CATEGORIES)) {
      if (key === 'other') {
        expect(config.units).toEqual([]);
      } else {
        expect(config.units.length).toBeGreaterThan(0);
      }
    }
  });

  it('ESSENTIAL_CATEGORIES only references real category keys', () => {
    for (const cat of ESSENTIAL_CATEGORIES) {
      expect(CATEGORIES).toHaveProperty(cat);
    }
  });

  it('ESSENTIAL_CATEGORIES has no duplicates', () => {
    expect(new Set(ESSENTIAL_CATEGORIES).size).toBe(ESSENTIAL_CATEGORIES.length);
  });

  it("'other' is never in the essentials checklist (it has no benchmark to compare against)", () => {
    expect(ESSENTIAL_CATEGORIES).not.toContain('other');
  });
});
