import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useFarm } from '../hooks/useFarm';
import { listSeasons } from '../api/seasons';
import { listCosts } from '../api/costs';
import { CATEGORIES } from '../lib/categories';
import { Money } from '../components/ui/Money';
import type { CostCategory, CostItem } from '../api/costs';
import type { SeasonSummary } from '../api/seasons';

interface CostWithSeason extends CostItem {
  season?: SeasonSummary;
}

export function CostsOverview() {
  const { farm, isLoading: isLoadingFarm } = useFarm();
  const [groupBy, setGroupBy] = useState<'category' | 'season'>('category');

  // Load all seasons
  const { data: seasons, isLoading: isLoadingSeasons } = useQuery({
    queryKey: ['seasons', farm?.id],
    queryFn: () => listSeasons(farm!.id as number),
    enabled: !!farm?.id,
  });

  // Load costs for each season
  const { data: allCosts, isLoading: isLoadingCosts } = useQuery({
    queryKey: ['all_costs', farm?.id, seasons?.map(s => s.id)],
    queryFn: async () => {
      if (!seasons || seasons.length === 0) return [];
      const results = await Promise.all(
        seasons.map(async (season) => {
          const costs = await listCosts(season.id);
          return costs.map(c => ({ ...c, season } as CostWithSeason));
        })
      );
      return results.flat();
    },
    enabled: !!seasons && seasons.length > 0,
  });

  const isLoading = isLoadingFarm || isLoadingSeasons || isLoadingCosts;

  // Group costs by category
  const costsByCategory = allCosts?.reduce((acc, cost) => {
    const cat = cost.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(cost);
    return acc;
  }, {} as Record<string, CostWithSeason[]>) || {};

  // Group costs by season
  const costsBySeason = allCosts?.reduce((acc, cost) => {
    const key = cost.season_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(cost);
    return acc;
  }, {} as Record<number, CostWithSeason[]>) || {};

  // Category totals
  const categoryTotals = Object.entries(costsByCategory).map(([cat, costs]) => ({
    category: cat as CostCategory,
    total: costs.reduce((sum, c) => sum + c.amount_pesewas, 0),
    count: costs.length,
  })).sort((a, b) => b.total - a.total);

  const grandTotal = allCosts?.reduce((sum, c) => sum + c.amount_pesewas, 0) || 0;

  if (isLoading) {
    return (
      <div className="animate-pulse pb-24 max-w-6xl mx-auto">
        <div className="h-8 w-48 bg-gray-200 dark:bg-white/10 rounded-lg mb-2"></div>
        <div className="h-4 w-72 bg-gray-200 dark:bg-white/10 rounded-lg mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-white/10 rounded-2xl"></div>)}
        </div>
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-200 dark:bg-white/10 rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up pb-24 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Costs</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-sm mt-1">All expenses across your seasons in one place.</p>
        </div>
      </div>

      {!allCosts || allCosts.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-white/5 rounded-[24px] p-12 border border-gray-100 dark:border-white/10 text-center shadow-sm">
          <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">No costs recorded yet</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
            {!seasons || seasons.length === 0 
              ? "Start by creating a season, then add costs to track your expenses."
              : "You have seasons set up! Open one below and start recording your expenses."
            }
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {(!seasons || seasons.length === 0) ? (
              <Link to="/season/new" className="inline-flex items-center bg-emerald-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                Create First Season
              </Link>
            ) : (
              <div className="space-y-3 w-full max-w-lg">
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Your Seasons</p>
                {seasons.slice(0, 3).map(s => (
                  <Link key={s.id} to={`/season/${s.id}`} className="block p-4 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl border border-gray-100 dark:border-white/10 transition-colors text-left group">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{s.crop_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{s.season_window} {s.year} · {s.area_planted_acres} acres</p>
                      </div>
                      <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-white/5 rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Spend</p>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100"><span className="text-sm font-bold text-gray-400 mr-1">GHS</span><Money pesewas={grandTotal} /></p>
            </div>
            <div className="bg-white dark:bg-white/5 rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Entries</p>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{allCosts.length}</p>
            </div>
            <div className="bg-white dark:bg-white/5 rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Categories Used</p>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{Object.keys(costsByCategory).length}</p>
            </div>
            <div className="bg-white dark:bg-white/5 rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Seasons</p>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{Object.keys(costsBySeason).length}</p>
            </div>
          </div>

          {/* Toggle View */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Cost Breakdown</h2>
            <div className="flex bg-gray-100 dark:bg-white/10 p-1 rounded-xl">
              <button
                onClick={() => setGroupBy('category')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${groupBy === 'category' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
              >
                By Category
              </button>
              <button
                onClick={() => setGroupBy('season')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${groupBy === 'season' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
              >
                By Season
              </button>
            </div>
          </div>

          {groupBy === 'category' ? (
            /* Category View */
            <div className="space-y-4">
              {categoryTotals.map(({ category, total, count }) => {
                const config = CATEGORIES[category];
                const pct = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0;
                return (
                  <div key={category} className="bg-white dark:bg-white/5 rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                          <span className="text-lg">{getCategoryEmoji(category)}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-gray-100">{config?.label || category}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{count} {count === 1 ? 'entry' : 'entries'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold text-gray-900 dark:text-gray-100">
                          <span className="text-xs font-bold text-gray-400 mr-1">GHS</span>
                          <Money pesewas={total} />
                        </p>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{pct}% of total</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Season View */
            <div className="space-y-4">
              {Object.entries(costsBySeason).map(([seasonId, costs]) => {
                const season = costs[0]?.season;
                const seasonTotal = costs.reduce((sum, c) => sum + c.amount_pesewas, 0);
                return (
                  <Link key={seasonId} to={`/season/${seasonId}`} className="block bg-white dark:bg-white/5 rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {season?.crop_name || `Season #${seasonId}`}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize font-medium">
                          {season?.season_window} {season?.year} · {season?.area_planted_acres} acres
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-extrabold text-gray-900 dark:text-gray-100">
                          <span className="text-sm font-bold text-gray-400 mr-1">GHS</span>
                          <Money pesewas={seasonTotal} />
                        </p>
                        <p className="text-xs font-medium text-gray-400">{costs.length} items</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(costs.reduce((acc, c) => {
                        acc[c.category] = (acc[c.category] || 0) + c.amount_pesewas;
                        return acc;
                      }, {} as Record<string, number>)).map(([cat, amt]) => (
                        <span key={cat} className="inline-flex items-center px-2.5 py-1 bg-gray-50 dark:bg-white/5 text-xs font-bold text-gray-600 dark:text-gray-300 rounded-lg border border-gray-100 dark:border-white/10">
                          {CATEGORIES[cat as CostCategory]?.label || cat}: <span className="ml-1 text-gray-900 dark:text-gray-100">₵{(amt / 100).toFixed(2)}</span>
                        </span>
                      ))}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function getCategoryEmoji(category: string): string {
  const emojiMap: Record<string, string> = {
    seeds: '🌱',
    fertiliser: '🧪',
    agrochem: '🧴',
    land_prep: '🚜',
    labour: '👷',
    transport: '🚛',
    storage: '📦',
    other: '📋',
  };
  return emojiMap[category] || '📋';
}
