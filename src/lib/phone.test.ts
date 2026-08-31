import { describe, it, expect } from 'vitest';
import {
  normalisePhone,
  isValidGhanaPhone,
  phoneToSyntheticEmail,
  formatPhoneDisplay,
} from './phone';

describe('phone utilities', () => {
  describe('normalisePhone', () => {
    it('removes spaces', () => {
      expect(normalisePhone('024 123 4567')).toBe('0241234567');
    });

    it('converts +233 prefix to 0', () => {
      expect(normalisePhone('+233241234567')).toBe('0241234567');
    });

    it('converts 233 prefix to 0', () => {
      expect(normalisePhone('233241234567')).toBe('0241234567');
    });

    it('removes dashes', () => {
      expect(normalisePhone('024-123-4567')).toBe('0241234567');
    });

    it('removes brackets', () => {
      expect(normalisePhone('(024) 123-4567')).toBe('0241234567');
    });
  });

  describe('isValidGhanaPhone', () => {
    it('accepts valid 10-digit MTN number', () => {
      expect(isValidGhanaPhone('0241234567')).toBe(true);
    });

    it('accepts valid formatted number', () => {
      expect(isValidGhanaPhone('+233 24 123 4567')).toBe(true);
    });

    it('rejects bad second digit (not 2, 3, or 5)', () => {
      expect(isValidGhanaPhone('0141234567')).toBe(false);
      expect(isValidGhanaPhone('0441234567')).toBe(false);
      expect(isValidGhanaPhone('0641234567')).toBe(false);
    });

    it('rejects too short number', () => {
      expect(isValidGhanaPhone('024123456')).toBe(false);
    });

    it('rejects too long number', () => {
      expect(isValidGhanaPhone('02412345678')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidGhanaPhone('')).toBe(false);
    });

    it('rejects alpha string', () => {
      expect(isValidGhanaPhone('abc')).toBe(false);
    });
  });

  describe('phoneToSyntheticEmail', () => {
    it('derives synthetic email from raw input', () => {
      expect(phoneToSyntheticEmail('0241234567')).toBe('0241234567@farmpilot.local');
    });

    it('derives synthetic email from formatted input', () => {
      expect(phoneToSyntheticEmail('+233 24 123 4567')).toBe('0241234567@farmpilot.local');
    });

    it('produces identical synthetic email for all common input formats', () => {
      const expected = '0241234567@farmpilot.local';
      expect(phoneToSyntheticEmail('0241234567')).toBe(expected);
      expect(phoneToSyntheticEmail('024 123 4567')).toBe(expected);
      expect(phoneToSyntheticEmail('+233241234567')).toBe(expected);
      expect(phoneToSyntheticEmail('233241234567')).toBe(expected);
    });
  });

  describe('formatPhoneDisplay', () => {
    it('formats a 10-digit number', () => {
      expect(formatPhoneDisplay('0241234567')).toBe('024 123 4567');
    });

    it('normalises then formats', () => {
      expect(formatPhoneDisplay('+233241234567')).toBe('024 123 4567');
    });
  });
});
