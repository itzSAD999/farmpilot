import { supabase } from '../lib/supabase';

export interface Season {
  id: number;
  farm_id: number;
  crop_id: number;
  year: number;
  season_window: 'major' | 'minor' | 'dry';
  area_planted_acres: number;
  harvest_qty: number | null;
  harvest_unit: string | null;
  revenue_pesewas: number | null;
  is_complete: boolean;
  created_at: string;
}

export interface SeasonSummary {
  id: number;
  farm_id: number;
  crop_id: number;
  crop_name: string;
  year: number;
  season_window: 'major' | 'minor' | 'dry';
  area_planted_acres: number;
  is_complete: boolean;
  total_cost_pesewas: number;
  has_estimate: boolean;
}

export interface SeasonDetail extends Season {
  crop_name: string;
}

export interface CreateSeasonInput {
  farm_id: number;
  crop_id: number;
  year: number;
  season_window: 'major' | 'minor' | 'dry';
  area_planted_acres: number;
}

export interface SeasonsFilter {
  search?: string;
  cropIds?: number[];
  years?: number[];
  windows?: ('major' | 'minor' | 'dry')[];
  status?: 'recording' | 'complete';
  sortBy?: 'year' | 'cost_per_acre' | 'total_spent' | 'area';
  sortDir?: 'asc' | 'desc';
}

export interface SeasonFiltered {
  id: number;
  crop_name: string;
  year: number;
  season_window: 'major' | 'minor' | 'dry';
  area_planted_acres: number;
  total_recorded_pesewas: number;
  cost_per_acre_pesewas: number;
  latest_estimate_total: number | null;
  has_flagged_categories: boolean;
  is_complete: boolean;
}

function handleSeasonError(error: any): Error {
  const msg = error.message || String(error);

  if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
    return new Error('Cannot connect to the network. Please check your internet connection and try again.');
  }

  if (msg.toLowerCase().includes('jwt') || msg.toLowerCase().includes('expired') || error.code === 'PGRST301') {
    return new Error('Your session has expired. Any unsaved changes were lost. Please sign in again.');
  }

  if (msg.toLowerCase().includes('not found') || error.code === 'PGRST116') {
     return new Error('This season was not found, has been deleted, or you do not have permission to view it.');
  }

  if (error.code === '23505' || msg.includes('unique constraint') || msg.includes('seasons_farm_id_crop_id_year_season_window_key')) {
    return new Error('You already have a season for this crop in that window. Open it instead.');
  }

  return new Error('An error occurred while saving the season.');
}

/**
 * List all seasons for a given farm, aggregating total cost and joining crop name in one round trip.
 */
export async function listSeasons(farmId: number): Promise<SeasonSummary[]> {
  const { data, error } = await supabase
    .from('seasons')
    .select(`
      id,
      farm_id,
      crop_id,
      year,
      season_window,
      area_planted_acres,
      is_complete,
      crops ( name ),
      season_costs ( amount_pesewas ),
      estimates ( id )
    `)
    .eq('farm_id', farmId)
    .order('is_complete', { ascending: true }) // incomplete (false) first
    .order('year', { ascending: false })       // then year desc
    .order('season_window', { ascending: true }); // then window

  if (error) {
    throw handleSeasonError(error);
  }

  // Transform the response to match SeasonSummary and calculate the total cost client-side
  // from the nested relation, avoiding N+1 queries.
  return data.map((row: any) => {
    const total_cost = row.season_costs.reduce((sum: number, cost: any) => sum + (cost.amount_pesewas || 0), 0);
    const has_estimate = Array.isArray(row.estimates) ? row.estimates.length > 0 : !!row.estimates;
    
    return {
      id: row.id,
      farm_id: row.farm_id,
      crop_id: row.crop_id,
      crop_name: row.crops?.name || 'Unknown Crop',
      year: row.year,
      season_window: row.season_window,
      area_planted_acres: row.area_planted_acres,
      is_complete: row.is_complete,
      total_cost_pesewas: total_cost,
      has_estimate,
    };
  });
}

/**
 * List seasons filtered, sorted, and computed for the dedicated Seasons page.
 * Uses a single query.
 */
export async function listSeasonsFiltered(farmId: number, filters: SeasonsFilter): Promise<SeasonFiltered[]> {
  let query = supabase
    .from('seasons')
    .select(`
      id,
      year,
      season_window,
      area_planted_acres,
      is_complete,
      crops!inner ( name ),
      season_costs ( amount_pesewas ),
      estimates ( 
        total_pesewas, 
        created_at,
        estimate_lines ( is_flagged ) 
      )
    `)
    .eq('farm_id', farmId);

  // Apply DB-level filters where possible to reduce payload
  if (filters.cropIds && filters.cropIds.length > 0) {
    query = query.in('crop_id', filters.cropIds);
  }
  if (filters.years && filters.years.length > 0) {
    query = query.in('year', filters.years);
  }
  if (filters.windows && filters.windows.length > 0) {
    query = query.in('season_window', filters.windows);
  }
  if (filters.status) {
    query = query.eq('is_complete', filters.status === 'complete');
  }

  const { data, error } = await query;
  if (error) {
    throw handleSeasonError(error);
  }

  let mapped: SeasonFiltered[] = data.map((row: any) => {
    const crop_name = row.crops?.name || 'Unknown Crop';
    const total_recorded_pesewas = row.season_costs.reduce((sum: number, cost: any) => sum + (cost.amount_pesewas || 0), 0);
    const cost_per_acre_pesewas = row.area_planted_acres > 0 ? Math.round(total_recorded_pesewas / row.area_planted_acres) : 0;
    
    // Get latest estimate
    let latestEstimate = null;
    let has_flagged_categories = false;
    
    if (row.estimates && row.estimates.length > 0) {
      // Sort estimates by created_at desc
      const sortedEstimates = [...row.estimates].sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      latestEstimate = sortedEstimates[0];
      
      if (latestEstimate.estimate_lines && latestEstimate.estimate_lines.length > 0) {
        has_flagged_categories = latestEstimate.estimate_lines.some((line: any) => line.is_flagged === true);
      }
    }

    return {
      id: row.id,
      crop_name,
      year: row.year,
      season_window: row.season_window,
      area_planted_acres: row.area_planted_acres,
      total_recorded_pesewas,
      cost_per_acre_pesewas,
      latest_estimate_total: latestEstimate ? latestEstimate.total_pesewas : null,
      has_flagged_categories,
      is_complete: row.is_complete
    };
  });

  // Apply JS-level filters (search)
  if (filters.search) {
    const q = filters.search.toLowerCase().trim();
    mapped = mapped.filter(season => {
      const label = `${season.season_window} ${season.year}`.toLowerCase();
      return season.crop_name.toLowerCase().includes(q) || label.includes(q);
    });
  }

  // Apply JS-level sorting
  mapped.sort((a, b) => {
    let valA: any = a.year;
    let valB: any = b.year;

    if (filters.sortBy === 'cost_per_acre') {
      valA = a.cost_per_acre_pesewas;
      valB = b.cost_per_acre_pesewas;
    } else if (filters.sortBy === 'total_spent') {
      valA = a.total_recorded_pesewas;
      valB = b.total_recorded_pesewas;
    } else if (filters.sortBy === 'area') {
      valA = a.area_planted_acres;
      valB = b.area_planted_acres;
    }

    if (valA === valB) {
      // Secondary sort by ID desc
      return b.id - a.id;
    }

    if (filters.sortDir === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      // default desc
      return valA < valB ? 1 : -1;
    }
  });

  return mapped;
}

/**
 * Fetch available crops and years for a farm to populate filter dropdowns.
 */
export async function getSeasonFilterOptions(farmId: number) {
  const { data, error } = await supabase
    .from('seasons')
    .select(`
      crop_id,
      year,
      crops!inner ( name )
    `)
    .eq('farm_id', farmId);

  if (error) {
    throw handleSeasonError(error);
  }

  const cropsMap = new Map<number, string>();
  const yearsSet = new Set<number>();

  data.forEach((row: any) => {
    if (row.crop_id && row.crops?.name) {
      cropsMap.set(row.crop_id, row.crops.name);
    }
    if (row.year) {
      yearsSet.add(row.year);
    }
  });

  return {
    crops: Array.from(cropsMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    years: Array.from(yearsSet).sort((a, b) => b - a) // Descending
  };
}

export async function createSeason(input: CreateSeasonInput): Promise<Season> {
  const { data, error } = await supabase
    .from('seasons')
    .insert(input)
    .select()
    .single();

  if (error) {
    throw handleSeasonError(error);
  }

  return data;
}

export async function getSeason(id: number): Promise<SeasonDetail> {
  const { data, error } = await supabase
    .from('seasons')
    .select(`
      *,
      crops ( name )
    `)
    .eq('id', id)
    .single();

  if (error) {
    throw handleSeasonError(error);
  }

  return {
    ...data,
    crop_name: data.crops?.name || 'Unknown Crop',
  };
}

export async function completeSeason(id: number, harvestQty: number, harvestUnit: string, revenuePesewas?: number): Promise<Season> {
  const { data, error } = await supabase
    .from('seasons')
    .update({
      is_complete: true,
      harvest_qty: harvestQty,
      harvest_unit: harvestUnit,
      revenue_pesewas: revenuePesewas ?? null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw handleSeasonError(error);
  }

  return data;
}

export async function deleteSeason(id: number): Promise<void> {
  // Cascades to costs and estimates due to ON DELETE CASCADE at the database level.
  const { error } = await supabase
    .from('seasons')
    .delete()
    .eq('id', id);

  if (error) {
    throw handleSeasonError(error);
  }
}
