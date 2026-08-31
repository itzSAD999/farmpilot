import { supabase } from '../lib/supabase';
export const CATEGORIES = ['seeds', 'fertiliser', 'agrochem', 'land_prep', 'labour', 'transport', 'storage', 'other'] as const;
export type CostCategory = typeof CATEGORIES[number];

export interface CompareSeasonsResult {
  data: any[]; // Recharts format: { category: string, [seasonName]: number }
  excluded: string[]; // List of season names excluded (0 cost)
  seasons: { id: number; name: string }[];
}

export interface CompareCropsResult {
  data: any[]; // { name: string, cost_per_acre: number }
  excluded: string[];
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
export async function compareCrops(farmId: number): Promise<CompareCropsResult> {
  const { data, error } = await supabase
    .from('v_crop_summary')
    .select('*')
    .eq('farm_id', farmId);

  if (error) throw error;

  const excluded: string[] = [];
  const chartData: any[] = [];

  for (const crop of data) {
    if (Number(crop.total_recorded_pesewas) === 0) {
      excluded.push(crop.crop_name);
    } else {
      chartData.push({
        name: crop.crop_name,
        cost_per_acre: Number(crop.cost_per_acre_pesewas)
      });
    }
  }

  // Sort descending by cost per acre
  chartData.sort((a, b) => b.cost_per_acre - a.cost_per_acre);

  return { data: chartData, excluded };
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
