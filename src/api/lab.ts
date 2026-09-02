import { supabase } from '../lib/supabase';
import type { CostCategory } from './costs';

export interface CropBenchmarkLine {
  category: CostCategory;
  benchmark_pesewas: number;
}

/**
 * Real per-acre benchmark figures for a crop/season-window/area combination,
 * with no season required — the Lab feature's "what would this normally
 * cost" starting point, using the exact same norms x price math the real
 * estimate engine uses (see get_category_benchmark_pesewas in migration
 * 011 and generate_estimate() in migration 010/the live function).
 */
export async function getCropBenchmarkBreakdown(
  cropId: number,
  seasonWindow: 'major' | 'minor' | 'dry',
  areaAcres: number
): Promise<CropBenchmarkLine[]> {
  const { data, error } = await supabase.rpc('get_crop_benchmark_breakdown', {
    p_crop_id: cropId,
    p_season_window: seasonWindow,
    p_area_acres: areaAcres,
  });

  if (error) {
    throw new Error('Failed to load benchmark figures: ' + error.message);
  }

  return data as CropBenchmarkLine[];
}
