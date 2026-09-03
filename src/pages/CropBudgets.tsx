import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useFarm } from '../hooks/useFarm';
import { getSeasonFilterOptions, listSeasons } from '../api/seasons';
import { getCropSummary } from '../api/dashboard';
import { listCropBudgets, setCropBudget, deleteCropBudget, type CropBudgetStatus } from '../api/cropBudgets';
import {
  getFarmBudget, setFarmBudget,
  listFarmCategoryBudgets, setFarmCategoryBudget, deleteFarmCategoryBudget,
  type FarmCategoryBudgetStatus,
} from '../api/farmBudgets';
import {
  listCropCategoryBudgets, setCropCategoryBudget, deleteCropCategoryBudget,
  type CropCategoryBudgetStatus,
} from '../api/cropCategoryBudgets';
import { CATEGORIES } from '../lib/categories';
import type { CostCategory } from '../api/costs';
import { Money } from '../components/ui/Money';
import { InfoTip } from '../components/ui/InfoTip';

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const CROP_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

const CATEGORY_EMOJI: Record<string, string> = {
  seeds: '🌱', fertiliser: '🧪', agrochem: '🧴', land_prep: '🚜',
  labour: '👷', transport: '🚛', storage: '📦', other: '📋',
};

type BudgetFilter = 'all' | 'over' | 'unset';

/**
 * Budgets — a dashboard, not just a settings form. Four tiers a farmer
 * can set spending caps at, reachable from one page (Settings → Account
 * Actions → "Budgets"), styled to match the Costs page's own dashboard
 * (stat cards, a donut breakdown, clickable cards with a progress bar):
 *
 *  1. Farm Budget — one overall ceiling for the whole farm (023).
 *  2. Budget by Category — that ceiling assigned across the 8 cost
 *     categories, farm-wide rather than tied to one season (023) —
 *     distinct from the per-season Category Budgets on SeasonDetail.tsx
 *     (015).
 *  3. Crop Budgets — one total cap per crop, across every season of it
 *     (022) — also editable in context from SeasonDetail.tsx.
 *  4. Crop x Category — the granular one a farmer actually plans in:
 *     "for Maize, Labour GHS 300, Seeds GHS 400" (024). Set by
 *     expanding a crop card in the By Crop view.
 *
 * Search narrows the visible cards by crop or category name; the All /
 * Over Budget / Not Set chips group them the way a farmer would
 * actually triage — "what's already blown" first, "what haven't I set
 * yet" second — rather than always scrolling a flat list of eight or
 * more cards.
 *
 * "Split by Season & Crop" is a read-only breakdown, not an editable
 * tier: how the farm's actual recorded spend already divides, using
 * data the app already computes (listSeasons, getCropSummary).
 */
export function CropBudgets() {
  const { farm } = useFarm();
  const farmId = farm?.id as number | undefined;
  const queryClient = useQueryClient();
  const [view, setView] = useState<'category' | 'crop'>('category');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<BudgetFilter>('all');

  const { data: farmBudget, isLoading: isLoadingFarmBudget } = useQuery({
    queryKey: ['farmBudget', farmId],
    queryFn: () => getFarmBudget(farmId!),
    enabled: !!farmId,
  });
  const { data: categoryBudgets, isLoading: isLoadingCategoryBudgets } = useQuery({
    queryKey: ['farmCategoryBudgets', farmId],
    queryFn: () => listFarmCategoryBudgets(farmId!),
    enabled: !!farmId,
  });
  const { data: cropBudgetsList, isLoading: isLoadingCropBudgets } = useQuery({
    queryKey: ['cropBudgets', farmId],
    queryFn: () => listCropBudgets(farmId!),
    enabled: !!farmId,
  });
  const { data: cropCategoryBudgetsList, isLoading: isLoadingCropCategoryBudgets } = useQuery({
    queryKey: ['cropCategoryBudgets', farmId],
    queryFn: () => listCropCategoryBudgets(farmId!),
    enabled: !!farmId,
  });

  const isLoading = isLoadingFarmBudget || isLoadingCategoryBudgets || isLoadingCropBudgets || isLoadingCropCategoryBudgets;
  const overBudgetCount =
    (categoryBudgets || []).filter((b) => b.is_over_budget).length +
    (cropBudgetsList || []).filter((b) => b.is_over_budget).length +
    (cropCategoryBudgetsList || []).filter((b) => b.is_over_budget).length +
    (farmBudget?.is_over_budget ? 1 : 0);
  const budgetsSetCount =
    (categoryBudgets?.length || 0) + (cropBudgetsList?.length || 0) + (cropCategoryBudgetsList?.length || 0) + (farmBudget ? 1 : 0);

  return (
    <div className="animate-fade-in-up pb-24 max-w-6xl mx-auto px-4 sm:px-0">
      <Link to="/profile" className="text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors flex items-center mb-6 group w-max">
        <span className="w-8 h-8 rounded-full bg-white dark:bg-white/5 shadow-sm flex items-center justify-center mr-3 group-hover:bg-gray-50 dark:group-hover:bg-white/10 transition-colors border border-gray-100 dark:border-white/10">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
        </span>
        Back to Settings
      </Link>

      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Budgets</h1>
        <InfoTip text="Your own spending caps — separate from the standard benchmark. Set one overall ceiling for the farm, assign it across categories, cap a specific crop, or go granular with a category inside one crop, all independent of each other." />
      </div>
      <p className="text-gray-500 dark:text-gray-400 font-medium text-sm mb-8">Spending caps for the whole farm, by category, or by crop.</p>

      {!farmId || isLoading ? (
        <div className="animate-pulse">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-gray-200 dark:bg-white/10 rounded-2xl"></div>)}
          </div>
          <div className="h-64 bg-gray-200 dark:bg-white/10 rounded-[32px]"></div>
        </div>
      ) : (
        <>
          {/* Dashboard stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-white/5 rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Farm Budget</p>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
                {farmBudget ? <Money pesewas={farmBudget.limit_pesewas} /> : '—'}
              </p>
            </div>
            <div className="bg-white dark:bg-white/5 rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Farm Spent</p>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
                {farmBudget ? <Money pesewas={farmBudget.spent_pesewas} /> : '—'}
              </p>
            </div>
            <div className="bg-white dark:bg-white/5 rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Budgets Set</p>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{budgetsSetCount}</p>
            </div>
            <div className={`rounded-2xl p-5 border shadow-sm ${overBudgetCount > 0 ? 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20' : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/10'}`}>
              <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${overBudgetCount > 0 ? 'text-red-500' : 'text-gray-400'}`}>Over Budget</p>
              <p className={`text-2xl font-extrabold ${overBudgetCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>{overBudgetCount}</p>
            </div>
          </div>

          {/* Farm Budget — hero card */}
          <FarmBudgetHero farmId={farmId} status={farmBudget ?? null} queryClient={queryClient} />

          {/* Donut: how the farm budget is allocated by category */}
          {categoryBudgets && categoryBudgets.length > 0 && (
            <div className="bg-white dark:bg-[#121212] rounded-[32px] p-6 sm:p-8 border border-gray-100 dark:border-white/5 shadow-[0_8px_40px_rgb(0,0,0,0.03)] mb-8">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">How your budget is allocated</h3>
                <InfoTip text="Each slice is a category's share of the total you've assigned below — not of actual spend." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBudgets.map((b) => ({ name: CATEGORIES[b.category]?.label || b.category, value: b.limit_pesewas / 100 }))}
                        dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}
                      >
                        {categoryBudgets.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />)}
                      </Pie>
                      <Tooltip formatter={(v) => `₵${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {categoryBudgets.map((b, i) => (
                    <div key={b.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        {CATEGORIES[b.category]?.label || b.category}
                      </span>
                      <span className="font-bold text-gray-900 dark:text-gray-100"><Money pesewas={b.limit_pesewas} /></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Toggle + Search + Filter */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Set a Budget</h2>
              <div className="flex bg-gray-100 dark:bg-white/10 p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setView('category')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${view === 'category' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  By Category
                </button>
                <button
                  onClick={() => setView('crop')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${view === 'crop' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  By Crop
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1 sm:max-w-xs">
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  placeholder={view === 'category' ? 'Search category...' : 'Search crop...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 rounded-xl text-sm w-full focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                />
              </div>
              <div className="flex bg-gray-100 dark:bg-white/10 p-1 rounded-xl shrink-0">
                {([['all', 'All'], ['over', 'Over Budget'], ['unset', 'Not Set']] as [BudgetFilter, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors ${filter === key ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {view === 'category' ? (
            <CategoryBudgetGrid farmId={farmId} budgets={categoryBudgets || []} queryClient={queryClient} search={search} filter={filter} />
          ) : (
            <CropBudgetGrid farmId={farmId} budgets={cropBudgetsList || []} categoryBudgets={cropCategoryBudgetsList || []} queryClient={queryClient} search={search} filter={filter} />
          )}

          {/* Read-only breakdown of actual spend */}
          <SplitBreakdownSection farmId={farmId} />
        </>
      )}
    </div>
  );
}

function ProgressBar({ pct, isOver }: { pct: number; isOver: boolean }) {
  const clamped = Math.min(100, pct);
  return (
    <div className="w-full bg-gray-100 dark:bg-white/10 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : clamped > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function matchesFilter(status: { is_over_budget: boolean } | undefined, filter: BudgetFilter): boolean {
  if (filter === 'over') return !!status?.is_over_budget;
  if (filter === 'unset') return !status;
  return true;
}

// ── Farm Budget — hero card, matching the Costs page's card language ─
function FarmBudgetHero({ farmId, status, queryClient }: { farmId: number; status: import('../api/farmBudgets').FarmBudgetStatus | null; queryClient: ReturnType<typeof useQueryClient> }) {
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState('');

  const saveMutation = useMutation({
    mutationFn: (limitPesewas: number) => setFarmBudget(farmId, limitPesewas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmBudget', farmId] });
      setIsEditing(false);
      setAmount('');
    },
  });

  return (
    <div className="bg-white dark:bg-[#121212] rounded-[32px] p-6 sm:p-8 border border-gray-100 dark:border-white/5 shadow-[0_8px_40px_rgb(0,0,0,0.03)] mb-8">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Farm Budget</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">One overall cap for the entire farm — every season, every crop, every category combined.</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => { setAmount(status ? String(status.limit_pesewas / 100) : ''); setIsEditing(true); }}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-3 py-2 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            {status ? 'Edit' : 'Set Budget'}
          </button>
        )}
      </div>

      {isEditing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!amount || Number(amount) <= 0) return;
            saveMutation.mutate(Math.round(Number(amount) * 100));
          }}
          className="flex items-center gap-3"
        >
          <input
            type="number" min="0.01" step="0.01" required autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Total limit (GHS)"
            className="flex-1 px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <button type="submit" disabled={saveMutation.isPending} className="py-2.5 px-4 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50 text-sm">
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={() => setIsEditing(false)} className="py-2.5 px-4 font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors text-sm">
            Cancel
          </button>
        </form>
      ) : status ? (
        <div>
          <div className="flex justify-between items-end mb-2">
            <span className={`text-sm font-bold ${status.is_over_budget ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
              <Money pesewas={status.spent_pesewas} /> / <Money pesewas={status.limit_pesewas} /> spent
            </span>
            <span className="text-xs font-bold text-gray-400">{Math.round(status.pct_used ?? 0)}%</span>
          </div>
          <ProgressBar pct={status.pct_used ?? 0} isOver={status.is_over_budget} />
          {status.is_over_budget && (
            <p className="text-xs font-bold text-red-500 mt-2"><Money pesewas={status.spent_pesewas - status.limit_pesewas} /> over budget</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">No farm budget set — tap "Set Budget" to cap your total spend for the whole farm.</p>
      )}
    </div>
  );
}

// ── Budget by Category — card grid, matching the Costs page's cards ──
function CategoryBudgetGrid({ farmId, budgets, queryClient, search, filter }: { farmId: number; budgets: FarmCategoryBudgetStatus[]; queryClient: ReturnType<typeof useQueryClient>; search: string; filter: BudgetFilter }) {
  const [editingCategory, setEditingCategory] = useState<CostCategory | null>(null);
  const [amount, setAmount] = useState('');

  const budgetByCategory = new Map(budgets.map((b) => [b.category, b]));
  const q = search.trim().toLowerCase();

  const saveMutation = useMutation({
    mutationFn: ({ category, limitPesewas }: { category: CostCategory; limitPesewas: number }) => setFarmCategoryBudget(farmId, category, limitPesewas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmCategoryBudgets', farmId] });
      setEditingCategory(null);
      setAmount('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (budgetId: number) => deleteFarmCategoryBudget(budgetId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['farmCategoryBudgets', farmId] }),
  });

  const visibleCategories = (Object.keys(CATEGORIES) as CostCategory[]).filter((cat) => {
    const status = budgetByCategory.get(cat);
    if (q && !CATEGORIES[cat].label.toLowerCase().includes(q)) return false;
    return matchesFilter(status, filter);
  });

  if (visibleCategories.length === 0) {
    return <div className="text-center py-12 text-gray-500 dark:text-gray-400 font-medium mb-8">No categories match.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
      {visibleCategories.map((cat) => {
        const status = budgetByCategory.get(cat);
        const isEditing = editingCategory === cat;
        const pct = status ? Math.min(100, status.pct_used ?? 0) : 0;

        return (
          <div
            key={cat}
            className={`bg-white dark:bg-white/5 rounded-2xl border shadow-sm transition-all p-5 ${status?.is_over_budget ? 'border-red-200 dark:border-red-500/30' : 'border-gray-100 dark:border-white/10 hover:border-emerald-200 dark:hover:border-emerald-800'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                  <span className="text-lg">{CATEGORY_EMOJI[cat]}</span>
                </div>
                <div>
                  <Link to={`/costs/category/${cat}`} className="font-bold text-gray-900 dark:text-gray-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                    {CATEGORIES[cat].label}
                  </Link>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {status ? <><Money pesewas={status.spent_pesewas} /> spent</> : 'Not assigned yet'}
                  </p>
                </div>
              </div>
              {!isEditing && (
                <div className="flex items-center gap-1 shrink-0">
                  {status && (
                    <button onClick={() => deleteMutation.mutate(status.id)} className="p-2 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors" title="Remove">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                  <button
                    onClick={() => { setEditingCategory(cat); setAmount(status ? String(status.limit_pesewas / 100) : ''); }}
                    className="p-2 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    title={status ? 'Edit' : 'Assign a budget'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!amount || Number(amount) <= 0) return;
                  saveMutation.mutate({ category: cat, limitPesewas: Math.round(Number(amount) * 100) });
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="number" min="0.01" step="0.01" required autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="GHS"
                  className="flex-1 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <button type="submit" disabled={saveMutation.isPending} className="py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50">Save</button>
                <button type="button" onClick={() => setEditingCategory(null)} className="py-2 px-3 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors">Cancel</button>
              </form>
            ) : status ? (
              <>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Limit <Money pesewas={status.limit_pesewas} /></span>
                  <span className={`text-xs font-bold ${status.is_over_budget ? 'text-red-500' : 'text-gray-400'}`}>{Math.round(pct)}%</span>
                </div>
                <ProgressBar pct={pct} isOver={status.is_over_budget} />
                {status.is_over_budget && (
                  <p className="text-xs font-bold text-red-500 mt-1.5"><Money pesewas={status.spent_pesewas - status.limit_pesewas} /> over</p>
                )}
              </>
            ) : (
              <div className="h-2" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Crop Budgets — card grid, each expandable into per-category caps ─
function CropBudgetGrid({ farmId, budgets, categoryBudgets, queryClient, search, filter }: {
  farmId: number; budgets: CropBudgetStatus[]; categoryBudgets: CropCategoryBudgetStatus[];
  queryClient: ReturnType<typeof useQueryClient>; search: string; filter: BudgetFilter;
}) {
  const [editingCropId, setEditingCropId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [expandedCropId, setExpandedCropId] = useState<number | null>(null);

  const { data: filterOptions, isLoading } = useQuery({
    queryKey: ['seasonFilterOptions', farmId],
    queryFn: () => getSeasonFilterOptions(farmId),
  });

  const budgetByCropId = new Map(budgets.map((b) => [b.crop_id, b]));
  const q = search.trim().toLowerCase();

  const saveMutation = useMutation({
    mutationFn: ({ cropId, limitPesewas }: { cropId: number; limitPesewas: number }) => setCropBudget(farmId, cropId, limitPesewas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cropBudgets', farmId] });
      setEditingCropId(null);
      setAmount('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (budgetId: number) => deleteCropBudget(budgetId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cropBudgets', farmId] }),
  });

  const crops = filterOptions?.crops || [];

  const visibleCrops = crops.filter((crop) => {
    const status = budgetByCropId.get(crop.id);
    const cropCats = categoryBudgets.filter((b) => b.crop_id === crop.id);
    if (q && !crop.name.toLowerCase().includes(q)) return false;
    // A crop stays visible under Over/Not Set if EITHER its own total
    // budget or any of its per-category budgets matches — a farmer
    // filtering "Over Budget" wants to see Maize even if only its
    // Fertiliser line is over, not just when the crop total itself is.
    if (filter === 'all') return true;
    if (filter === 'over') return !!status?.is_over_budget || cropCats.some((c) => c.is_over_budget);
    return !status; // 'unset' — crop has no total budget yet
  });

  if (isLoading) return <div className="p-12 text-center text-gray-500 dark:text-gray-400 text-sm mb-8">Loading...</div>;

  if (crops.length === 0) {
    return (
      <div className="bg-white dark:bg-white/5 rounded-[24px] border border-gray-100 dark:border-white/10 p-12 text-center mb-8">
        <p className="text-gray-500 dark:text-gray-400 font-medium">No crops recorded yet.</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Start a season to grow a crop, then come back here to cap what you're willing to spend on it.</p>
      </div>
    );
  }

  if (visibleCrops.length === 0) {
    return <div className="text-center py-12 text-gray-500 dark:text-gray-400 font-medium mb-8">No crops match.</div>;
  }

  return (
    <div className="space-y-4 mb-8">
      {visibleCrops.map((crop, i) => {
        const status = budgetByCropId.get(crop.id);
        const isEditing = editingCropId === crop.id;
        const pct = status ? Math.min(100, status.pct_used ?? 0) : 0;
        const isExpanded = expandedCropId === crop.id;
        const cropCategoryCount = categoryBudgets.filter((b) => b.crop_id === crop.id).length;

        return (
          <div
            key={crop.id}
            className={`bg-white dark:bg-white/5 rounded-2xl border shadow-sm transition-all p-5 ${status?.is_over_budget ? 'border-red-200 dark:border-red-500/30' : 'border-gray-100 dark:border-white/10 hover:border-emerald-200 dark:hover:border-emerald-800'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setExpandedCropId(isExpanded ? null : crop.id)}
                className="flex items-center gap-3 text-left flex-1 min-w-0"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${CROP_COLORS[i % CROP_COLORS.length]}20` }}>
                  <span className="text-lg">🌾</span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 truncate">
                    {crop.name}
                    <svg className={`w-4 h-4 text-gray-300 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {status ? <><Money pesewas={status.spent_pesewas} /> spent</> : 'No budget set'}
                    {cropCategoryCount > 0 && ` · ${cropCategoryCount} categor${cropCategoryCount === 1 ? 'y' : 'ies'} assigned`}
                  </p>
                </div>
              </button>
              {!isEditing && (
                <div className="flex items-center gap-1 shrink-0">
                  {status && (
                    <button onClick={() => deleteMutation.mutate(status.id)} className="p-2 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors" title="Remove">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                  <button
                    onClick={() => { setEditingCropId(crop.id); setAmount(status ? String(status.limit_pesewas / 100) : ''); }}
                    className="p-2 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    title={status ? 'Edit total' : 'Set a total budget'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!amount || Number(amount) <= 0) return;
                  saveMutation.mutate({ cropId: crop.id, limitPesewas: Math.round(Number(amount) * 100) });
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="number" min="0.01" step="0.01" required autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Total limit (GHS)"
                  className="flex-1 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <button type="submit" disabled={saveMutation.isPending} className="py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50">Save</button>
                <button type="button" onClick={() => setEditingCropId(null)} className="py-2 px-3 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors">Cancel</button>
              </form>
            ) : status ? (
              <>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Limit <Money pesewas={status.limit_pesewas} /></span>
                  <span className={`text-xs font-bold ${status.is_over_budget ? 'text-red-500' : 'text-gray-400'}`}>{Math.round(pct)}%</span>
                </div>
                <ProgressBar pct={pct} isOver={status.is_over_budget} />
                {status.is_over_budget && (
                  <p className="text-xs font-bold text-red-500 mt-1.5"><Money pesewas={status.spent_pesewas - status.limit_pesewas} /> over</p>
                )}
              </>
            ) : (
              <div className="h-2" />
            )}

            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/10">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Budget by category, for {crop.name} only</p>
                <CropCategoryRows
                  farmId={farmId}
                  cropId={crop.id}
                  cropName={crop.name}
                  budgets={categoryBudgets.filter((b) => b.crop_id === crop.id)}
                  queryClient={queryClient}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Per-crop category rows — "for Maize: Labour 300, Seeds 400" ──────
function CropCategoryRows({ farmId, cropId, cropName, budgets, queryClient }: {
  farmId: number; cropId: number; cropName: string; budgets: CropCategoryBudgetStatus[];
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [editingCategory, setEditingCategory] = useState<CostCategory | null>(null);
  const [amount, setAmount] = useState('');

  const budgetByCategory = new Map(budgets.map((b) => [b.category, b]));

  const saveMutation = useMutation({
    mutationFn: ({ category, limitPesewas }: { category: CostCategory; limitPesewas: number }) => setCropCategoryBudget(farmId, cropId, category, limitPesewas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cropCategoryBudgets', farmId] });
      setEditingCategory(null);
      setAmount('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (budgetId: number) => deleteCropCategoryBudget(budgetId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cropCategoryBudgets', farmId] }),
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {(Object.keys(CATEGORIES) as CostCategory[]).map((cat) => {
        const status = budgetByCategory.get(cat);
        const isEditing = editingCategory === cat;
        const pct = status ? Math.min(100, status.pct_used ?? 0) : 0;

        return (
          <div key={cat} className="bg-gray-50 dark:bg-white/[0.03] rounded-xl p-3">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <span>{CATEGORY_EMOJI[cat]}</span> {CATEGORIES[cat].label}
              </span>
              {!isEditing && (
                <div className="flex items-center gap-1 shrink-0">
                  {status && (
                    <button onClick={() => deleteMutation.mutate(status.id)} className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors" title="Remove">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                  <button
                    onClick={() => { setEditingCategory(cat); setAmount(status ? String(status.limit_pesewas / 100) : ''); }}
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    {status ? 'Edit' : 'Set'}
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!amount || Number(amount) <= 0) return;
                  saveMutation.mutate({ category: cat, limitPesewas: Math.round(Number(amount) * 100) });
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="number" min="0.01" step="0.01" required autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="GHS"
                  className="flex-1 px-2 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none min-w-0"
                />
                <button type="submit" disabled={saveMutation.isPending} className="py-1.5 px-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 shrink-0">Save</button>
                <button type="button" onClick={() => setEditingCategory(null)} className="py-1.5 px-2 text-xs font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors shrink-0">✕</button>
              </form>
            ) : status ? (
              <>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400"><Money pesewas={status.spent_pesewas} /> / <Money pesewas={status.limit_pesewas} /></span>
                  <span className={`text-[11px] font-bold ${status.is_over_budget ? 'text-red-500' : 'text-gray-400'}`}>{Math.round(pct)}%</span>
                </div>
                <ProgressBar pct={pct} isOver={status.is_over_budget} />
              </>
            ) : (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 italic">Not set for {cropName} yet.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Split by Season & Crop — read-only breakdown of actual spend ─────
function SplitBreakdownSection({ farmId }: { farmId: number }) {
  const { data: crops } = useQuery({
    queryKey: ['cropSummary', farmId],
    queryFn: () => getCropSummary(farmId),
  });
  const { data: seasons } = useQuery({
    queryKey: ['seasonsSummary', farmId],
    queryFn: () => listSeasons(farmId),
  });

  const farmTotal = (crops || []).reduce((sum, c) => sum + c.total_recorded_pesewas, 0);

  if (!crops?.length && !seasons?.length) return null;

  return (
    <div className="bg-white dark:bg-[#121212] rounded-[32px] p-6 sm:p-8 border border-gray-100 dark:border-white/5 shadow-[0_8px_40px_rgb(0,0,0,0.03)]">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">How It Splits — Season &amp; Crop</h3>
        <InfoTip text="A read-only picture of how your actual recorded spend divides up — not a separate set of caps to maintain." />
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">By Crop</h4>
          <div className="space-y-2">
            {(crops || []).map((c) => {
              const pct = farmTotal > 0 ? Math.round((c.total_recorded_pesewas / farmTotal) * 100) : 0;
              return (
                <div key={c.crop_id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{c.crop_name}</span>
                  <span className="text-gray-500 dark:text-gray-400"><Money pesewas={c.total_recorded_pesewas} /> <span className="text-xs">({pct}%)</span></span>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">By Season</h4>
          <div className="space-y-2">
            {(seasons || []).map((s) => {
              const pct = farmTotal > 0 ? Math.round((s.total_cost_pesewas / farmTotal) * 100) : 0;
              return (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300 font-medium capitalize">{s.crop_name} · {s.season_window} {s.year}</span>
                  <span className="text-gray-500 dark:text-gray-400"><Money pesewas={s.total_cost_pesewas} /> <span className="text-xs">({pct}%)</span></span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
