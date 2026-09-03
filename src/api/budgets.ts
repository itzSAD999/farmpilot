import { supabase } from '../lib/supabase';
import type { CostCategory } from './costs';

export interface CategoryBudgetStatus {
  id: number;
  season_id: number;
  category: CostCategory;
  limit_pesewas: number;
  spent_pesewas: number;
  remaining_pesewas: number;
  is_over_budget: boolean;
  pct_used: number | null;
}

export function handleBudgetError(error: any): Error {
  const msg = error.message || String(error);
  if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
    return new Error('Cannot connect to the network. Please check your internet connection and try again.');
  }
  if (error.code === '23505') {
    return new Error('There is already a budget set for this category — edit it instead of adding a new one.');
  }
  return new Error('An error occurred while saving the budget.');
}

/** All budgets set for a season, joined with what's actually been spent so far. */
export async function listBudgetsForSeason(seasonId: number): Promise<CategoryBudgetStatus[]> {
  const { data, error } = await supabase
    .from('v_category_budget_status')
    .select('*')
    .eq('season_id', seasonId)
    .order('category');

  if (error) throw handleBudgetError(error);
  return (data || []) as CategoryBudgetStatus[];
}

/** Set (or replace) the spending cap for one category in one season. */
export async function setCategoryBudget(seasonId: number, category: CostCategory, limitPesewas: number): Promise<void> {
  const { error } = await supabase
    .from('category_budgets')
    .upsert(
      { season_id: seasonId, category, limit_pesewas: limitPesewas, updated_at: new Date().toISOString() },
      { onConflict: 'season_id,category' }
    );

  if (error) throw handleBudgetError(error);
}

/** Remove a category's budget cap entirely. */
export async function deleteCategoryBudget(budgetId: number): Promise<void> {
  const { error } = await supabase
    .from('category_budgets')
    .delete()
    .eq('id', budgetId);

  if (error) throw handleBudgetError(error);
}
