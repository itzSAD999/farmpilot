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

const RICH_MARKDOWN_GUIDES: Record<number, string> = {
  1: `# Understanding the Government Fertilizer Subsidy Program\n\nMissing the subsidy window is the most common avoidable overspend for farmers. Subsidies are typically allocated before the major season begins, so early registration is critical. Contact your local District Agricultural Department early in the year.\n\n## Why it matters\nFertilizer represents up to 40% of the total production cost for crops like maize and rice. The Planting for Food and Jobs (PFJ) subsidy can reduce this cost by up to 50%.\n\n## Common Pitfalls\n- **Waiting too late:** Subsidy quotas run out quickly in high-demand regions.\n- **Buying from unauthorized dealers:** You risk buying fake or unsubsidized fertilizer.\n- **Not having a Ghana Card:** Registration requires valid identification.\n\n### Expert Tip\nForm a cooperative with your neighbors. MoFA officers are more likely to prioritize groups that can purchase in bulk and demonstrate serious commitment.`,
  2: `# Sourcing Certified High-Yield Seeds\n\nFarmers often save seeds from previous harvests to cut costs, but this leads to diminishing yields over time. Certified seeds are bred for disease resistance and climate resilience.\n\n## The True Cost of Saved Seed\nWhile saved seed is "free", it can cost you up to 30% of your potential yield. For a 5-acre farm, that lost yield could be worth 10x the cost of buying certified seed.\n\n## What makes seed "Certified"?\n- Tested for minimum 85% germination rate\n- Treated with fungicides to protect against early soil diseases\n- Guaranteed genetic purity (no mixed varieties)\n\n### Pro-Tip\nAlways keep the certification tag from your seed bag. If the germination fails, you can use the tag to get a replacement from the supplier or report them to the regulatory body.`,
  3: `# Effective Pesticide and Herbicide Application\n\nOver-applying agrochemicals is a common waste of money and harms the soil. Always follow the manufacturer's dosage instructions exactly.\n\n## The "More is Better" Myth\nMany farmers double the recommended dose thinking it will kill pests faster. In reality, this:\n- Burns the crop leaves (phytotoxicity)\n- Wastes money\n- Builds pest resistance faster\n\n## Proper Application Techniques\n- **Calibration:** Test your sprayer with plain water first to ensure the nozzle is spraying a fine mist, not heavy drops.\n- **Timing:** Spray between 6am and 9am, or after 4pm. Midday heat causes the chemical to evaporate before the plant absorbs it.\n- **Water Quality:** Use clean water. Muddy water can neutralize the active ingredients in many herbicides (like Glyphosate).\n\n### Remember\nAlways wear protective clothing. Health costs from chemical exposure will far exceed any money saved on the farm.`,
  4: `# Cost-Effective Land Preparation\n\nPlowing bone-dry soil takes more time, fuel, and tractor hours. Waiting for the first rains softens the soil and significantly reduces land preparation costs.\n\n## Why timing matters\nTractor operators charge by the acre, but if the soil is too hard, they will use more fuel and charge higher rates (or refuse the job entirely).\n\n## Pre-plowing Checklist\n- **Clear stumps:** Remove all hidden stumps. If a tractor hits a stump and breaks a plow, they will abandon your farm.\n- **Mark boundaries:** Clearly mark your farm boundaries with pegs so the operator doesn't waste time plowing outside your land.\n- **Coordinate:** If you and 3 neighbors need plowing, negotiate a group rate. The operator saves fuel driving between farms and can pass the savings to you.\n\n### Minimum Tillage Option\nConsider "Zero Tillage" using herbicides if your land was previously farmed. It completely eliminates tractor costs and preserves soil moisture.`,
  5: `# Optimizing Farm Labour Costs\n\nPaying daily wages often leads to slower work. Agreeing on a price per acre or per row (piece-rate) incentivizes laborers to finish quickly and efficiently.\n\n## Daily Wage vs. Task-Based\n- **Daily Wage:** You pay for time. Workers may slow down to extend the job into a second day. Requires heavy supervision.\n- **Task-Based:** You pay for results. Workers finish faster. Requires supervision only at the end to check quality.\n\n## Maximizing Productivity\n- Provide clean drinking water on the farm.\n- Assign work early in the morning when it is cool.\n- Clearly define the standard of work before they start (e.g., "all weeds must be uprooted, not just cut").\n\n### Community Labor (Nnoboa)\nThe cheapest labor is shared labor. Group together with 4 other farmers and work on one person's farm each day of the week. No cash changes hands.`,
  6: `# Reducing Harvest Transportation Costs\n\nTransporting half-empty trucks drastically increases your cost per bag. Consolidate your harvest or coordinate with neighbors.\n\n## The Mathematics of Transport\nIf a tricycle (Aboboyaa) costs GHS 100 per trip and holds 10 bags, your cost is GHS 10/bag. If you only load 5 bags, your cost doubles to GHS 20/bag.\n\n## How to lower transport costs\n- **Dry on the farm:** Wet grains are heavier and bulkier. Drying crops on the farm reduces the volume you need to transport.\n- **Road Maintenance:** A bad farm road means drivers charge "risk" prices. Spending one day fixing potholes on your farm road can save you hundreds of cedis in transport negotiations.\n- **Off-Peak Movement:** Try not to transport on market days when every driver is busy and charging premium rates.\n\n### Joint Hiring\nAlways talk to the neighboring farm before hiring a truck. Combining loads is the easiest way to cut transport costs by 50%.`,
  7: `# Preventing Post-Harvest Storage Losses\n\nTraditional jute sacks leave grains vulnerable to insects and moisture. Modern hermetic bags pay for themselves by completely stopping pest damage without chemicals.\n\n## The Hidden Cost of Storage Pests\nWeevils and borers can consume 20% of your stored maize in just 3 months. When you sell, buyers will severely discount insect-damaged grain.\n\n## Hermetic Storage Bags (PICS)\n- **How they work:** They have inner plastic linings that completely block oxygen. Any insects trapped inside suffocate and die within days.\n- **No chemicals needed:** You save money on dusting chemicals and produce safer food.\n- **Reusable:** If handled carefully (no punctures), they can be reused for up to 3 seasons.\n\n### Storage Best Practices\n- Never store bags directly on the concrete or earth floor. Use wooden pallets.\n- Ensure grains are dried to exactly 13% moisture before sealing.`,
  8: `# The Importance of Good Record Keeping\n\nMany farmers mix personal and farm money. Keep a strict log of every expense, no matter how small, so you can calculate your true profit at the end of the season.\n\n## Treat your farm as a Business\nIf you take GHS 50 from your pocket to pay a laborer, that is a business expense. If you don't record it, you will think you made a larger profit at harvest than you actually did.\n\n## What to track\n- **Inputs:** Seeds, fertilizer, chemicals\n- **Labor:** Weeding, planting, harvesting (including family labor!)\n- **Transport:** Bringing inputs to the farm and produce to the market\n- **Yields:** How many bags harvested per acre\n\n### Why FarmPilot?\nUsing FarmPilot to log these costs as they happen ensures you don't forget them. At the end of the season, FarmPilot will give you an exact breakdown of where your money went, allowing you to cut wasteful spending next year.`
};

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

  // Inject rich markdown if available
  if (data && RICH_MARKDOWN_GUIDES[data.id]) {
    data.body_markdown = RICH_MARKDOWN_GUIDES[data.id];
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
