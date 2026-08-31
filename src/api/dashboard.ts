import { supabase } from '../lib/supabase';

export interface FarmSummary {
  farm_id: number;
  user_id: string;
  farm_name: string;
  total_area_acres: number;
  season_count: number;
  crop_count: number;
  completed_seasons: number;
  total_planted_acres: number;
  total_recorded_pesewas: number;
  total_estimated_pesewas: number;
  total_possible_saving_pesewas: number;
}

export interface CropSummary {
  farm_id: number;
  user_id: string;
  crop_id: number;
  crop_name: string;
  season_count: number;
  total_acres: number;
  total_recorded_pesewas: number;
  cost_per_acre_pesewas: number | null;
}

export async function getFarmSummary(farmId: number): Promise<FarmSummary> {
  const { data, error } = await supabase
    .from('v_farm_summary')
    .select('*')
    .eq('farm_id', farmId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Farm summary not found');
  
  return data as unknown as FarmSummary;
}

export async function getCropSummary(farmId: number): Promise<CropSummary[]> {
  const { data, error } = await supabase
    .from('v_crop_summary')
    .select('*')
    .eq('farm_id', farmId);

  if (error) throw error;
  
  return data as unknown as CropSummary[];
}
