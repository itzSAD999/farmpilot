import { describe, it, expect } from 'vitest';
import { formatCedis, cedisToPesewas, pesewasToCedis } from './money';

describe('money utilities', () => {
  describe('formatCedis', () => {
    it('formats a whole-cedi amount with two decimal places', () => {
      expect(formatCedis(500000)).toBe('GHS 5,000.00');
    });

    it('formats a fractional pesewa amount correctly', () => {
      expect(formatCedis(523456)).toBe('GHS 5,234.56');
    });

    it('formats zero', () => {
      expect(formatCedis(0)).toBe('GHS 0.00');
    });

    it('formats an amount under one cedi', () => {
      expect(formatCedis(50)).toBe('GHS 0.50');
    });
  });

  describe('cedisToPesewas', () => {
    it('converts a clean cedi value', () => {
      expect(cedisToPesewas(52.34)).toBe(5234);
    });

    it('rounds rather than truncates on floating-point drift', () => {
      // 0.1 + 0.2 style drift must not leak into stored pesewas.
      expect(cedisToPesewas(19.99)).toBe(1999);
    });

    it('handles zero', () => {
      expect(cedisToPesewas(0)).toBe(0);
    });
  });

  describe('pesewasToCedis', () => {
    it('converts pesewas back to a cedi number', () => {
      expect(pesewasToCedis(5234)).toBe(52.34);
    });
  });

  describe('round-trip', () => {
    it('cedisToPesewas and pesewasToCedis are inverses for values with cent precision', () => {
      const amounts = [0, 1, 42.5, 1000.75, 9999.99];
      for (const cedis of amounts) {
        expect(pesewasToCedis(cedisToPesewas(cedis))).toBeCloseTo(cedis, 2);
      }
    });
  });
});
