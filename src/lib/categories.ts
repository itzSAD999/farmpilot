import type { CostCategory } from '../api/costs';

export interface CategoryConfig {
  id: CostCategory;
  label: string;
  description: string;
  units: string[];
}

export const CATEGORIES: Record<CostCategory, CategoryConfig> = {
  seeds: {
    id: 'seeds',
    label: 'Seeds',
    description: 'Seed, seedlings, planting material',
    units: ['kg', 'bag', 'tin'],
  },
  fertiliser: {
    id: 'fertiliser',
    label: 'Fertiliser',
    description: 'NPK, Urea, Sulphate of Ammonia, organic',
    units: ['bag (50kg)', 'bag (25kg)', 'kg'],
  },
  agrochem: {
    id: 'agrochem',
    label: 'Chemicals',
    description: 'Weedicide, insecticide, fungicide',
    units: ['litre', 'ml', 'sachet'],
  },
  land_prep: {
    id: 'land_prep',
    label: 'Land work',
    description: 'Ploughing, harrowing, clearing, stumping',
    units: ['acre', 'contract'],
  },
  labour: {
    id: 'labour',
    label: 'Labour',
    description: 'Planting, weeding, harvesting, hired hands',
    units: ['person-day', 'contract'],
  },
  transport: {
    id: 'transport',
    label: 'Transport',
    description: 'Moving inputs in, produce out',
    units: ['trip', 'bag'],
  },
  storage: {
    id: 'storage',
    label: 'Storage',
    description: 'Sacks, storage fees, treatment',
    units: ['sack', 'month'],
  },
  other: {
    id: 'other',
    label: 'Other',
    description: 'Anything that does not fit above',
    units: [], // User can type their own unit
  },
};

/**
 * Fallback checklist for crops with no seeded crop_input_norms (i.e. no
 * crop-specific benchmark data yet). Used anywhere we'd otherwise show
 * getExpectedCategoriesForCrop() results, so every crop gets a sensible
 * "what should I be tracking" checklist even before norms exist for it.
 */
export const ESSENTIAL_CATEGORIES: CostCategory[] = ['seeds', 'land_prep', 'fertiliser', 'labour'];

export const OTHER_CATEGORY_EXPLANATION =
  "Costs placed in 'Other' count toward your total but cannot be compared against standard rates, so no specific advice will be given. Try to use specific categories if possible.";
