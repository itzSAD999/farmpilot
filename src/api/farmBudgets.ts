import { supabase } from '../lib/supabase';
import type { CostCategory } from './costs';

/**
 * Farm Budgets — one overall spending cap for the whole farm, and an
 * optional farm-wide breakdown of that ceiling across the 8 cost
 * categories. See migration 023. This sits above Category Budgets
 * (budgets.ts, per season+category) and Crop Budgets (cropBudgets.ts,
 * per farm+crop) as the top-level "one number for the whole farm" tier.
 */
export interface FarmBudgetStatus {
  id: number;
  farm_id: number;
  limit_pesewas: number;
  spent_pesewas: number;
  remaining_pesewas: number;
  is_over_budget: boolean;
  pct_used: number | null;
}

export interface FarmCategoryBudgetStatus {
  id: number;
  farm_id: number;
  category: CostCategory;
  limit_pesewas: number;
  spent_pesewas: number;
  remaining_pesewas: number;
  is_over_budget: boolean;
  pct_used: number | null;
}

export function handleFarmBudgetError(error: any): Error {
  const msg = error.message || String(error);
  if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
    return new Error('Cannot connect to the network. Please check your internet connection and try again.');
  }
  if (error.code === '23505') {
    return new Error('There is already a budget set for this — edit it instead of adding a new one.');
  }
  return new Error('An error occurred while saving the budget.');
}

/** The farm's single overall spending cap, or null if none has been set. */
export async function getFarmBudget(farmId: number): Promise<FarmBudgetStatus | null> {
  const { data, error } = await supabase
    .from('v_farm_budget_status')
    .select('*')
    .eq('farm_id', farmId)
    .maybeSingle();

  if (error) throw handleFarmBudgetError(error);
  return data as FarmBudgetStatus | null;
}

/** Set (or replace) the farm's single overall spending cap. */
export async function setFarmBudget(farmId: number, limitPesewas: number): Promise<void> {
  const { error } = await supabase
    .from('farm_budgets')
    .upsert(
      { farm_id: farmId, limit_pesewas: limitPesewas, updated_at: new Date().toISOString() },
      { onConflict: 'farm_id' }
    );

  if (error) throw handleFarmBudgetError(error);
}

/** Remove the farm's overall budget entirely. */
export async function deleteFarmBudget(budgetId: number): Promise<void> {
  const { error } = await supabase.from('farm_budgets').delete().eq('id', budgetId);
  if (error) throw handleFarmBudgetError(error);
}

/** How the farm's overall budget has been assigned across categories, farm-wide (not tied to one season). */
export async function listFarmCategoryBudgets(farmId: number): Promise<FarmCategoryBudgetStatus[]> {
  const { data, error } = await supabase
    .from('v_farm_category_budget_status')
    .select('*')
    .eq('farm_id', farmId)
    .order('category');

  if (error) throw handleFarmBudgetError(error);
  return (data || []) as FarmCategoryBudgetStatus[];
}

/** Assign (or replace) part of the farm's overall budget to one category, farm-wide. */
export async function setFarmCategoryBudget(farmId: number, category: CostCategory, limitPesewas: number): Promise<void> {
  const { error } = await supabase
    .from('farm_category_budgets')
    .upsert(
      { farm_id: farmId, category, limit_pesewas: limitPesewas, updated_at: new Date().toISOString() },
      { onConflict: 'farm_id,category' }
    );

  if (error) throw handleFarmBudgetError(error);
}

/** Remove one category's assignment from the farm's overall budget. */
export async function deleteFarmCategoryBudget(budgetId: number): Promise<void> {
  const { error } = await supabase.from('farm_category_budgets').delete().eq('id', budgetId);
  if (error) throw handleFarmBudgetError(error);
}
