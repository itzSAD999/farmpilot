import { supabase } from '../lib/supabase';
export const CATEGORIES = ['seeds', 'fertiliser', 'agrochem', 'land_prep', 'labour', 'transport', 'storage', 'other'] as const;
export type CostCategory = typeof CATEGORIES[number];

export interface CompareSeasonsResult {
  data: any[]; // Recharts format: { category: string, [seasonName]: number }
  excluded: string[]; // List of season names excluded (0 cost)
  seasons: { id: number; name: string }[];
}

export interface CompareCropsResult {
  data: any[]; // { name: string, cost_per_acre: number, season_count: number }
  excluded: string[];
  /** Years actually included in this result — omitted (all years) unless a filter was applied. */
  years?: number[];
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
// Without a year filter this reads the pre-aggregated v_crop_summary view
// (all recorded seasons, any year). With one, it aggregates seasons for
// just those years directly — using the same sum(cost)/sum(area) weighting
// the view uses, so the two paths agree when the filter covers every year.
export async function compareCrops(farmId: number, years?: number[]): Promise<CompareCropsResult> {
  if (!years || years.length === 0) {
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
          cost_per_acre: Number(crop.cost_per_acre_pesewas),
          season_count: Number(crop.season_count),
        });
      }
    }

    chartData.sort((a, b) => b.cost_per_acre - a.cost_per_acre);
    return { data: chartData, excluded };
  }

  const { data, error } = await supabase
    .from('seasons')
    .select('area_planted_acres, crops (name), season_costs (amount_pesewas)')
    .eq('farm_id', farmId)
    .in('year', years);

  if (error) throw error;

  const byCrop = new Map<string, { totalCost: number; totalArea: number; count: number }>();
  for (const s of data) {
    const name = (s.crops as any)?.name || 'Unknown Crop';
    const cost = (s.season_costs as any[]).reduce((sum, c) => sum + Number(c.amount_pesewas), 0);
    const area = Number(s.area_planted_acres);
    const entry = byCrop.get(name) || { totalCost: 0, totalArea: 0, count: 0 };
    entry.totalCost += cost;
    entry.totalArea += area;
    entry.count += 1;
    byCrop.set(name, entry);
  }

  const excluded: string[] = [];
  const chartData: any[] = [];
  for (const [name, { totalCost, totalArea, count }] of byCrop.entries()) {
    if (totalCost === 0) {
      excluded.push(name);
    } else {
      chartData.push({
        name,
        cost_per_acre: totalArea > 0 ? Math.round(totalCost / totalArea) : 0,
        season_count: count,
      });
    }
  }

  chartData.sort((a, b) => b.cost_per_acre - a.cost_per_acre);
  return { data: chartData, excluded, years };
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
