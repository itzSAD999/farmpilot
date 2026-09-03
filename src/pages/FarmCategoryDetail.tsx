import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useFarm } from '../hooks/useFarm';
import { listSeasons } from '../api/seasons';
import { listCosts } from '../api/costs';
import type { CostCategory, CostItem } from '../api/costs';
import type { SeasonSummary } from '../api/seasons';
import { CATEGORIES } from '../lib/categories';
import { Money } from '../components/ui/Money';
import { InfoTip } from '../components/ui/InfoTip';

interface CostWithSeason extends CostItem {
  season?: SeasonSummary;
}

/**
 * Farm-wide version of CategoryDetail.tsx (which is season-scoped) — every
 * entry in one category across every season on the farm, on its own page
 * rather than an accordion on the Costs overview. A farm with fifty
 * recorded entries in one category made that accordion the whole page;
 * this is that same list with room to actually be a list.
 */
export function FarmCategoryDetail() {
  const { category } = useParams<{ category: string }>();
  const cat = category as CostCategory;
  const { farm, isLoading: isLoadingFarm } = useFarm();
  const config = CATEGORIES[cat];
  const [search, setSearch] = useState('');
  const [seasonFilter, setSeasonFilter] = useState<number | 'all'>('all');

  const { data: seasons, isLoading: isLoadingSeasons } = useQuery({
    queryKey: ['seasons', farm?.id],
    queryFn: () => listSeasons(farm!.id as number),
    enabled: !!farm?.id,
  });

  const { data: allCosts, isLoading: isLoadingCosts } = useQuery({
    queryKey: ['all_costs', farm?.id, seasons?.map((s) => s.id)],
    queryFn: async () => {
      if (!seasons || seasons.length === 0) return [];
      const results = await Promise.all(
        seasons.map(async (season) => {
          const costs = await listCosts(season.id);
          return costs.map((c) => ({ ...c, season } as CostWithSeason));
        })
      );
      return results.flat();
    },
    enabled: !!seasons && seasons.length > 0,
  });

  const isLoading = isLoadingFarm || isLoadingSeasons || isLoadingCosts;

  const allEntriesForCategory = useMemo(
    () =>
      (allCosts || [])
        .filter((c) => c.category === cat)
        .sort((a, b) => new Date(b.date_incurred || b.created_at).getTime() - new Date(a.date_incurred || a.created_at).getTime()),
    [allCosts, cat]
  );

  // Seasons that actually have at least one entry in this category —
  // the only sensible options for the filter dropdown.
  const seasonsWithEntries = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of allEntriesForCategory) {
      if (c.season_id && c.season && !map.has(c.season_id)) {
        map.set(c.season_id, `${c.season.crop_name} ${c.season.season_window} ${c.season.year}`);
      }
    }
    return Array.from(map.entries());
  }, [allEntriesForCategory]);

  const entries = useMemo(() => {
    let result = allEntriesForCategory;
    if (seasonFilter !== 'all') {
      result = result.filter((c) => c.season_id === seasonFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((c) => {
        const seasonLabel = c.season ? `${c.season.crop_name} ${c.season.season_window} ${c.season.year}`.toLowerCase() : '';
        return (c.description || '').toLowerCase().includes(q) || seasonLabel.includes(q);
      });
    }
    return result;
  }, [allEntriesForCategory, search, seasonFilter]);

  // The summary card always reflects every entry, regardless of search or
  // the season filter — only the list below narrows, so "how much have I
  // really spent" never looks wrong while searching.
  const total = allEntriesForCategory.reduce((sum, c) => sum + c.amount_pesewas, 0);
  const seasonCount = new Set(allEntriesForCategory.map((c) => c.season_id)).size;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6 animate-pulse space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-white/10 rounded-lg" />
        <div className="h-32 bg-gray-200 dark:bg-white/10 rounded-3xl" />
        <div className="h-64 bg-gray-200 dark:bg-white/10 rounded-3xl" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Not found</h2>
        <Link to="/costs" className="text-emerald-600 font-bold hover:underline">Back to Costs</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 lg:px-8 animate-fade-in pb-24">
      <Link to="/costs" className="text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors flex items-center mb-6 group w-max">
        <span className="w-8 h-8 rounded-full bg-white dark:bg-white/5 shadow-sm flex items-center justify-center mr-3 group-hover:bg-gray-50 dark:group-hover:bg-white/10 transition-colors border border-gray-100 dark:border-white/10">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
        </span>
        Back to Costs
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{config.label}</h1>
        <InfoTip text={`Every ${config.label.toLowerCase()} cost recorded across every season on your farm, added up to the total below.`} />
      </div>
      <p className="text-gray-500 dark:text-gray-400 font-medium text-sm mb-8">{config.description}</p>

      <div className="bg-[#0a0a0a] rounded-[24px] p-6 md:p-8 text-white shadow-xl grid grid-cols-1 sm:grid-cols-2 gap-6 items-center mb-8">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Total recorded (all seasons)</p>
          <p className="text-4xl font-light tracking-tight"><Money pesewas={total} /></p>
          <p className="text-xs text-gray-400 mt-1">{allEntriesForCategory.length} {allEntriesForCategory.length === 1 ? 'entry' : 'entries'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Across</p>
          <p className="text-4xl font-light tracking-tight">{seasonCount}</p>
          <p className="text-xs text-gray-400 mt-1">{seasonCount === 1 ? 'season' : 'seasons'}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description or season..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>
        {seasonsWithEntries.length > 1 && (
          <select
            value={seasonFilter}
            onChange={(e) => setSeasonFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          >
            <option value="all">All seasons</option>
            {seasonsWithEntries.map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        )}
      </div>

      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
        {search || seasonFilter !== 'all' ? `${entries.length} matching ${entries.length === 1 ? 'entry' : 'entries'}` : 'Every entry, most recent first'}
      </h2>

      {entries.length === 0 ? (
        <div className="bg-white dark:bg-white/5 rounded-[24px] p-10 border border-gray-100 dark:border-white/10 text-center">
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {allEntriesForCategory.length === 0
              ? `Nothing recorded in ${config.label.toLowerCase()} yet.`
              : 'No entries match your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((cost) => (
            <Link
              key={cost.id}
              to={cost.season_id ? `/season/${cost.season_id}/category/${cat}` : '#'}
              className="block bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      {cost.description || config.label}
                    </span>
                    {cost.date_incurred && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600">&bull;</span>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{new Date(cost.date_incurred).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 inline-block px-2 py-0.5 rounded-md">
                    {cost.season ? `${cost.season.crop_name} ${cost.season.season_window} ${cost.season.year}` : 'Unknown season'}
                  </p>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100"><Money pesewas={cost.amount_pesewas} /></span>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
