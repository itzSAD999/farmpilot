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

/** List all cost items for a season, ordered by category, then created_at. */
export async function listCosts(seasonId: number): Promise<CostItem[]> {
  const { data, error } = await supabase
    .from('season_costs')
    .select('*')
    .eq('season_id', seasonId)
    .order('category', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Add a cost item to a season. */
export async function addCost(cost: AddCostInput): Promise<CostItem> {
  const { data, error } = await supabase
    .from('season_costs')
    .insert(cost)
    .select()
    .single();
  if (error) throw error;
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
  if (error) throw error;
  return data;
}

/** Delete a cost item. */
export async function deleteCost(id: number): Promise<void> {
  const { error } = await supabase
    .from('season_costs')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/** Get the total cost in pesewas for a season. */
export async function getSeasonTotalPesewas(seasonId: number): Promise<number> {
  const { data, error } = await supabase
    .from('season_costs')
    .select('amount_pesewas')
    .eq('season_id', seasonId);
  
  if (error) throw error;
  
  return data.reduce((total, cost) => total + cost.amount_pesewas, 0);
}
