import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useFarm } from '../hooks/useFarm';
import { listSeasons } from '../api/seasons';
import { listCosts } from '../api/costs';
import { CATEGORIES } from '../lib/categories';
import { Money } from '../components/ui/Money';
import { InfoTip } from '../components/ui/InfoTip';
import type { CostCategory, CostItem } from '../api/costs';
import type { SeasonSummary } from '../api/seasons';

interface CostWithSeason extends CostItem {
  season?: SeasonSummary;
}

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function CostsOverview() {
  const { farm, isLoading: isLoadingFarm } = useFarm();
  const [groupBy, setGroupBy] = useState<'category' | 'season'>('category');
  const [expandedCategory, setExpandedCategory] = useState<CostCategory | null>(null);
  const [search, setSearch] = useState('');

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

  // Filter by search term — matches category label, description, or the
  // owning season's crop/window/year, so a farmer can find e.g. "fertiliser"
  // or "maize" without switching the By Category / By Season toggle.
  const searchedCosts = useMemo(() => {
    if (!allCosts) return allCosts;
    const q = search.trim().toLowerCase();
    if (!q) return allCosts;
    return allCosts.filter((c) => {
      const categoryLabel = CATEGORIES[c.category]?.label?.toLowerCase() || c.category;
      const seasonLabel = `${c.season?.crop_name || ''} ${c.season?.season_window || ''} ${c.season?.year || ''}`.toLowerCase();
      return (
        categoryLabel.includes(q) ||
        seasonLabel.includes(q) ||
        (c.description || '').toLowerCase().includes(q)
      );
    });
  }, [allCosts, search]);

  // Group costs by category
  const costsByCategory = searchedCosts?.reduce((acc, cost) => {
    const cat = cost.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(cost);
    return acc;
  }, {} as Record<string, CostWithSeason[]>) || {};

  // Group costs by season
  const costsBySeason = searchedCosts?.reduce((acc, cost) => {
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

  const grandTotal = searchedCosts?.reduce((sum, c) => sum + c.amount_pesewas, 0) || 0;

  const pieData = categoryTotals.map(({ category, total }) => ({
    name: CATEGORIES[category]?.label || category,
    value: total / 100,
  }));

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
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Costs</h1>
            <InfoTip text="This rolls up every cost item recorded across all of your seasons — including back-filled historical years — regardless of whether that season is still active or already closed." />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-sm mt-1">All expenses across your seasons in one place.</p>
        </div>
        {allCosts && allCosts.length > 0 && (
          <button
            onClick={() => window.print()}
            className="print:hidden inline-flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 px-4 py-2.5 rounded-xl shadow-sm transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Download PDF
          </button>
        )}
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
              <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100"><Money pesewas={grandTotal} /></p>
            </div>
            <div className="bg-white dark:bg-white/5 rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Entries</p>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{searchedCosts?.length ?? 0}</p>
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

          {/* Mini-dashboard: pie chart breakdown of where money is going */}
          {pieData.length > 0 && (
            <div className="bg-white dark:bg-[#121212] rounded-[32px] p-6 sm:p-8 border border-gray-100 dark:border-white/5 shadow-[0_8px_40px_rgb(0,0,0,0.03)] mb-8">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Where your money is going</h3>
                <InfoTip text="Each slice is that category's share of total recorded spend across every cost item counted above — search or a category/season filter narrows both the chart and the list below together." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `₵${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {pieData.map((d, i) => {
                    const pct = grandTotal > 0 ? Math.round((d.value * 100) / (grandTotal / 100)) : 0;
                    return (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          {d.name}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-gray-100">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Search + Toggle View */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 shrink-0">Cost Breakdown</h2>
            <div className="print:hidden flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  placeholder="Search category, crop, or note..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 rounded-xl text-sm w-full focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                />
              </div>
              <div className="flex bg-gray-100 dark:bg-white/10 p-1 rounded-xl shrink-0">
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
          </div>

          {search && categoryTotals.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400 font-medium">
              No costs match "{search}".
            </div>
          )}

          {groupBy === 'category' ? (
            /* Category View */
            <div className="space-y-4">
              {categoryTotals.map(({ category, total, count }) => {
                const config = CATEGORIES[category];
                const pct = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0;
                const isExpanded = expandedCategory === category;
                const entries = (costsByCategory[category] || []).slice().sort(
                  (a, b) => new Date(b.date_incurred || b.created_at).getTime() - new Date(a.date_incurred || a.created_at).getTime()
                );
                return (
                  <div key={category} className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedCategory(isExpanded ? null : category)}
                      className="w-full text-left p-5"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                            <span className="text-lg">{getCategoryEmoji(category)}</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                              {config?.label || category}
                              <svg className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{count} {count === 1 ? 'entry' : 'entries'} — tap for details</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-extrabold text-gray-900 dark:text-gray-100">
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
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100 dark:border-white/10 divide-y divide-gray-50 dark:divide-white/5 animate-fade-in">
                        {entries.map((cost) => (
                          <Link
                            key={cost.id}
                            to={cost.season_id ? `/season/${cost.season_id}/category/${category}` : '#'}
                            className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                          >
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                {cost.description || config?.label || category}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {cost.season ? `${cost.season.crop_name} ${cost.season.season_window} ${cost.season.year}` : 'Unknown season'}
                                {cost.date_incurred && ` · ${new Date(cost.date_incurred).toLocaleDateString()}`}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100"><Money pesewas={cost.amount_pesewas} /></span>
                          </Link>
                        ))}
                      </div>
                    )}
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
