/**
 * Unit tests for handleCropCategoryBudgetError() — Crop Category
 * Budgets' error-message mapping. Pure function, no network needed.
 * Run with `npm test`.
 */
import { describe, it, expect } from 'vitest';
import { handleCropCategoryBudgetError } from './cropCategoryBudgets';

describe('handleCropCategoryBudgetError', () => {
  it('maps a network failure to a connectivity message', () => {
    const err = handleCropCategoryBudgetError({ message: 'Failed to fetch' });
    expect(err.message).toMatch(/internet connection/i);
  });

  it('maps a unique-constraint violation (23505) to a duplicate-budget message', () => {
    const err = handleCropCategoryBudgetError({ code: '23505', message: 'duplicate key value' });
    expect(err.message).toMatch(/already a budget/i);
  });

  it('falls back to a generic save-failure message for anything else', () => {
    const err = handleCropCategoryBudgetError({ message: 'permission denied for table crop_category_budgets' });
    expect(err.message).toMatch(/error occurred while saving/i);
    expect(err.message).not.toContain('permission denied');
  });
});
