import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCrops } from '../api/crops';
import { getCropBenchmarkBreakdown } from '../api/lab';
import { CATEGORIES } from '../lib/categories';
import type { CostCategory } from '../api/costs';
import { Money } from '../components/ui/Money';
import { InfoTip } from '../components/ui/InfoTip';

const WINDOWS = [
  { value: 'major', label: 'Major season' },
  { value: 'minor', label: 'Minor season' },
  { value: 'dry', label: 'Dry season' },
] as const;

export function Lab() {
  const [cropId, setCropId] = useState<number | null>(null);
  const [seasonWindow, setSeasonWindow] = useState<'major' | 'minor' | 'dry'>('major');
  const [acres, setAcres] = useState(1);
  const [amounts, setAmounts] = useState<Partial<Record<CostCategory, number>>>({});

  const { data: crops, isLoading: isCropsLoading } = useQuery({
    queryKey: ['crops'],
    queryFn: getCrops,
  });

  useEffect(() => {
    if (!cropId && crops && crops.length > 0) setCropId(crops[0].id);
  }, [crops, cropId]);

  const { data: benchmark, isLoading: isBenchmarkLoading } = useQuery({
    queryKey: ['labBenchmark', cropId, seasonWindow, acres],
    queryFn: () => getCropBenchmarkBreakdown(cropId as number, seasonWindow, acres),
    enabled: !!cropId && acres > 0,
  });

  // Re-seed the editable amounts from the real benchmark whenever the
  // crop, window, or acreage changes — the farmer's own tweaks from a
  // previous combination shouldn't silently carry over to a new one.
  useEffect(() => {
    if (!benchmark) return;
    const seeded: Partial<Record<CostCategory, number>> = {};
    benchmark.forEach((b) => { seeded[b.category] = b.benchmark_pesewas; });
    setAmounts(seeded);
  }, [benchmark]);

  const benchmarkTotal = useMemo(
    () => (benchmark || []).reduce((sum, b) => sum + b.benchmark_pesewas, 0),
    [benchmark]
  );
  const scenarioTotal = useMemo(
    () => Object.values(amounts).reduce((sum, v) => sum + (v || 0), 0),
    [amounts]
  );
  const scenarioPerAcre = acres > 0 ? Math.round(scenarioTotal / acres) : 0;
  const diffPct = benchmarkTotal > 0 ? Math.round(((scenarioTotal - benchmarkTotal) / benchmarkTotal) * 100) : 0;

  const resetToBenchmark = () => {
    if (!benchmark) return;
    const seeded: Partial<Record<CostCategory, number>> = {};
    benchmark.forEach((b) => { seeded[b.category] = b.benchmark_pesewas; });
    setAmounts(seeded);
  };

  const selectedCrop = crops?.find((c) => c.id === cropId);

  return (
    <div className="animate-fade-in-up pb-24 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <Link to="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Cost Lab</h1>
        <InfoTip text="A sandbox — nothing here is saved to a real season or counted anywhere else in the app. Pick a crop and acreage, then adjust any category to see how the total and per-acre cost move, before you commit to planting it for real." />
      </div>
      <p className="text-gray-500 dark:text-gray-400 font-medium text-sm mb-8">
        Try different costs and requirements against your farm before recording anything for real.
      </p>

      {/* Setup */}
      <div className="bg-white dark:bg-white/5 rounded-[24px] p-6 border border-gray-100 dark:border-white/10 shadow-sm mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Crop</label>
          <select
            value={cropId ?? ''}
            onChange={(e) => setCropId(Number(e.target.value))}
            disabled={isCropsLoading}
            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {crops?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Season window</label>
          <select
            value={seasonWindow}
            onChange={(e) => setSeasonWindow(e.target.value as any)}
            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {WINDOWS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Acres</label>
          <input
            type="number" min="0.1" step="0.1" value={acres}
            onChange={(e) => setAcres(parseFloat(e.target.value) || 0)}
            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {isBenchmarkLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        </div>
      ) : !benchmark || benchmark.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-white/5 rounded-[24px] border border-gray-100 dark:border-white/10">
          No benchmark norms exist for {selectedCrop?.name || 'this crop'} yet, so there's nothing to simulate against — try another crop.
        </div>
      ) : (
        <>
          {/* Sliders */}
          <div className="bg-white dark:bg-white/5 rounded-[24px] p-6 border border-gray-100 dark:border-white/10 shadow-sm mb-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Adjust each category</h2>
              <button onClick={resetToBenchmark} className="text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 underline decoration-gray-300 underline-offset-4">
                Reset to standard rates
              </button>
            </div>
            {benchmark.map((b) => {
              const config = CATEGORIES[b.category];
              const current = amounts[b.category] ?? b.benchmark_pesewas;
              const maxSlider = Math.max(b.benchmark_pesewas * 2, 100);
              return (
                <div key={b.category}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{config?.label || b.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 font-medium">standard <Money pesewas={b.benchmark_pesewas} /></span>
                      <span className="text-sm font-extrabold text-gray-900 dark:text-gray-100 w-24 text-right"><Money pesewas={current} /></span>
                    </div>
                  </div>
                  <input
                    type="range" min={0} max={maxSlider} step={1}
                    value={current}
                    onChange={(e) => setAmounts((prev) => ({ ...prev, [b.category]: Number(e.target.value) }))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-100 dark:bg-white/10 accent-emerald-600"
                  />
                </div>
              );
            })}
          </div>

          {/* Result */}
          <div className="bg-[#0a0a0a] rounded-[24px] p-6 md:p-8 text-white shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Scenario total</p>
              <p className="text-3xl font-light tracking-tight"><Money pesewas={scenarioTotal} /></p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Per acre</p>
              <p className="text-3xl font-light tracking-tight"><Money pesewas={scenarioPerAcre} /></p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Vs. standard rates</p>
              <p className={`text-3xl font-light tracking-tight ${diffPct > 0 ? 'text-amber-400' : diffPct < 0 ? 'text-emerald-400' : 'text-white'}`}>
                {diffPct > 0 ? '+' : ''}{diffPct}%
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
            This is a sandbox — to actually track a season, use <Link to="/season/new" className="underline font-bold text-emerald-600 dark:text-emerald-400">Start New Season</Link> instead.
          </p>
        </>
      )}
    </div>
  );
}
