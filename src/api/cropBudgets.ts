import { supabase } from '../lib/supabase';

/**
 * Crop Budgets — a farmer-set spending cap for a crop as a whole, across
 * every season of that crop on the farm. See migration 022. Deliberately
 * separate from Category Budgets (budgets.ts), which cap one category
 * within one season instead.
 */
export interface CropBudgetStatus {
  id: number;
  farm_id: number;
  crop_id: number;
  crop_name: string;
  limit_pesewas: number;
  spent_pesewas: number;
  remaining_pesewas: number;
  is_over_budget: boolean;
  pct_used: number | null;
}

export function handleCropBudgetError(error: any): Error {
  const msg = error.message || String(error);
  if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
    return new Error('Cannot connect to the network. Please check your internet connection and try again.');
  }
  if (error.code === '23505') {
    return new Error('There is already a budget set for this crop — edit it instead of adding a new one.');
  }
  return new Error('An error occurred while saving the crop budget.');
}

/** Every crop budget set on a farm, joined with what's actually been spent so far. */
export async function listCropBudgets(farmId: number): Promise<CropBudgetStatus[]> {
  const { data, error } = await supabase
    .from('v_crop_budget_status')
    .select('*')
    .eq('farm_id', farmId)
    .order('crop_name');

  if (error) throw handleCropBudgetError(error);
  return (data || []) as CropBudgetStatus[];
}

/** Set (or replace) the spending cap for one crop on a farm. */
export async function setCropBudget(farmId: number, cropId: number, limitPesewas: number): Promise<void> {
  const { error } = await supabase
    .from('crop_budgets')
    .upsert(
      { farm_id: farmId, crop_id: cropId, limit_pesewas: limitPesewas, updated_at: new Date().toISOString() },
      { onConflict: 'farm_id,crop_id' }
    );

  if (error) throw handleCropBudgetError(error);
}

/** Remove a crop's budget cap entirely. */
export async function deleteCropBudget(budgetId: number): Promise<void> {
  const { error } = await supabase
    .from('crop_budgets')
    .delete()
    .eq('id', budgetId);

  if (error) throw handleCropBudgetError(error);
}
