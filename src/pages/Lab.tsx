import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCrops } from '../api/crops';
import { getCropBenchmarkLines } from '../api/lab';
import type { CropBenchmarkInputLine } from '../api/lab';
import { CATEGORIES } from '../lib/categories';
import { Money } from '../components/ui/Money';
import { InfoTip } from '../components/ui/InfoTip';

const WINDOWS = [
  { value: 'major', label: 'Major season' },
  { value: 'minor', label: 'Minor season' },
  { value: 'dry', label: 'Dry season' },
] as const;

function lineKey(l: { category: string; input_name: string }) {
  return `${l.category}::${l.input_name}`;
}

function formatUnit(unit: string) {
  return unit.replace(/_/g, '-');
}

export function Lab() {
  const [cropId, setCropId] = useState<number | null>(null);
  const [seasonWindow, setSeasonWindow] = useState<'major' | 'minor' | 'dry'>('major');
  const [acres, setAcres] = useState(1);
  // Keyed by lineKey() — the real-world QUANTITY the farmer is exploring
  // (person-days, bags, litres...), not a cedi amount directly.
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const { data: crops, isLoading: isCropsLoading } = useQuery({
    queryKey: ['crops'],
    queryFn: getCrops,
  });

  useEffect(() => {
    if (!cropId && crops && crops.length > 0) setCropId(crops[0].id);
  }, [crops, cropId]);

  const { data: lines, isLoading: isLinesLoading } = useQuery({
    queryKey: ['labLines', cropId, seasonWindow, acres],
    queryFn: () => getCropBenchmarkLines(cropId as number, seasonWindow, acres),
    enabled: !!cropId && acres > 0,
  });

  // Re-seed quantities from the real per-acre norms whenever the crop,
  // window, or acreage changes — a tweak made for one combination
  // shouldn't silently carry over to a different one.
  useEffect(() => {
    if (!lines) return;
    const seeded: Record<string, number> = {};
    lines.forEach((l) => { seeded[lineKey(l)] = l.quantity_total; });
    setQuantities(seeded);
  }, [lines]);

  const resetToStandard = () => {
    if (!lines) return;
    const seeded: Record<string, number> = {};
    lines.forEach((l) => { seeded[lineKey(l)] = l.quantity_total; });
    setQuantities(seeded);
  };

  const linesByCategory = useMemo(() => {
    const grouped: Record<string, CropBenchmarkInputLine[]> = {};
    (lines || []).forEach((l) => {
      if (!grouped[l.category]) grouped[l.category] = [];
      grouped[l.category].push(l);
    });
    return grouped;
  }, [lines]);

  const costOf = (l: CropBenchmarkInputLine) => {
    const qty = quantities[lineKey(l)] ?? l.quantity_total;
    return Math.round(qty * l.unit_price_pesewas);
  };

  const standardTotal = useMemo(
    () => (lines || []).reduce((sum, l) => sum + Math.round(l.quantity_total * l.unit_price_pesewas), 0),
    [lines]
  );
  const scenarioTotal = useMemo(
    () => (lines || []).reduce((sum, l) => sum + costOf(l), 0),
    [lines, quantities]
  );
  const scenarioPerAcre = acres > 0 ? Math.round(scenarioTotal / acres) : 0;
  const diffPct = standardTotal > 0 ? Math.round(((scenarioTotal - standardTotal) / standardTotal) * 100) : 0;

  const selectedCrop = crops?.find((c) => c.id === cropId);

  const interpretation = diffPct === 0
    ? `That matches the standard rate for ${selectedCrop?.name || 'this crop'} at ${acres} acre${acres === 1 ? '' : 's'}.`
    : diffPct > 0
      ? `That's ${diffPct}% more than the standard rate for ${selectedCrop?.name || 'this crop'} at ${acres} acre${acres === 1 ? '' : 's'} — GHS ${((scenarioTotal - standardTotal) / 100).toFixed(2)} above it.`
      : `That's ${Math.abs(diffPct)}% less than the standard rate for ${selectedCrop?.name || 'this crop'} at ${acres} acre${acres === 1 ? '' : 's'} — GHS ${((standardTotal - scenarioTotal) / 100).toFixed(2)} below it.`;

  return (
    <div className="animate-fade-in-up pb-24 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <Link to="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Cost Lab</h1>
        <InfoTip
          variant="card"
          title="What is Cost Lab?"
          text="A sandbox — nothing here is saved to a real season or counted anywhere else in the app. Pick a crop and acreage, then adjust any input's real-world quantity (bags of fertiliser, person-days of labour) to see how the total and per-acre cost move, before you spend a single cedi or commit to planting it for real."
          example="A farmer planning to grow 3 acres of maize next season opens Cost Lab, picks Maize and 3 acres, then drags the fertiliser slider from the standard 15 bags up to 20 bags. The total jumps from about GHS 1,200 to GHS 1,600 instantly — so she knows exactly what buying extra fertiliser will cost her before she ever goes to the market, and can decide if it's worth it, all without recording anything real yet."
        />
      </div>
      <p className="text-gray-500 dark:text-gray-400 font-medium text-sm mb-6">
        Try different quantities and requirements against your farm before recording anything for real.
      </p>

      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-4 mb-8">
        <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <p className="text-sm text-blue-900 dark:text-blue-300 font-medium leading-relaxed">
          <strong>What this is for:</strong> answering "what would this actually cost me?" before you plant anything. Pick a crop, a season, and your acreage below — every input (e.g. "20 person-days of labour," "5 bags of NPK") starts at the real standard quantity and rate. Drag any slider to explore hiring more or fewer people, buying more or less fertiliser, and so on — the cost updates as quantity &times; rate, and the summary at the bottom tells you in plain language what that scenario means next to the standard rate.
        </p>
      </div>

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

      {isLinesLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        </div>
      ) : !lines || lines.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-white/5 rounded-[24px] border border-gray-100 dark:border-white/10">
          No benchmark norms exist for {selectedCrop?.name || 'this crop'} yet, so there's nothing to simulate against — try another crop.
        </div>
      ) : (
        <>
          {/* Sliders, grouped by category */}
          <div className="bg-white dark:bg-white/5 rounded-[24px] p-6 border border-gray-100 dark:border-white/10 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Adjust each input</h2>
              <button onClick={resetToStandard} className="text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 underline decoration-gray-300 underline-offset-4">
                Reset to standard rates
              </button>
            </div>

            <div className="space-y-6">
              {Object.entries(linesByCategory).map(([category, catLines]) => {
                const catLabel = CATEGORIES[category as keyof typeof CATEGORIES]?.label || category;
                const catCost = catLines.reduce((sum, l) => sum + costOf(l), 0);
                return (
                  <div key={category} className="border border-gray-100 dark:border-white/10 rounded-2xl p-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{catLabel}</span>
                      <span className="text-sm font-extrabold text-gray-900 dark:text-gray-100"><Money pesewas={catCost} /></span>
                    </div>
                    <div className="space-y-4">
                      {catLines.map((l) => {
                        const key = lineKey(l);
                        const qty = quantities[key] ?? l.quantity_total;
                        const maxSlider = Math.max(l.quantity_total * 3, 1);
                        return (
                          <div key={key}>
                            <div className="flex justify-between items-center mb-1.5 flex-wrap gap-x-3 gap-y-0.5">
                              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{l.input_name}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                {qty.toFixed(qty % 1 === 0 ? 0 : 1)} {formatUnit(l.unit)} &times; <Money pesewas={l.unit_price_pesewas} />/{formatUnit(l.unit)} = <span className="font-extrabold text-gray-900 dark:text-gray-100"><Money pesewas={costOf(l)} /></span>
                              </span>
                            </div>
                            <input
                              type="range" min={0} max={maxSlider} step={maxSlider > 20 ? 1 : 0.1}
                              value={qty}
                              onChange={(e) => setQuantities((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-100 dark:bg-white/10 accent-emerald-600"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Standard: {l.quantity_total.toFixed(l.quantity_total % 1 === 0 ? 0 : 1)} {formatUnit(l.unit)} for {acres} acre{acres === 1 ? '' : 's'}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Result */}
          <div className="bg-[#0a0a0a] rounded-[24px] p-6 md:p-8 text-white shadow-xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center mb-6">
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
            <div className="border-t border-white/10 pt-4">
              <p className="text-sm font-medium text-white/80 leading-relaxed">{interpretation}</p>
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
