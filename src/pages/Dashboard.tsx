import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useFarm } from '../hooks/useFarm';
import { listSeasons } from '../api/seasons';
import { getFarmSummary, getCropSummary } from '../api/dashboard';
import { generateEstimate } from '../api/estimates';
import { listGuides } from '../api/guides';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Money } from '../components/ui/Money';
import { WeeklyCatchUp } from '../components/features/WeeklyCatchUp';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function Dashboard() {
  const { farm, isLoading: isLoadingFarm, hasFarm } = useFarm();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'closed'>('all');
  const [showCatchUp, setShowCatchUp] = useState(false);

  useEffect(() => {
    if (farm?.id) {
      const targetDay = (farm as any).check_in_day || 'Monday';
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      
      const lastCatchupStr = localStorage.getItem(`fp_last_catchup_${farm.id}`);
      if (!lastCatchupStr) {
        setShowCatchUp(true);
      } else {
        const lastCatchup = new Date(lastCatchupStr).getTime();
        const daysSince = (Date.now() - lastCatchup) / (1000 * 60 * 60 * 24);
        
        // Show if it's been ~a week, OR if it's the target day and they haven't done it today
        if (daysSince >= 6) {
          setShowCatchUp(true);
        } else if (today === targetDay && new Date(lastCatchupStr).toDateString() !== new Date().toDateString()) {
          setShowCatchUp(true);
        } else {
          setShowCatchUp(false);
        }
      }
    }
  }, [farm]);

  const handleCatchUpComplete = () => {
    if (farm?.id) {
      localStorage.setItem(`fp_last_catchup_${farm.id}`, new Date().toISOString());
    }
    setShowCatchUp(false);
  };
  
  const estimateMutation = useMutation({
    mutationFn: generateEstimate,
    onSuccess: (estimateId) => {
      navigate(`/report/${estimateId}`);
    }
  });

  const { data: seasons, isLoading: isLoadingSeasons, isError: isErrorSeasons } = useQuery({
    queryKey: ['seasons', farm?.id],
    queryFn: () => listSeasons(farm!.id as number),
    enabled: !!farm?.id,
  });

  const { data: farmSummary, isLoading: isLoadingSummary, isError: isErrorSummary } = useQuery({
    queryKey: ['farm_summary', farm?.id],
    queryFn: () => getFarmSummary(farm!.id as number),
    enabled: !!farm?.id,
  });

  const { data: cropsSummary, isLoading: isLoadingCrops, isError: isErrorCrops } = useQuery({
    queryKey: ['crop_summary', farm?.id],
    queryFn: () => getCropSummary(farm!.id as number),
    enabled: !!farm?.id,
  });

  const { data: guides } = useQuery({
    queryKey: ['dashboard_guides'],
    queryFn: () => listGuides(),
  });

  const isLoading = isLoadingFarm || isLoadingSeasons || isLoadingSummary || isLoadingCrops;
  const isError = isErrorSeasons || isErrorSummary || isErrorCrops;

  const filteredSeasons = seasons?.filter(season => {
    // Filter by type
    if (filterType === 'active' && season.is_complete) return false;
    if (filterType === 'closed' && !season.is_complete) return false;
    
    // Filter by search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = season.crop_name.toLowerCase().includes(q);
      const matchYear = season.year.toString().includes(q);
      const matchWindow = season.season_window.toLowerCase().includes(q);
      if (!matchName && !matchYear && !matchWindow) return false;
    }
    
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B5E20]"></div>
      </div>
    );
  }

  if (!hasFarm && !isLoadingFarm) {
    return (
      <div className="animate-fade-in-up pb-12 max-w-4xl mx-auto text-center mt-12">
        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-[#1B5E20]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight mb-4">Welcome to FarmPilot!</h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          Before we can help you track costs and get personalized estimates, we need some basic details about your farm.
        </p>
        <Link to="/farm/setup" className="inline-flex items-center bg-[#1B5E20] text-white font-bold py-4 px-10 rounded-2xl shadow-lg shadow-emerald-900/20 hover:bg-[#144718] transition-all hover:-translate-y-1 text-lg group">
          Set Up Your Farm
          <svg className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up pb-12 max-w-6xl mx-auto">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-sm mt-1">Manage your farm's seasons and track costs.</p>
        </div>
        <div className="flex space-x-3">
          <Link to="/season/new" className="bg-[#1B5E20] text-white font-bold py-2.5 px-4 rounded-xl shadow-sm hover:bg-[#144718] transition-colors flex items-center justify-center">
            <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Start New Season
          </Link>
        </div>
      </div>

      {isError ? (
        <div className="bg-red-50 rounded-[32px] p-12 text-center border border-red-100">
          <div className="text-6xl mb-4 opacity-50 inline-block bg-red-100 rounded-full p-6 text-red-500">⚠️</div>
          <h2 className="text-2xl font-bold text-red-900 mb-3">Unable to load dashboard</h2>
          <p className="text-red-700 max-w-md mx-auto mb-8 font-medium">We couldn't load your farm data. Please check your connection and try again.</p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => window.location.reload()} className="bg-red-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-red-700 transition-colors">
              Try Again
            </button>
            <button onClick={async () => {
              // Sign out logic
              const { supabase } = await import('../lib/supabase');
              await supabase.auth.signOut();
              window.location.href = '/signin';
            }} className="bg-white text-red-700 font-bold py-3 px-8 rounded-xl border border-red-200 hover:bg-red-50 transition-colors">
              Sign In Again
            </button>
          </div>
        </div>
      ) : !seasons || seasons.length === 0 ? (
        <div className="bg-white dark:bg-white/5 rounded-[24px] p-12 shadow-sm border border-gray-100 dark:border-white/10 flex flex-col items-center justify-center text-center mt-8">
          <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-[#1B5E20]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">No seasons tracked yet</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">Start tracking your crops, costs, and estimates by adding your first season. It only takes a minute!</p>
          <Link to="/season/new" className="bg-[#1B5E20] text-white font-bold py-3 px-8 rounded-xl shadow-sm hover:bg-[#144718] transition-all hover:scale-105 inline-flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Add Your First Season
          </Link>
        </div>
      ) : (
        <>
          {showCatchUp && (
            <WeeklyCatchUp onComplete={handleCatchUpComplete} />
          )}

          {farmSummary && (
            <div className="bg-white dark:bg-white/5 rounded-[32px] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-white/10 mb-10 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -mt-20 -mr-20 pointer-events-none transition-transform group-hover:scale-110"></div>
              
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-start justify-between gap-10">
                <div className="flex-1 space-y-8">
                  <div>
                    <h2 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight mb-2">{farmSummary.farm_name}</h2>
                    <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-600 dark:text-gray-300">
                      <span className="inline-flex items-center bg-gray-100 dark:bg-white/10 px-3 py-1 rounded-full">
                        <span className="font-bold text-gray-900 dark:text-gray-100 mr-1.5">{Number(farmSummary.total_area_acres)}</span> acres total
                      </span>
                      <span className="inline-flex items-center bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-100">
                        <span className="font-bold text-emerald-600 mr-1.5">{Number(farmSummary.total_planted_acres)}</span> acres planted
                      </span>
                      <span className="inline-flex items-center text-gray-500">
                        {farmSummary.season_count} seasons · {farmSummary.crop_count} crops
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Total Recorded Spend</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                        <Money pesewas={Number(farmSummary.total_recorded_pesewas)} />
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Total Estimated Cost</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                        <Money pesewas={Number(farmSummary.total_estimated_pesewas)} />
                      </p>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-80 bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-3xl p-8 shadow-xl text-white flex flex-col justify-between shrink-0 relative overflow-hidden transform transition-all hover:-translate-y-1">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mt-10 -mr-10"></div>
                  <div className="relative z-10">
                    <div className="flex items-center mb-3">
                      <svg className="w-5 h-5 text-emerald-300 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <h3 className="text-emerald-50 text-sm font-bold uppercase tracking-widest">Total Possible Saving</h3>
                    </div>
                    <div className="text-5xl font-light tracking-tighter text-white">
                      <Money pesewas={Number(farmSummary.total_possible_saving_pesewas)} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/10 flex items-start text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-5 h-5 text-gray-500 mr-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p>Each crop is estimated separately because different crops need different inputs. These are the totals across your whole farm.</p>
              </div>
            </div>
          )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
              {/* Spend by Crop Pie Wheel */}
              {cropsSummary && cropsSummary.length > 0 && (
                <div className="bg-white dark:bg-white/5 rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-white/10 flex flex-col">
                  <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-white/10 pb-4">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Spend by Crop</h3>
                    <Link to="/compare?tab=crops" className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold py-2 px-3 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex items-center">
                      Full Comparison
                    </Link>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-6 flex-1">
                    <div className="w-full sm:w-1/2 flex justify-center items-center h-48">
                      {cropsSummary.some(c => Number(c.total_recorded_pesewas) > 0) ? (
                        <PieChart width={180} height={180}>
                          <Pie
                            data={cropsSummary.filter(c => Number(c.total_recorded_pesewas) > 0).map(c => ({...c, val: Number(c.total_recorded_pesewas)}))}
                            dataKey="val"
                            nameKey="crop_name"
                            cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5}
                          >
                            {cropsSummary.filter(c => Number(c.total_recorded_pesewas) > 0).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => [`GHS ${(Number(value) / 100).toFixed(2)}`, 'Spent']} />
                        </PieChart>
                      ) : (
                        <p className="text-sm text-gray-400">No costs yet</p>
                      )}
                    </div>
                    <div className="w-full sm:w-1/2 flex flex-col gap-2 overflow-y-auto max-h-48 pr-2">
                      {cropsSummary.map((crop, index) => (
                        <div key={crop.crop_id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate max-w-[100px]">{crop.crop_name}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400"><Money pesewas={Number(crop.total_recorded_pesewas)} /></span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Season Status Pie Wheel */}
              {seasons && seasons.length > 0 && (
                <div className="bg-white dark:bg-white/5 rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-white/10 flex flex-col">
                  <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-white/10 pb-4">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Season Status</h3>
                    <Link to="/seasons" className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold py-2 px-3 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex items-center">
                      View All
                    </Link>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-6 flex-1">
                    <div className="w-full sm:w-1/2 flex justify-center items-center h-48">
                      <PieChart width={180} height={180}>
                        <Pie
                          data={[
                            { name: 'Active', value: seasons.filter(s => !s.is_complete).length },
                            { name: 'Completed', value: seasons.filter(s => s.is_complete).length }
                          ]}
                          dataKey="value"
                          nameKey="name"
                          cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5}
                        >
                          <Cell fill="#10b981" /> {/* Active: Emerald */}
                          <Cell fill="#9ca3af" /> {/* Completed: Gray */}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </div>
                    <div className="w-full sm:w-1/2 flex flex-col gap-4">
                      <div className="flex justify-between items-center bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shrink-0 bg-emerald-500" />
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Active</span>
                        </div>
                        <span className="text-lg font-extrabold text-emerald-600">{seasons.filter(s => !s.is_complete).length}</span>
                      </div>
                      <div className="flex justify-between items-center bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shrink-0 bg-gray-400" />
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Completed</span>
                        </div>
                        <span className="text-lg font-extrabold text-gray-500">{seasons.filter(s => s.is_complete).length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AI Feedback / Guidance Area */}
            {guides && guides.length > 0 && (
              <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link to={`/guides/${guides[0].id}`} className="bg-[#0a0a0a] rounded-[32px] p-8 text-white relative overflow-hidden group shadow-xl hover:-translate-y-1 transition-transform">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl -mt-10 -mr-10 group-hover:bg-emerald-500/30 transition-colors"></div>
                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-center mb-4">
                        <svg className="w-6 h-6 text-emerald-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">AI Guidance</span>
                      </div>
                      <h3 className="text-2xl font-bold mb-3">{guides[0].title}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 mb-6">{guides[0].summary}</p>
                    </div>
                    <div className="flex items-center text-emerald-400 text-sm font-bold">
                      Read Guide <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </div>
                  </div>
                </Link>
                
                {guides.length > 1 && (
                  <Link to={`/guides/${guides[1].id}`} className="bg-gradient-to-br from-emerald-800 to-emerald-950 rounded-[32px] p-8 text-white relative overflow-hidden group shadow-xl hover:-translate-y-1 transition-transform">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mt-10 -mr-10"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div>
                        <div className="flex items-center mb-4">
                          <svg className="w-6 h-6 text-emerald-200 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                          <span className="text-emerald-200 text-xs font-bold uppercase tracking-widest">Farm Tip</span>
                        </div>
                        <h3 className="text-2xl font-bold mb-3">{guides[1].title}</h3>
                        <p className="text-emerald-100/70 text-sm leading-relaxed line-clamp-3 mb-6">{guides[1].summary}</p>
                      </div>
                      <div className="flex items-center text-emerald-200 text-sm font-bold">
                        Read Guide <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            )}
          
          {/* Seasons List Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-white/5 rounded-[24px] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 dark:border-white/10 min-h-[250px]">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Your Seasons</h3>
                  
                  <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 items-start sm:items-center">
                    <div className="relative">
                      <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      <input 
                        type="text" 
                        placeholder="Search seasons..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 rounded-xl text-sm w-full sm:w-48 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                      />
                    </div>
                    
                    <div className="flex bg-gray-100 dark:bg-white/10 p-1 rounded-xl">
                      {(['all', 'active', 'closed'] as const).map(type => (
                        <button
                          key={type}
                          onClick={() => setFilterType(type)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-colors ${filterType === type ? 'bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Empty State 2: Seasons but no costs */}
                {filteredSeasons && filteredSeasons.length > 0 && farmSummary && Number(farmSummary.total_recorded_pesewas) === 0 && (
                  <div className="bg-blue-50 border border-blue-100 text-blue-900 p-6 rounded-2xl mb-6">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-blue-500 mr-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <div>
                        <h4 className="font-bold mb-1">Ready to track?</h4>
                        <p className="text-sm text-blue-800">You have seasons set up, but no costs recorded yet. Open a season below to start logging your expenses.</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Empty State 3: Costs but no estimates */}
                {farmSummary && Number(farmSummary.total_recorded_pesewas) > 0 && Number(farmSummary.total_estimated_pesewas) === 0 && (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-900 p-6 rounded-2xl mb-6">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-emerald-500 mr-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <div>
                        <h4 className="font-bold mb-1">See how you're doing</h4>
                        <p className="text-sm text-emerald-800">You've recorded costs! Select a season below to view its details and generate an estimate to see if your spending is on track.</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {filteredSeasons && filteredSeasons.length === 0 && (
                    <div className="text-center py-12 px-4 border-2 border-dashed border-gray-100 dark:border-white/10 rounded-2xl bg-gray-50/50 dark:bg-white/5">
                      <p className="text-gray-500 dark:text-gray-400 font-medium">No seasons match your current filters.</p>
                      {(searchQuery || filterType !== 'all') && (
                        <button 
                          onClick={() => { setSearchQuery(''); setFilterType('all'); }}
                          className="mt-3 text-sm text-emerald-600 font-bold hover:text-emerald-700"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  )}
                  {filteredSeasons?.slice(0, 3).map((season) => (
                    <Link to={`/season/${season.id}`} key={season.id} className="block p-5 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 hover:border-emerald-200 cursor-pointer transition-all group shadow-sm hover:shadow-md">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start space-x-4">
                          <div className={`w-12 h-12 rounded-xl shrink-0 ${season.is_complete ? 'bg-gray-100 dark:bg-white/10' : 'bg-emerald-50 dark:bg-emerald-900/20'} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                            {season.is_complete ? (
                              <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            ) : (
                              <svg className="w-6 h-6 text-[#1B5E20] dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center flex-wrap gap-2 mb-1">
                              <h4 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 group-hover:text-[#1B5E20] dark:group-hover:text-emerald-400 transition-colors">
                                {season.crop_name}
                              </h4>
                              <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md ${season.is_complete ? 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'}`}>
                                {season.is_complete ? 'Complete' : 'Recording'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium capitalize">
                              {season.season_window} {season.year} • <span className="font-bold text-gray-700 dark:text-gray-200">{season.area_planted_acres} acres</span>
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                          <div className="text-left sm:text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mb-0.5">Recorded</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100"><span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-1">GHS</span><Money pesewas={season.total_cost_pesewas} /></p>
                          </div>
                          
                          {/* Generate Estimate Shortcut */}
                          {season.total_cost_pesewas > 0 && !season.has_estimate && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                estimateMutation.mutate(season.id);
                              }}
                              disabled={estimateMutation.isPending}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-sm whitespace-nowrap flex items-center disabled:opacity-50"
                            >
                              {estimateMutation.isPending && estimateMutation.variables === season.id ? (
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                              ) : (
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              )}
                              Estimate
                            </button>
                          )}
                          <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-[#1B5E20] dark:group-hover:text-emerald-400 transition-colors hidden sm:block ml-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                  
                  {filteredSeasons && filteredSeasons.length > 0 && (
                    <div className="pt-2">
                      <Link to="/seasons" className="flex items-center justify-center w-full py-4 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl border border-gray-100 dark:border-white/10 text-emerald-700 dark:text-emerald-400 font-bold transition-colors shadow-sm group focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none">
                        View All {filteredSeasons.length > 3 ? filteredSeasons.length : ''} Seasons
                        <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-[#0a0a0a] rounded-[24px] p-6 shadow-xl relative overflow-hidden min-h-[250px] text-white">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1B5E20]/20 to-black pointer-events-none" />
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-emerald-500 opacity-20 rounded-full blur-3xl"></div>
                
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-xl mb-2">AI Guidance</h3>
                    <p className="text-sm text-white/60 leading-relaxed">
                      Check out the recommended best practices for your current active seasons to maximize yield.
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => navigate('/guides')}
                    className="w-full mt-6 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-between group">
                    <span>Get more guidance</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
