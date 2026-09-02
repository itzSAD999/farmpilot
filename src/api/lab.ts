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

export interface CropBenchmarkInputLine {
  category: CostCategory;
  input_name: string;
  unit: string;
  quantity_per_acre: number;
  /** quantity_per_acre x acreage — the real-world amount (person-days, bags, litres...) at this acreage. */
  quantity_total: number;
  unit_price_pesewas: number;
}

/**
 * Per-input breakdown (e.g. "20 person-days of labour at GHS 90/day")
 * behind the Lab's category totals — lets the sandbox be driven by a
 * real-world quantity ("how many person-days") rather than an abstract
 * cedi amount, with the cost computed from quantity x rate like the
 * app's own "I know the rate" cost-entry mode.
 */
export async function getCropBenchmarkLines(
  cropId: number,
  seasonWindow: 'major' | 'minor' | 'dry',
  areaAcres: number
): Promise<CropBenchmarkInputLine[]> {
  const { data, error } = await supabase.rpc('get_crop_benchmark_lines', {
    p_crop_id: cropId,
    p_season_window: seasonWindow,
    p_area_acres: areaAcres,
  });

  if (error) {
    throw new Error('Failed to load benchmark line items: ' + error.message);
  }

  return (data as any[]).map((row) => ({
    ...row,
    quantity_per_acre: Number(row.quantity_per_acre),
    quantity_total: Number(row.quantity_total),
  }));
}
