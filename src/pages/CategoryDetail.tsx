import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSeason } from '../api/seasons';
import { listCosts, deleteCost, getCategoryBenchmarkPesewas } from '../api/costs';
import type { CostCategory } from '../api/costs';
import { CATEGORIES } from '../lib/categories';
import { Money } from '../components/ui/Money';
import { InfoTip } from '../components/ui/InfoTip';
import { AddCostForm } from '../components/domain/AddCostForm';

export function CategoryDetail() {
  const { id, category } = useParams<{ id: string; category: string }>();
  const seasonId = Number(id);
  const cat = category as CostCategory;
  const queryClient = useQueryClient();

  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [editingCostId, setEditingCostId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const { data: season, isLoading: isSeasonLoading } = useQuery({
    queryKey: ['season', seasonId],
    queryFn: () => getSeason(seasonId),
    enabled: !isNaN(seasonId),
  });

  const { data: allCosts, isLoading: isCostsLoading } = useQuery({
    queryKey: ['seasonCosts', seasonId],
    queryFn: () => listCosts(seasonId),
    enabled: !isNaN(seasonId),
  });

  const { data: benchmarkPesewas } = useQuery({
    queryKey: ['categoryBenchmark', seasonId, cat],
    queryFn: () => getCategoryBenchmarkPesewas(seasonId, cat),
    enabled: !isNaN(seasonId) && !!cat && cat !== 'other',
  });

  const deleteMutation = useMutation({
    mutationFn: (costId: number) => deleteCost(costId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonCosts', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] });
    },
  });

  const editingCost = allCosts?.find((c) => c.id === editingCostId) || null;
  const isLoading = isSeasonLoading || isCostsLoading;
  const config = CATEGORIES[cat];
  const allEntriesForCategory = useMemo(
    () =>
      (allCosts || [])
        .filter((c) => c.category === cat)
        .sort((a, b) => new Date(b.date_incurred || b.created_at).getTime() - new Date(a.date_incurred || a.created_at).getTime()),
    [allCosts, cat]
  );
  const entries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allEntriesForCategory;
    return allEntriesForCategory.filter((c) => (c.description || '').toLowerCase().includes(q));
  }, [allEntriesForCategory, search]);

  // The summary card always reflects the full season total, regardless of
  // search — only the list below narrows, so "how much did I really spend
  // vs. benchmark" never looks wrong while searching.
  const subtotalPesewas = allEntriesForCategory.reduce((sum, c) => sum + c.amount_pesewas, 0);
  const variancePct = benchmarkPesewas && benchmarkPesewas > 0
    ? Math.round(((subtotalPesewas - benchmarkPesewas) / benchmarkPesewas) * 100)
    : null;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6 animate-pulse space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-white/10 rounded-lg" />
        <div className="h-40 bg-gray-200 dark:bg-white/10 rounded-3xl" />
        <div className="h-64 bg-gray-200 dark:bg-white/10 rounded-3xl" />
      </div>
    );
  }

  if (!config || !season) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Not found</h2>
        <Link to="/" className="text-emerald-600 font-bold hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 lg:px-8 animate-fade-in pb-24">
      <Link to={`/season/${seasonId}`} className="text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors flex items-center mb-6 group w-max">
        <span className="w-8 h-8 rounded-full bg-white dark:bg-white/5 shadow-sm flex items-center justify-center mr-3 group-hover:bg-gray-50 dark:group-hover:bg-white/10 transition-colors border border-gray-100 dark:border-white/10">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
        </span>
        Back to {season.crop_name} {season.season_window} {season.year}
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{config.label}</h1>
        <InfoTip text={`Every ${config.label.toLowerCase()} cost recorded for this season, added up to the total below. This is how the "${config.label}" line on your Estimate Report and Season page got to its number — nothing here is a prediction, it's exactly what you entered.`} />
      </div>
      <p className="text-gray-500 dark:text-gray-400 font-medium text-sm mb-8">{config.description}</p>

      {/* Summary */}
      <div className="bg-[#0a0a0a] rounded-[24px] p-6 md:p-8 text-white shadow-xl grid grid-cols-1 sm:grid-cols-2 gap-6 items-center mb-8">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Total recorded</p>
          <p className="text-4xl font-light tracking-tight"><Money pesewas={subtotalPesewas} /></p>
          <p className="text-xs text-gray-400 mt-1">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</p>
        </div>
        {variancePct !== null && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Vs. standard benchmark</p>
            <p className={`text-4xl font-light tracking-tight ${variancePct > 30 ? 'text-orange-400' : variancePct < 0 ? 'text-emerald-400' : 'text-white'}`}>
              {variancePct > 0 ? '+' : ''}{variancePct}%
            </p>
            <p className="text-xs text-gray-400 mt-1">Standard for this crop/acreage: <Money pesewas={benchmarkPesewas || 0} /></p>
          </div>
        )}
      </div>

      {/* Recorded entries */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">How this total was built up</h2>
        <button
          onClick={() => { setEditingCostId(null); setIsCostModalOpen(true); }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-3 py-2 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Add a cost
        </button>
      </div>

      {allEntriesForCategory.length > 5 && (
        <div className="relative mb-4">
          <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>
      )}

      {entries.length === 0 ? (
        <div className="bg-white dark:bg-white/5 rounded-[24px] p-10 border border-gray-100 dark:border-white/10 text-center">
          {allEntriesForCategory.length === 0 ? (
            <>
              <p className="text-gray-500 dark:text-gray-400 font-medium mb-4">Nothing recorded in {config.label.toLowerCase()} yet for this season.</p>
              <button
                onClick={() => { setEditingCostId(null); setIsCostModalOpen(true); }}
                className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors"
              >
                Record the first one
              </button>
            </>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 font-medium">No entries match "{search}".</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((cost) => (
            <div key={cost.id} className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{cost.description || config.label}</span>
                  {cost.date_incurred && (
                    <>
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{new Date(cost.date_incurred).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
                {(cost.quantity || cost.unit_cost_pesewas) ? (
                  <div className="inline-flex items-center text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-2 py-1 rounded-md mt-1">
                    {cost.quantity || '?'} {cost.unit || 'units'} &times; <Money pesewas={cost.unit_cost_pesewas || 0} />
                  </div>
                ) : (
                  <div className="inline-flex items-center text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">
                    Total-only entry
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end pl-4">
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2"><Money pesewas={cost.amount_pesewas} /></span>
                <div className="flex">
                  <button
                    onClick={() => { setEditingCostId(cost.id); setIsCostModalOpen(true); }}
                    className="text-gray-500 dark:text-gray-400 hover:text-emerald-500 transition-colors w-[36px] h-[36px] flex items-center justify-center"
                    title="Edit item"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button
                    onClick={() => { if (confirm('Delete this cost?')) deleteMutation.mutate(cost.id); }}
                    disabled={deleteMutation.isPending}
                    className="text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors w-[36px] h-[36px] flex items-center justify-center disabled:opacity-50"
                    title="Delete item"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isCostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm" onClick={() => setIsCostModalOpen(false)}></div>
          <div className="relative w-full max-w-2xl z-10 animate-fade-in-up">
            <AddCostForm
              seasonId={seasonId}
              initialCategory={cat}
              initialData={editingCost || undefined}
              onSuccess={() => { setIsCostModalOpen(false); setEditingCostId(null); }}
              onCancel={() => { setIsCostModalOpen(false); setEditingCostId(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
