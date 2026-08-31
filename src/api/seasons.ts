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

function handleSeasonError(error: any): Error {
  const msg = error.message || String(error);

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
