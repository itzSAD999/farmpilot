import { supabase } from '../lib/supabase';

/** List all crops (reference data). */
export async function listCrops() {
  const { data, error } = await supabase
    .from('crops')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

/** Get the cost category labels. */
export function listCategories() {
  return [
    { value: 'seeds', label: 'Seeds' },
    { value: 'fertiliser', label: 'Fertiliser' },
    { value: 'agrochem', label: 'Agrochemicals' },
    { value: 'land_prep', label: 'Land Preparation' },
    { value: 'labour', label: 'Labour' },
    { value: 'transport', label: 'Transport' },
    { value: 'storage', label: 'Storage' },
    { value: 'other', label: 'Other' },
  ] as const;
}
