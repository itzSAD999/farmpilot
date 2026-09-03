/**
 * Unit tests for handleFarmBudgetError() — Farm Budgets' error-message
 * mapping. Pure function, no network needed. Run with `npm test`.
 */
import { describe, it, expect } from 'vitest';
import { handleFarmBudgetError } from './farmBudgets';

describe('handleFarmBudgetError', () => {
  it('maps a network failure to a connectivity message', () => {
    const err = handleFarmBudgetError({ message: 'Failed to fetch' });
    expect(err.message).toMatch(/internet connection/i);
  });

  it('maps a unique-constraint violation (23505) to a duplicate-budget message', () => {
    const err = handleFarmBudgetError({ code: '23505', message: 'duplicate key value' });
    expect(err.message).toMatch(/already a budget/i);
  });

  it('falls back to a generic save-failure message for anything else', () => {
    const err = handleFarmBudgetError({ message: 'permission denied for table farm_budgets' });
    expect(err.message).toMatch(/error occurred while saving/i);
    expect(err.message).not.toContain('permission denied');
  });
});
