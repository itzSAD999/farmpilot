import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

export type CostCategory = Database['public']['Enums']['cost_category'];

export interface CostItem {
  id: number;
  season_id: number;
  category: CostCategory;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  unit_cost_pesewas: number | null;
  amount_pesewas: number;
  date_incurred: string | null;
  created_at: string;
}

export interface AddCostInput {
  season_id: number;
  category: CostCategory;
  description?: string;
  quantity?: number;
  unit?: string;
  unit_cost_pesewas?: number;
  amount_pesewas: number;
  date_incurred?: string;
}

function handleCostError(error: any): Error {
  const msg = error.message || String(error);

  if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
    return new Error('Cannot connect to the network. Please check your internet connection and try again.');
  }

  if (msg.toLowerCase().includes('jwt') || msg.toLowerCase().includes('expired') || error.code === 'PGRST301') {
    return new Error('Your session has expired. Any unsaved changes were lost. Please sign in again.');
  }

  if (msg.toLowerCase().includes('not found') || error.code === 'PGRST116') {
     return new Error('This cost item was not found, has been deleted, or you do not have permission to view it.');
  }

  return new Error('An error occurred while saving the cost item. Please try again.');
}

/** List all cost items for a season, ordered by category, then created_at. */
export async function listCosts(seasonId: number): Promise<CostItem[]> {
  const { data, error } = await supabase
    .from('season_costs')
    .select('*')
    .eq('season_id', seasonId)
    .order('category', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw handleCostError(error);
  return data;
}

/** Add a cost item to a season. */
export async function addCost(cost: AddCostInput): Promise<CostItem> {
  const { data, error } = await supabase
    .from('season_costs')
    .insert(cost)
    .select()
    .single();
  if (error) throw handleCostError(error);
  return data;
}

/** Update an existing cost item. */
export async function updateCost(id: number, input: Partial<AddCostInput>): Promise<CostItem> {
  const { data, error } = await supabase
    .from('season_costs')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw handleCostError(error);
  return data;
}

/** Delete a cost item. */
export async function deleteCost(id: number): Promise<void> {
  const { error } = await supabase
    .from('season_costs')
    .delete()
    .eq('id', id);
  if (error) throw handleCostError(error);
}

/** Get the total cost in pesewas for a season. */
export async function getSeasonTotalPesewas(seasonId: number): Promise<number> {
  const { data, error } = await supabase
    .from('season_costs')
    .select('amount_pesewas')
    .eq('season_id', seasonId);
  
  if (error) throw handleCostError(error);
  
  return data.reduce((total, cost) => total + cost.amount_pesewas, 0);
}

/** Auto-fills costs with expected categories and benchmark averages if available */
export async function quickFillCosts(seasonId: number): Promise<void> {
  const { error } = await supabase.rpc('quick_fill_costs', { p_season_id: seasonId });
  if (error) throw handleCostError(error);
}

export async function getExpectedCategoriesForCrop(cropId: number): Promise<CostCategory[]> {
  const { data, error } = await supabase
    .from('crop_input_norms')
    .select('category')
    .eq('crop_id', cropId);
  if (error) throw handleCostError(error);
  return Array.from(new Set(data.map(d => d.category as CostCategory)));
}

/**
 * Fetch detailed cost history for all seasons of a farm, to provide context to the AI.
 */
export async function getDetailedCostsForFarm(farmId: number) {
  const { data, error } = await supabase
    .from('seasons')
    .select(`
      id,
      year,
      season_window,
      is_complete,
      crops ( name ),
      season_costs (
        category,
        amount_pesewas,
        description
      )
    `)
    .eq('farm_id', farmId);

  if (error) throw handleCostError(error);
  
  return data.map((season: any) => ({
    seasonId: season.id,
    cropName: season.crops?.name || 'Unknown Crop',
    year: season.year,
    seasonWindow: season.season_window,
    isComplete: season.is_complete,
    costs: season.season_costs || [],
  }));
}
