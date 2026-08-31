import { supabase } from '../lib/supabase';

// ── Types ──────────────────────────────────────────────────────

/** One line of the v_estimate_report view — one per category. */
export interface ReportLine {
  estimate_id: number;
  season_id: number;
  farm_id: number;
  farm_name: string;
  crop_name: string;
  year: number;
  season_window: 'major' | 'minor' | 'dry';
  area_acres: number;
  method: 'benchmark' | 'history';
  seasons_used: number;
  total_pesewas: number;
  created_at: string;
  category: string;
  estimated_pesewas: number;
  benchmark_pesewas: number | null;
  variance_pct: number | null;
  is_flagged: boolean;
  advice: string | null;
  potential_saving_pesewas: number | null;
}

/** Summary for listing previous estimates (no per-category detail). */
export interface EstimateSummary {
  id: number;
  season_id: number;
  method: 'benchmark' | 'history';
  seasons_used: number;
  area_acres: number;
  total_pesewas: number;
  price_multiplier: number;
  created_at: string;
}

// ── Error handling ─────────────────────────────────────────────

function handleEstimateError(error: any): Error {
  const msg = error.message || String(error);

  if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
    return new Error(
      'Cannot connect to the network. Please check your internet connection and try again.'
    );
  }

  if (msg.toLowerCase().includes('jwt') || msg.toLowerCase().includes('expired') || error.code === 'PGRST301') {
    return new Error('Your session has expired. Any unsaved changes were lost. Please sign in again.');
  }

  if (msg.toLowerCase().includes('not found') || error.code === 'PGRST116') {
    return new Error(
      'This season or estimate was not found, has been deleted, or you do not have permission to view it.'
    );
  }

  // The function is transactional — a failure means nothing was written.
  return new Error(
    'Could not generate the estimate. Nothing was saved, please try again.'
  );
}

// ── API functions ──────────────────────────────────────────────

/**
 * Calls the generate_estimate PL/pgSQL function.
 * Returns the new estimate id.
 * The function is transactional: on failure nothing is written.
 */
export async function generateEstimate(seasonId: number): Promise<number> {
  const { data, error } = await supabase.rpc('generate_estimate', {
    p_season_id: seasonId,
  });

  if (error) {
    throw handleEstimateError(error);
  }

  return data as number;
}

/**
 * Fetches the full report for a single estimate.
 * Returns one ReportLine per category, flagged items first.
 */
export async function getReport(estimateId: number): Promise<ReportLine[]> {
  const { data, error } = await supabase
    .from('v_estimate_report')
    .select('*')
    .eq('estimate_id', estimateId)
    .order('is_flagged', { ascending: false })
    .order('category', { ascending: true });

  if (error) {
    throw handleEstimateError(error);
  }

  return (data ?? []) as ReportLine[];
}

/**
 * Lists all estimates for a season, most recent first (P1).
 */
export async function listEstimates(seasonId: number): Promise<EstimateSummary[]> {
  const { data, error } = await supabase
    .from('estimates')
    .select('id, season_id, method, seasons_used, area_acres, total_pesewas, price_multiplier, created_at')
    .eq('season_id', seasonId)
    .order('created_at', { ascending: false });

  if (error) {
    throw handleEstimateError(error);
  }

  return (data ?? []) as EstimateSummary[];
}

/**
 * Returns the most recent estimate for a season, or null if none exists.
 */
export async function getLatestEstimate(seasonId: number): Promise<EstimateSummary | null> {
  const { data, error } = await supabase
    .from('estimates')
    .select('id, season_id, method, seasons_used, area_acres, total_pesewas, price_multiplier, created_at')
    .eq('season_id', seasonId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw handleEstimateError(error);
  }

  return data as EstimateSummary | null;
}

/**
 * Checks if any benchmark backing a season's crop is still marked as a PLACEHOLDER.
 */
export async function checkProvisionalBenchmarks(seasonId: number): Promise<boolean> {
  const { data: season, error: sErr } = await supabase
    .from('seasons')
    .select('crop_id')
    .eq('id', seasonId)
    .single();

  if (sErr || !season) return false;

  const { data: norms, error: nErr } = await supabase
    .from('crop_input_norms')
    .select('benchmark_id')
    .eq('crop_id', season.crop_id);

  if (nErr || !norms || norms.length === 0) return false;

  const benchmarkIds = norms.map(n => n.benchmark_id);
  const { data: benchmarks, error: bErr } = await supabase
    .from('cost_benchmarks')
    .select('source')
    .in('id', benchmarkIds);

  if (bErr || !benchmarks) return false;

  return benchmarks.some(b => b.source.includes('PLACEHOLDER'));
}
