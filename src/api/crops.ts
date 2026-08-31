import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

export type Crop = Database['public']['Tables']['crops']['Row'];

/**
 * Fetch all available crops for dropdowns.
 */
export async function getCrops(): Promise<Crop[]> {
  const { data, error } = await supabase
    .from('crops')
    .select('*')
    .order('name');

  if (error) {
    throw new Error('Failed to load crops: ' + error.message);
  }

  return data;
}
