import { supabase } from '../lib/supabase';
import type { CostCategory } from './costs';

/**
 * Crop Category Budgets — the most granular budgeting tier: a cap for
 * one category within one crop, farm-wide across every season of that
 * crop. See migration 024. This is how a farmer actually plans a crop —
 * "for my Maize: Labour GHS 300, Seeds GHS 400" — distinct from Crop
 * Budgets (cropBudgets.ts, one lump total per crop) and Budget by
 * Category (farmBudgets.ts, one lump total per category across every
 * crop).
 */
export interface CropCategoryBudgetStatus {
  id: number;
  farm_id: number;
  crop_id: number;
  crop_name: string;
  category: CostCategory;
  limit_pesewas: number;
  spent_pesewas: number;
  remaining_pesewas: number;
  is_over_budget: boolean;
  pct_used: number | null;
}

export function handleCropCategoryBudgetError(error: any): Error {
  const msg = error.message || String(error);
  if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
    return new Error('Cannot connect to the network. Please check your internet connection and try again.');
  }
  if (error.code === '23505') {
    return new Error('There is already a budget set for this category on this crop — edit it instead of adding a new one.');
  }
  return new Error('An error occurred while saving the budget.');
}

/** Every crop+category budget set on a farm. */
export async function listCropCategoryBudgets(farmId: number): Promise<CropCategoryBudgetStatus[]> {
  const { data, error } = await supabase
    .from('v_crop_category_budget_status')
    .select('*')
    .eq('farm_id', farmId)
    .order('crop_name')
    .order('category');

  if (error) throw handleCropCategoryBudgetError(error);
  return (data || []) as CropCategoryBudgetStatus[];
}

/** Set (or replace) the spending cap for one category within one crop. */
export async function setCropCategoryBudget(farmId: number, cropId: number, category: CostCategory, limitPesewas: number): Promise<void> {
  const { error } = await supabase
    .from('crop_category_budgets')
    .upsert(
      { farm_id: farmId, crop_id: cropId, category, limit_pesewas: limitPesewas, updated_at: new Date().toISOString() },
      { onConflict: 'farm_id,crop_id,category' }
    );

  if (error) throw handleCropCategoryBudgetError(error);
}

/** Remove one category's budget cap from a crop entirely. */
export async function deleteCropCategoryBudget(budgetId: number): Promise<void> {
  const { error } = await supabase.from('crop_category_budgets').delete().eq('id', budgetId);
  if (error) throw handleCropCategoryBudgetError(error);
}
