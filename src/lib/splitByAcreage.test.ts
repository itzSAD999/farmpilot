import { describe, it, expect } from 'vitest';
import { splitByAcreage } from './splitByAcreage';

describe('splitByAcreage', () => {
  it('splits proportionally to acreage, not evenly', () => {
    // A 1-acre and a 5-acre season sharing GHS 600 (60000 pesewas): the
    // 5-acre season should get 5x the 1-acre season's share.
    const result = splitByAcreage(60000, [1, 5]);
    expect(result).toEqual([10000, 50000]);
  });

  it('matches the documented worked example: 1 and 5 acres sharing GHS 600', () => {
    // From the Development Log's Issue #16 evidence: for two seasons of
    // 1 and 5 acres sharing a GHS 600 entry, the split is 100/500, not
    // the old 300/300 even split.
    const result = splitByAcreage(60000, [1, 5]);
    expect(result[0] / 100).toBe(100);
    expect(result[1] / 100).toBe(500);
  });

  it('always sums to exactly the total, even when shares round unevenly', () => {
    // 3 seasons splitting an amount that does not divide cleanly by their
    // area ratio — rounding must not silently lose or invent a pesewa.
    const total = 10000; // GHS 100.00
    const result = splitByAcreage(total, [1, 1, 1]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(total);
  });

  it('corrects rounding drift onto the largest share', () => {
    const total = 100; // 100 pesewas across 3 unequal areas
    const areas = [1, 2, 7];
    const result = splitByAcreage(total, areas);
    expect(result.reduce((a, b) => a + b, 0)).toBe(total);
    // The largest area (7, index 2) should have absorbed the rounding
    // correction, not the smallest.
    const exactShares = areas.map((a) => (a / 10) * total);
    const roundedBeforeCorrection = exactShares.map(Math.round);
    const drift = total - roundedBeforeCorrection.reduce((a, b) => a + b, 0);
    if (drift !== 0) {
      expect(result[2]).toBe(roundedBeforeCorrection[2] + drift);
    }
  });

  it('falls back to an even split when every area is zero', () => {
    const result = splitByAcreage(9000, [0, 0, 0]);
    expect(result).toEqual([3000, 3000, 3000]);
  });

  it('gives 100% to a single season', () => {
    const result = splitByAcreage(5000, [2.5]);
    expect(result).toEqual([5000]);
  });

  it('returns an empty array for no seasons', () => {
    expect(splitByAcreage(5000, [])).toEqual([]);
  });

  it('handles a season with zero acreage alongside a nonzero one (gets nothing)', () => {
    const result = splitByAcreage(10000, [0, 4]);
    expect(result).toEqual([0, 10000]);
  });
});
