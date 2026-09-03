import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFarm } from '../hooks/useFarm';
import { getSeasonFilterOptions, listSeasons } from '../api/seasons';
import { getCropSummary } from '../api/dashboard';
import { listCropBudgets, setCropBudget, deleteCropBudget, type CropBudgetStatus } from '../api/cropBudgets';
import {
  getFarmBudget, setFarmBudget,
  listFarmCategoryBudgets, setFarmCategoryBudget, deleteFarmCategoryBudget,
} from '../api/farmBudgets';
import { CATEGORIES } from '../lib/categories';
import type { CostCategory } from '../api/costs';
import { Money } from '../components/ui/Money';

/**
 * Budgets — three tiers a farmer can set spending caps at, all
 * reachable from one page (Settings → Account Actions → "Budgets"):
 *
 *  1. Farm Budget — one overall ceiling for the whole farm (migration 023).
 *  2. Budget by Category — that same ceiling optionally assigned across
 *     the 8 cost categories, farm-wide rather than tied to one season
 *     (migration 023) — distinct from the per-season Category Budgets
 *     already on SeasonDetail.tsx (migration 015).
 *  3. Crop Budgets — one total cap per crop, across every season of it
 *     (migration 022) — also editable in context from SeasonDetail.tsx.
 *
 * "Split by Season & Crop" is a read-only breakdown, not a fourth
 * editable tier: it shows how the farm's actual recorded spend already
 * divides across seasons and crops, against the same farm total, using
 * data the app already computes (listSeasons, getCropSummary) rather
 * than asking a farmer to manually reconcile a second set of numbers.
 */
export function CropBudgets() {
  const { farm } = useFarm();
  const farmId = farm?.id as number | undefined;
  const queryClient = useQueryClient();

  return (
    <div className="max-w-2xl mx-auto py-8 px-6 lg:px-8 animate-fade-in pb-24">
      <Link to="/profile" className="text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors flex items-center mb-6 group w-max">
        <span className="w-8 h-8 rounded-full bg-white dark:bg-white/5 shadow-sm flex items-center justify-center mr-3 group-hover:bg-gray-50 dark:group-hover:bg-white/10 transition-colors border border-gray-100 dark:border-white/10">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
        </span>
        Back to Settings
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Budgets</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Set spending caps for the whole farm, by category, or by crop — all separate from the standard benchmark.
        </p>
      </div>

      {farmId && (
        <div className="space-y-8">
          <FarmBudgetSection farmId={farmId} queryClient={queryClient} />
          <FarmCategoryBudgetsSection farmId={farmId} queryClient={queryClient} />
          <SplitBreakdownSection farmId={farmId} />
          <CropBudgetsSection farmId={farmId} queryClient={queryClient} />
        </div>
      )}
    </div>
  );
}

function ProgressBar({ pct, isOver }: { pct: number; isOver: boolean }) {
  const clamped = Math.min(100, pct);
  return (
    <div className="h-2.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : clamped > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

// ── 1. Farm Budget — one overall ceiling for the whole farm ──────────
function FarmBudgetSection({ farmId, queryClient }: { farmId: number; queryClient: ReturnType<typeof useQueryClient> }) {
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState('');

  const { data: status, isLoading } = useQuery({
    queryKey: ['farmBudget', farmId],
    queryFn: () => getFarmBudget(farmId),
  });

  const saveMutation = useMutation({
    mutationFn: (limitPesewas: number) => setFarmBudget(farmId, limitPesewas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmBudget', farmId] });
      setIsEditing(false);
      setAmount('');
    },
  });

  return (
    <section className="bg-white dark:bg-white/5 rounded-[24px] border border-gray-100 dark:border-white/10 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Farm Budget</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">One overall cap for the entire farm — every season, every crop, every category combined.</p>
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

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : isEditing ? (
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
          <div className="flex justify-between items-end mb-1.5">
            <span className={`text-xs font-bold ${status.is_over_budget ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
              <Money pesewas={status.spent_pesewas} /> / <Money pesewas={status.limit_pesewas} /> spent
            </span>
          </div>
          <ProgressBar pct={status.pct_used ?? 0} isOver={status.is_over_budget} />
          {status.is_over_budget && (
            <p className="text-xs font-bold text-red-500 mt-1"><Money pesewas={status.spent_pesewas - status.limit_pesewas} /> over budget</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">No farm budget set — tap "Set Budget" to cap your total spend for the whole farm.</p>
      )}
    </section>
  );
}

// ── 2. Budget by Category — the farm total assigned across categories ─
function FarmCategoryBudgetsSection({ farmId, queryClient }: { farmId: number; queryClient: ReturnType<typeof useQueryClient> }) {
  const [editingCategory, setEditingCategory] = useState<CostCategory | null>(null);
  const [amount, setAmount] = useState('');

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['farmCategoryBudgets', farmId],
    queryFn: () => listFarmCategoryBudgets(farmId),
  });

  const budgetByCategory = new Map((budgets || []).map((b) => [b.category, b]));

  const saveMutation = useMutation({
    mutationFn: ({ category, limitPesewas }: { category: CostCategory; limitPesewas: number }) =>
      setFarmCategoryBudget(farmId, category, limitPesewas),
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

  const assignedTotal = (budgets || []).reduce((sum, b) => sum + b.limit_pesewas, 0);

  return (
    <section className="bg-white dark:bg-white/5 rounded-[24px] border border-gray-100 dark:border-white/10 p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Budget by Category</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Assign part of your farm budget to each category, farm-wide — not tied to one season.
          {(budgets?.length ?? 0) > 0 && <> Assigned so far: <Money pesewas={assignedTotal} />.</>}
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-4">
          {(Object.keys(CATEGORIES) as CostCategory[]).map((cat) => {
            const status = budgetByCategory.get(cat);
            const isEditing = editingCategory === cat;

            return (
              <div key={cat}>
                <div className="flex items-center justify-between gap-4 mb-1.5">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{CATEGORIES[cat].label}</span>
                  {!isEditing && (
                    <div className="flex items-center gap-2 shrink-0">
                      {status && (
                        <span className={`text-xs font-bold ${status.is_over_budget ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                          <Money pesewas={status.spent_pesewas} /> / <Money pesewas={status.limit_pesewas} />
                        </span>
                      )}
                      {status && (
                        <button onClick={() => deleteMutation.mutate(status.id)} className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors" title="Remove">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                      <button
                        onClick={() => { setEditingCategory(cat); setAmount(status ? String(status.limit_pesewas / 100) : ''); }}
                        className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        {status ? 'Edit' : 'Assign'}
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
                    <button type="submit" disabled={saveMutation.isPending} className="py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50">
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingCategory(null)} className="py-2 px-3 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors">
                      Cancel
                    </button>
                  </form>
                ) : status ? (
                  <ProgressBar pct={status.pct_used ?? 0} isOver={status.is_over_budget} />
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic">Not assigned yet.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── 3. Split by Season & Crop — read-only breakdown of actual spend ──
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
    <section className="bg-white dark:bg-white/5 rounded-[24px] border border-gray-100 dark:border-white/10 p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">How It Splits — Season &amp; Crop</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">How your recorded spend divides up, against the Farm Budget above. Read-only — a picture of what's actually been recorded, not a separate set of caps to maintain.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">By Crop</h3>
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
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">By Season</h3>
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
    </section>
  );
}

// ── 4. Crop Budgets — one total cap per crop, across every season ────
function CropBudgetsSection({ farmId, queryClient }: { farmId: number; queryClient: ReturnType<typeof useQueryClient> }) {
  const [editingCropId, setEditingCropId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');

  const { data: filterOptions } = useQuery({
    queryKey: ['seasonFilterOptions', farmId],
    queryFn: () => getSeasonFilterOptions(farmId),
  });

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['cropBudgets', farmId],
    queryFn: () => listCropBudgets(farmId),
  });

  const budgetByCropId = new Map((budgets || []).map((b) => [b.crop_id, b]));

  const saveMutation = useMutation({
    mutationFn: ({ cropId, limitPesewas }: { cropId: number; limitPesewas: number }) =>
      setCropBudget(farmId, cropId, limitPesewas),
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

  const startEditing = (cropId: number, existing?: CropBudgetStatus) => {
    setEditingCropId(cropId);
    setAmount(existing ? String(existing.limit_pesewas / 100) : '');
  };

  const crops = filterOptions?.crops || [];

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 ml-1">Crop Budgets</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-1">A total spending cap per crop, across every season you've grown it.</p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-gray-500 dark:text-gray-400 text-sm">Loading...</div>
      ) : crops.length === 0 ? (
        <div className="bg-white dark:bg-white/5 rounded-[24px] border border-gray-100 dark:border-white/10 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 font-medium">No crops recorded yet.</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Start a season to grow a crop, then come back here to cap what you're willing to spend on it.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-white/5 rounded-[24px] border border-gray-100 dark:border-white/10 overflow-hidden divide-y divide-gray-50 dark:divide-white/5">
          {crops.map((crop) => {
            const status = budgetByCropId.get(crop.id);
            const isEditing = editingCropId === crop.id;

            return (
              <div key={crop.id} className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{crop.name}</h3>
                  {!isEditing && (
                    <div className="flex items-center gap-2 shrink-0">
                      {status && (
                        <button
                          onClick={() => deleteMutation.mutate(status.id)}
                          className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors"
                          title="Remove budget"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                      <button
                        onClick={() => startEditing(crop.id, status)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-3 py-2 rounded-xl transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        {status ? 'Edit Budget' : 'Set Budget'}
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
                    className="flex items-center gap-3 mt-3"
                  >
                    <input
                      type="number" min="0.01" step="0.01" required autoFocus
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Total limit (GHS)"
                      className="flex-1 px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={saveMutation.isPending}
                      className="py-2.5 px-4 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50 text-sm"
                    >
                      {saveMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingCropId(null); setAmount(''); }}
                      className="py-2.5 px-4 font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </form>
                ) : status ? (
                  <div className="mt-1">
                    <div className="flex justify-between items-end mb-1.5">
                      <span className={`text-xs font-bold ${status.is_over_budget ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                        <Money pesewas={status.spent_pesewas} /> / <Money pesewas={status.limit_pesewas} /> spent
                      </span>
                    </div>
                    <ProgressBar pct={status.pct_used ?? 0} isOver={status.is_over_budget} />
                    {status.is_over_budget && (
                      <p className="text-xs font-bold text-red-500 mt-1">
                        <Money pesewas={status.spent_pesewas - status.limit_pesewas} /> over budget
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">No budget set — tap "Set Budget" to cap your total spend on this crop.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
