import { supabase } from '../lib/supabase';
export const CATEGORIES = ['seeds', 'fertiliser', 'agrochem', 'land_prep', 'labour', 'transport', 'storage', 'other'] as const;
export type CostCategory = typeof CATEGORIES[number];

export interface CompareSeasonsResult {
  data: any[]; // Recharts format: { category: string, [seasonName]: number }
  excluded: string[]; // List of season names excluded (0 cost)
  seasons: { id: number; name: string }[];
}

export interface SeasonFilterPair {
  year: number;
  season_window: 'major' | 'minor' | 'dry';
}

export interface CropCompareRow {
  cropId: number;
  name: string;
  /** Weighted total cost per acre, pesewas, across every included season of this crop. */
  cost_per_acre: number;
  season_count: number;
  /** Cost per acre, pesewas, broken down by category — for the radar/spider view. */
  categoryBreakdown: Partial<Record<CostCategory, number>>;
}

export interface CompareCropsResult {
  data: CropCompareRow[];
  excluded: string[];
  /** Specific (year, season_window) pairs actually included — omitted (all seasons) unless a filter was applied. */
  seasonFilters?: SeasonFilterPair[];
}

export interface CompareBenchmarkResult {
  data: any[]; // { category: string, actual: number, benchmark: number | null }
  excluded: string[];
}

// 1. Season vs Season
export async function compareSeasons(seasonIds: number[]): Promise<CompareSeasonsResult> {
  if (seasonIds.length === 0) return { data: [], excluded: [], seasons: [] };

  const { data: seasons, error } = await supabase
    .from('seasons')
    .select(`
      id,
      year,
      season_window,
      area_planted_acres,
      crops (name),
      season_costs (category, amount_pesewas)
    `)
    .in('id', seasonIds);

  if (error) throw error;

  const excluded: string[] = [];
  const validSeasons: any[] = [];

  for (const s of seasons) {
    const totalCost = s.season_costs.reduce((sum: number, c: any) => sum + Number(c.amount_pesewas), 0);
    const seasonName = `${(s.crops as any)?.name} ${s.season_window} ${s.year}`;
    if (totalCost === 0) {
      excluded.push(seasonName);
    } else {
      validSeasons.push({ ...s, seasonName });
    }
  }

  validSeasons.sort((a, b) => a.year - b.year);

  // Initialize data array with categories
  const chartData = CATEGORIES.map((cat: string) => {
    const row: any = { category: cat };
    validSeasons.forEach(s => {
      const catCosts = s.season_costs.filter((c: any) => c.category === cat);
      const catTotal = catCosts.reduce((sum: number, c: any) => sum + Number(c.amount_pesewas), 0);
      row[s.seasonName] = Math.round(catTotal / Number(s.area_planted_acres));
    });
    return row;
  });

  return {
    data: chartData,
    excluded,
    seasons: validSeasons.map(s => ({ id: s.id, name: s.seasonName }))
  };
}

// 2. Crop vs Crop
// Always aggregates directly from seasons + season_costs, rather than
// reading the pre-aggregated v_crop_summary view — that view has no
// per-category breakdown (needed for the radar/spider view) and having
// two independent implementations of "the same" aggregation was exactly
// the class of bug Issue #35 in the Development Log found (two functions
// that were both supposed to compute the same figure quietly disagreeing
// by a few pesewas). One code path, always category-complete.
export async function compareCrops(farmId: number, seasonFilters?: SeasonFilterPair[]): Promise<CompareCropsResult> {
  const { data, error } = await supabase
    .from('seasons')
    .select('crop_id, area_planted_acres, year, season_window, crops (name), season_costs (category, amount_pesewas)')
    .eq('farm_id', farmId);

  if (error) throw error;

  const seasons = seasonFilters && seasonFilters.length > 0
    ? data.filter((s: any) => seasonFilters.some((f) => f.year === s.year && f.season_window === s.season_window))
    : data;

  type CropAccumulator = { name: string; totalCost: number; totalArea: number; count: number; categoryTotals: Partial<Record<CostCategory, number>> };
  const byCrop = new Map<number, CropAccumulator>();
  for (const s of seasons) {
    const cropId = s.crop_id as number;
    const name = (s.crops as any)?.name || 'Unknown Crop';
    const area = Number(s.area_planted_acres);
    const costs = (s.season_costs as any[]) || [];
    const totalCost = costs.reduce((sum, c) => sum + Number(c.amount_pesewas), 0);

    const entry: CropAccumulator = byCrop.get(cropId) || { name, totalCost: 0, totalArea: 0, count: 0, categoryTotals: {} };
    entry.totalCost += totalCost;
    entry.totalArea += area;
    entry.count += 1;
    for (const c of costs) {
      const cat = c.category as CostCategory;
      entry.categoryTotals[cat] = (entry.categoryTotals[cat] || 0) + Number(c.amount_pesewas);
    }
    byCrop.set(cropId, entry);
  }

  const excluded: string[] = [];
  const rows: CropCompareRow[] = [];
  for (const [cropId, entry] of byCrop.entries()) {
    if (entry.totalCost === 0) {
      excluded.push(entry.name);
      continue;
    }
    const categoryBreakdown: Partial<Record<CostCategory, number>> = {};
    for (const cat of CATEGORIES) {
      const catTotal = entry.categoryTotals[cat] || 0;
      categoryBreakdown[cat] = entry.totalArea > 0 ? Math.round(catTotal / entry.totalArea) : 0;
    }
    rows.push({
      cropId,
      name: entry.name,
      cost_per_acre: entry.totalArea > 0 ? Math.round(entry.totalCost / entry.totalArea) : 0,
      season_count: entry.count,
      categoryBreakdown,
    });
  }

  rows.sort((a, b) => b.cost_per_acre - a.cost_per_acre);
  return { data: rows, excluded, seasonFilters: seasonFilters && seasonFilters.length > 0 ? seasonFilters : undefined };
}

// 3. Me vs Benchmark
export async function compareToBenchmark(seasonId: number): Promise<CompareBenchmarkResult> {
  // Get season actuals
  const { data: season, error: seasonError } = await supabase
    .from('seasons')
    .select('area_planted_acres, season_costs(category, amount_pesewas)')
    .eq('id', seasonId)
    .single();

  if (seasonError) throw seasonError;

  // Get latest estimate for benchmark
  const { data: estimates, error: estError } = await supabase
    .from('estimates')
    .select('estimate_lines(category, benchmark_pesewas)')
    .eq('season_id', seasonId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (estError) throw estError;

  const area = Number(season.area_planted_acres);
  const estimate = estimates && estimates.length > 0 ? estimates[0] : null;
  const lines = estimate ? estimate.estimate_lines : [];

  const chartData = CATEGORIES.map((cat: string) => {
    // Actual per acre
    const catCosts = season.season_costs.filter((c: any) => c.category === cat);
    const catTotal = catCosts.reduce((sum: number, c: any) => sum + Number(c.amount_pesewas), 0);
    const actualPerAcre = Math.round(catTotal / area);

    // Benchmark per acre
    let benchmarkPerAcre = null;
    if (cat !== 'other') { // 'other' has no benchmark
      const line = lines.find((l: any) => l.category === cat);
      if (line && line.benchmark_pesewas !== null) {
        benchmarkPerAcre = Math.round(Number(line.benchmark_pesewas) / area);
      }
    }

    return {
      category: cat,
      actual: actualPerAcre,
      benchmark: benchmarkPerAcre
    };
  });

  const totalActual = chartData.reduce((sum: number, r: any) => sum + r.actual, 0);
  const excluded = totalActual === 0 ? ['This season has no recorded costs'] : [];

  return {
    data: chartData,
    excluded
  };
}
