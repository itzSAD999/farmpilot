import { supabase } from '../lib/supabase';
import { CostCategory } from './costs';

export interface GuideStep {
  id: number;
  position: number;
  heading: string;
  detail: string;
}

export interface Guide {
  id: number;
  category: CostCategory;
  crop_id: number | null;
  title: string;
  summary: string;
  body_markdown: string;
  region: string | null;
  season_window: string | null;
  source: string;
  updated_at: string;
  guide_steps?: GuideStep[];
}

// 1. Get Guides for a specific season (matching flagged categories)
export async function getGuidesFor(seasonId: number): Promise<Guide[]> {
  // First, get the season details (crop, window)
  const { data: season, error: seasonError } = await supabase
    .from('seasons')
    .select('crop_id, season_window')
    .eq('id', seasonId)
    .single();

  if (seasonError || !season) throw seasonError || new Error("Season not found");

  // Get the latest estimate for this season to find flagged categories
  const { data: estimates, error: estError } = await supabase
    .from('estimates')
    .select('estimate_lines(category, is_flagged)')
    .eq('season_id', seasonId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (estError) throw estError;

  const estimate = estimates?.[0];
  if (!estimate) return []; // No estimates yet

  const flaggedCategories = estimate.estimate_lines
    .filter(line => line.is_flagged)
    .map(line => line.category);

  if (flaggedCategories.length === 0) return [];

  // Fetch guides matching those categories
  const { data: guides, error: guidesError } = await supabase
    .from('guides')
    .select('*, guide_steps(*)')
    .in('category', flaggedCategories);

  if (guidesError) throw guidesError;

  // Rank the guides:
  // 1. Exact crop + window match
  // 2. Crop match
  // 3. Category general (crop_id is null)
  const rankedGuides = guides?.sort((a: Guide, b: Guide) => {
    let scoreA = 0;
    let scoreB = 0;

    if (a.crop_id === season.crop_id) {
      scoreA += 10;
      if (a.season_window === season.season_window) scoreA += 5;
    }
    if (b.crop_id === season.crop_id) {
      scoreB += 10;
      if (b.season_window === season.season_window) scoreB += 5;
    }

    return scoreB - scoreA;
  });

  return rankedGuides || [];
}

export interface GuideFilters {
  category?: CostCategory;
  cropId?: number;
  search?: string;
}

// 2. List all guides (Library page)
export async function listGuides(filters?: GuideFilters): Promise<Guide[]> {
  let query = supabase.from('guides').select('*, guide_steps(*)');

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  
  if (filters?.cropId) {
    // Return guides that match the crop OR are general (crop_id is null)
    query = query.or(`crop_id.eq.${filters.cropId},crop_id.is.null`);
  }

  if (filters?.search) {
    // Simple text search on title or summary
    query = query.or(`title.ilike.%${filters.search}%,summary.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data || [];
}

export async function getGuideById(id: number): Promise<Guide> {
  const { data, error } = await supabase
    .from('guides')
    .select('*, guide_steps(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  
  // Sort steps by position
  if (data && data.guide_steps) {
    data.guide_steps.sort((a: any, b: any) => a.position - b.position);
  }

  return data;
}

// Helper to get all currently flagged categories across a farm (for "For your farm" section)
export async function getFlaggedCategoriesForFarm(farmId: number): Promise<CostCategory[]> {
  const { data: seasons } = await supabase
    .from('seasons')
    .select('id')
    .eq('farm_id', farmId)
    .eq('is_complete', false);
    
  if (!seasons || seasons.length === 0) return [];

  const seasonIds = seasons.map(s => s.id);
  
  // We must find the latest estimate for each season.
  const { data: estimates } = await supabase
    .from('estimates')
    .select('season_id, estimate_lines(category, is_flagged)')
    .in('season_id', seasonIds)
    .order('created_at', { ascending: false });

  if (!estimates) return [];

  const flagged = new Set<CostCategory>();
  
  // Only process the latest estimate per season
  const processedSeasons = new Set<number>();
  for (const est of estimates) {
    if (!processedSeasons.has(est.season_id)) {
      processedSeasons.add(est.season_id);
      est.estimate_lines.forEach(line => {
        if (line.is_flagged) flagged.add(line.category as CostCategory);
      });
    }
  }

  return Array.from(flagged);
}
