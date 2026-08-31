import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFarm } from '../hooks/useFarm';
import { compareSeasons, compareCrops, compareToBenchmark } from '../api/compare';
import { Money } from '../components/ui/Money';
import { listSeasons } from '../api/seasons';

export function Compare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'seasons';

  const setTab = (tab: string) => {
    setSearchParams(prev => {
      prev.set('tab', tab);
      return prev;
    });
  };

  return (
    <div className="animate-fade-in-up pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Compare Costs</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Analyze your spending per acre.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a1a1a] rounded-[24px] shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden mb-6">
        <div className="flex border-b border-gray-100 dark:border-white/10 overflow-x-auto">
          <button 
            onClick={() => setTab('seasons')}
            className={`px-6 py-4 font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'seasons' ? 'text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            Season vs Season
          </button>
          <button 
            onClick={() => setTab('crops')}
            className={`px-6 py-4 font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'crops' ? 'text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            Crop vs Crop
          </button>
          <button 
            onClick={() => setTab('benchmark')}
            className={`px-6 py-4 font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'benchmark' ? 'text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            Me vs Standard
          </button>
        </div>
        
        <div className="p-6">
          {activeTab === 'seasons' && <SeasonVsSeasonTab />}
          {activeTab === 'crops' && <CropVsCropTab />}
          {activeTab === 'benchmark' && <BenchmarkTab />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Season vs Season
// ---------------------------------------------------------------------------
const PATTERN_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899'];

function SeasonVsSeasonTab() {
  const [searchParams] = useSearchParams();
  const seasonIds = searchParams.get('s')?.split(',').map(Number).filter(n => !isNaN(n)) || [];
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { data: result, isLoading } = useQuery({
    queryKey: ['compareSeasons', seasonIds],
    queryFn: () => compareSeasons(seasonIds),
    enabled: seasonIds.length > 0,
  });

  const processedData = useMemo(() => {
    if (!result?.data || result.seasons.length < 2) return null;
    const { data, seasons } = result;
    const firstS = seasons[0].name;
    const lastS = seasons[seasons.length - 1].name;

    let maxChangeCat = '';
    let maxChangePct = 0;
    let maxChangeAbs = 0;

    let tableData = data.map(row => {
      const firstVal = row[firstS] || 0;
      const lastVal = row[lastS] || 0;
      const absDiff = lastVal - firstVal;
      const pctDiff = firstVal === 0 ? (lastVal > 0 ? 100 : 0) : (absDiff / firstVal) * 100;
      
      if (Math.abs(pctDiff) > Math.abs(maxChangePct)) {
        maxChangePct = pctDiff;
        maxChangeAbs = absDiff;
        maxChangeCat = row.category;
      }

      return {
        ...row,
        absDiff,
        pctDiff
      };
    }).sort((a, b) => b.pctDiff - a.pctDiff); // Sort by highest increase

    let takeaway = "No material changes found between the selected seasons.";
    if (Math.abs(maxChangePct) > 5) {
      const dir = maxChangeAbs > 0 ? 'rose' : 'fell';
      takeaway = `Smart Insight: Your ${maxChangeCat.replace('_', ' ')} cost per acre ${dir} ${Math.abs(Math.round(maxChangePct))}% between ${firstS} and ${lastS}.`;
    }

    if (selectedCategory !== 'all') {
      tableData = tableData.filter(r => r.category === selectedCategory);
    }

    return { tableData, seasons, takeaway, allCategories: data.map(r => r.category) };
  }, [result, selectedCategory]);

  const copyDataToClipboard = () => {
    if (!processedData) return;
    const headers = ['Category', ...processedData.seasons.map(s => s.name), 'Abs Diff', 'Pct Diff'].join('\t');
    const rows = processedData.tableData.map(row => {
      const vals = processedData.seasons.map(s => (row[s.name]/100).toFixed(2));
      return [row.category, ...vals, (row.absDiff/100).toFixed(2), `${Math.round(row.pctDiff)}%`].join('\t');
    }).join('\n');
    navigator.clipboard.writeText(`${headers}\n${rows}`);
    alert('Data copied to clipboard!');
  };

  if (seasonIds.length < 2) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Select seasons to compare</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Go to the Seasons page and select at least 2 seasons to compare them side-by-side.</p>
        <Link to="/seasons" className="bg-[#1B5E20] text-white font-bold py-2 px-6 rounded-xl">Go to Seasons</Link>
      </div>
    );
  }

  if (isLoading) return <LoadingSpinner />;
  if (!processedData) return <div>Failed to process comparison data.</div>;

  return (
    <div className="animate-fade-in">
      {(result?.excluded?.length || 0) > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl mb-6 text-sm flex items-start gap-3 shadow-sm">
          <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <div><strong>Note:</strong> The following seasons were excluded because they have no recorded costs: {result!.excluded.join(', ')}</div>
        </div>
      )}

      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 p-5 rounded-2xl mb-8 border border-emerald-100 dark:border-emerald-800/30 flex items-center shadow-sm">
        <div className="w-12 h-12 bg-white dark:bg-white/10 rounded-full flex items-center justify-center mr-4 shrink-0 text-emerald-600 dark:text-emerald-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
        </div>
        <div className="text-emerald-900 dark:text-emerald-300 font-medium md:text-lg">
          {processedData.takeaway}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="w-full sm:w-auto">
          <label htmlFor="category-filter" className="sr-only">Filter by Category</label>
          <select 
            id="category-filter"
            className="w-full sm:w-64 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {processedData.allCategories.map(c => (
              <option key={c} value={c}>{c.replace('_', ' ').toUpperCase()}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={copyDataToClipboard}
          className="w-full sm:w-auto px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-sm font-bold rounded-xl transition-colors flex items-center justify-center shadow-sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
          Export Data
        </button>
      </div>

      <div className="h-[400px] w-full mb-8 bg-white dark:bg-[#1a1a1a] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={processedData.tableData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
            <XAxis dataKey="category" tickFormatter={(val: any) => val.replace('_', ' ')} style={{ fontSize: '12px' }} axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => (val/100).toString()} />
            <Tooltip 
              cursor={{ fill: 'rgba(0,0,0,0.05)' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
              formatter={(value: any) => [`GHS ${(Number(value)/100).toFixed(2)}`, 'Cost/Acre']} 
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {processedData.seasons.map((s, i) => (
              <Bar key={s.name} dataKey={s.name} name={s.name} fill={PATTERN_COLORS[i % PATTERN_COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={60} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-white/10 text-xs uppercase tracking-widest text-gray-500">
              <th className="pb-3 font-bold px-4">Category</th>
              {processedData.seasons.map(s => (
                <th key={s.name} className="pb-3 font-bold px-4 text-right">{s.name}<br/><span className="text-[10px] text-gray-400">per acre</span></th>
              ))}
              <th className="pb-3 font-bold px-4 text-right">Difference<br/><span className="text-[10px] text-gray-400">Earliest → Latest</span></th>
            </tr>
          </thead>
          <tbody>
            {processedData.tableData.map(row => (
              <tr key={row.category} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                <td className="py-4 px-4 font-bold capitalize">{row.category.replace('_', ' ')}</td>
                {processedData.seasons.map(s => (
                  <td key={s.name} className="py-4 px-4 text-right font-medium text-gray-900 dark:text-gray-100">
                    <Money pesewas={row[s.name]} />
                  </td>
                ))}
                <td className="py-4 px-4 text-right font-bold">
                  {row.absDiff === 0 ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    <span className={row.absDiff > 0 ? 'text-red-500' : 'text-emerald-500'}>
                      {row.absDiff > 0 ? '+' : ''}{Math.round(row.pctDiff)}%
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Crop vs Crop
// ---------------------------------------------------------------------------
function CropVsCropTab() {
  const { farm } = useFarm();
  const { data: result, isLoading } = useQuery({
    queryKey: ['compareCrops', farm?.id],
    queryFn: () => compareCrops(farm!.id as number),
    enabled: !!farm?.id,
  });

  if (isLoading) return <LoadingSpinner />;
  if (!result || result.data.length === 0) return <div>No cost data available for crops.</div>;

  const highest = result.data[0];
  const takeaway = `${highest.name} is your most expensive crop to grow, averaging GHS ${(highest.cost_per_acre/100).toFixed(0)} per acre.`;

  return (
    <div>
      {result.excluded.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl mb-6 text-sm">
          <strong>Note:</strong> The following crops were excluded because they have no recorded costs: {result.excluded.join(', ')}
        </div>
      )}

      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl mb-8 border border-emerald-100 dark:border-emerald-800/30 text-emerald-900 dark:text-emerald-300 font-medium text-center text-lg">
        {takeaway}
      </div>

      <div className="h-[400px] w-full mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={result.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" style={{ fontSize: '12px' }} />
            <YAxis label={{ value: 'Total Cost per Acre (GHS)', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value: any) => [`GHS ${(Number(value)/100).toFixed(2)}`, 'Cost/Acre']} />
            <Bar dataKey="cost_per_acre" name="Cost per Acre" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-white/10 text-xs uppercase tracking-widest text-gray-500">
              <th className="pb-3 font-bold px-4">Crop</th>
              <th className="pb-3 font-bold px-4 text-right">Total Cost per Acre</th>
            </tr>
          </thead>
          <tbody>
            {result.data.map((row: any) => (
              <tr key={row.name} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                <td className="py-4 px-4 font-bold">{row.name}</td>
                <td className="py-4 px-4 text-right font-medium text-gray-900 dark:text-gray-100">
                  <Money pesewas={row.cost_per_acre} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Me vs Benchmark
// ---------------------------------------------------------------------------
function BenchmarkTab() {
  const { farm } = useFarm();
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

  // Get all seasons to let user pick which one to compare to benchmark
  const { data: seasons } = useQuery({
    queryKey: ['seasonsList', farm?.id],
    queryFn: () => listSeasons(farm!.id as number),
    enabled: !!farm?.id,
  });

  const { data: result, isLoading } = useQuery({
    queryKey: ['compareBenchmark', selectedSeason],
    queryFn: () => compareToBenchmark(selectedSeason!),
    enabled: !!selectedSeason,
  });

  const processedData = useMemo(() => {
    if (!result?.data) return null;
    let maxOverspend = 0;
    let maxOverspendCat = '';
    
    const tableData = result.data.map(row => {
      const variance = row.benchmark ? row.actual - row.benchmark : 0;
      const variancePct = row.benchmark ? (variance / row.benchmark) * 100 : 0;
      
      if (variancePct > maxOverspend) {
        maxOverspend = variancePct;
        maxOverspendCat = row.category;
      }
      return { ...row, variance, variancePct };
    });

    let takeaway = "You are spending within expected benchmarks across all categories.";
    if (maxOverspend > 10) {
      takeaway = `Your ${maxOverspendCat.replace('_', ' ')} cost per acre is ${Math.round(maxOverspend)}% higher than the standard benchmark.`;
    }

    return { tableData, takeaway };
  }, [result]);

  return (
    <div>
      <div className="mb-6">
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Select a season to check</label>
        <select 
          className="w-full sm:w-64 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm"
          value={selectedSeason || ''}
          onChange={(e) => setSelectedSeason(Number(e.target.value))}
        >
          <option value="">-- Choose Season --</option>
          {seasons?.map(s => (
            <option key={s.id} value={s.id}>{s.crop_name} {s.season_window} {s.year}</option>
          ))}
        </select>
      </div>

      {!selectedSeason ? (
        <div className="text-center py-12 text-gray-500">Please select a season above to compare against benchmarks.</div>
      ) : isLoading ? (
        <LoadingSpinner />
      ) : (result?.excluded?.length || 0) > 0 ? (
        <div className="text-center py-12 text-gray-500">{result!.excluded[0]}</div>
      ) : processedData ? (
        <>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl mb-8 border border-emerald-100 dark:border-emerald-800/30 text-emerald-900 dark:text-emerald-300 font-medium text-center text-lg">
            {processedData.takeaway}
          </div>
          
          <div className="text-xs text-gray-500 mb-2">* The 'other' category does not have a benchmark.</div>
          <div className="h-[400px] w-full mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedData.tableData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="category" tickFormatter={(val: any) => val.replace('_', ' ')} style={{ fontSize: '12px' }} />
                <YAxis label={{ value: 'Cost per Acre (GHS)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: any) => [`GHS ${(Number(value)/100).toFixed(2)}`, 'Cost/Acre']} />
                <Legend />
                <Bar dataKey="actual" name="Your Actual Cost" fill="#ec4899" />
                <Bar dataKey="benchmark" name="Standard Benchmark" fill="#9ca3af" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-white/10 text-xs uppercase tracking-widest text-gray-500">
                  <th className="pb-3 font-bold px-4">Category</th>
                  <th className="pb-3 font-bold px-4 text-right">Your Cost<br/><span className="text-[10px] text-gray-400">per acre</span></th>
                  <th className="pb-3 font-bold px-4 text-right">Benchmark<br/><span className="text-[10px] text-gray-400">per acre</span></th>
                  <th className="pb-3 font-bold px-4 text-right">Variance</th>
                </tr>
              </thead>
              <tbody>
                {processedData.tableData.map(row => (
                  <tr key={row.category} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="py-4 px-4 font-bold capitalize">{row.category.replace('_', ' ')}</td>
                    <td className="py-4 px-4 text-right font-medium text-gray-900 dark:text-gray-100">
                      <Money pesewas={row.actual} />
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-gray-500">
                      {row.benchmark ? <Money pesewas={row.benchmark} /> : '—'}
                    </td>
                    <td className="py-4 px-4 text-right font-bold">
                      {row.benchmark ? (
                        <span className={row.variance > 0 ? 'text-red-500' : 'text-emerald-500'}>
                          {row.variance > 0 ? '+' : ''}{Math.round(row.variancePct)}%
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B5E20]"></div>
    </div>
  );
}
