import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { getSeason, completeSeason, updateSeason, deleteSeason } from '../api/seasons';
import { listCosts, getExpectedCategoriesForCrop, CostCategory } from '../api/costs';
import { generateEstimate } from '../api/estimates';
import { AddCostForm } from '../components/domain/AddCostForm';
import { CATEGORIES } from '../lib/categories';
import { CostList } from '../components/features/CostList';
import { Money } from '../components/ui/Money';
import { useOnline } from '../hooks/useOnline';
import { useAuth } from '../hooks/useAuth';
const closeSeasonSchema = z.object({
  harvest_qty: z.number({ message: 'Please enter a valid quantity.' }).positive('Quantity must be greater than zero.'),
  harvest_unit: z.enum(['bag_100kg', 'bag_50kg', 'metric_tonnes']),
  revenue_cedis: z.number().nonnegative().optional().or(z.literal('')),
});

type CloseSeasonFormData = z.infer<typeof closeSeasonSchema>;

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function SeasonDetail() {
  const { id } = useParams<{ id: string }>();
  const seasonId = Number(id);
  const navigate = useNavigate();
  const isOnline = useOnline();

  const queryClient = useQueryClient();
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [initialCategory, setInitialCategory] = useState<CostCategory | undefined>(undefined);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const { user, isLoading: isAuthLoading } = useAuth();
  
  if (isNaN(seasonId)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Invalid Season ID</h2>
        <p className="text-gray-500 mb-8 max-w-md">The season ID provided in the URL is not valid. ({id})</p>
        <Link to="/" className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  const isReady = !isAuthLoading && !!user && !!seasonId;

  const { data: season, isLoading, isError, error: queryError } = useQuery({
    queryKey: ['season', seasonId],
    queryFn: () => getSeason(seasonId),
    enabled: isReady,
  });

  const { data: seasonCosts } = useQuery({
    queryKey: ['seasonCosts', seasonId],
    queryFn: () => listCosts(seasonId),
    enabled: isReady,
  });

  const { data: expectedCategories } = useQuery({
    queryKey: ['expectedCategories', season?.crop_id],
    queryFn: () => getExpectedCategoriesForCrop(season!.crop_id),
    enabled: !!season?.crop_id,
  });

  const deleteSeasonMutation = useMutation({
    mutationFn: () => deleteSeason(seasonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      navigate('/seasons');
    },
  });

  const editSeasonMutation = useMutation({
    mutationFn: (data: { area_planted_acres: number, season_window: 'major' | 'minor' | 'dry', year: number }) => updateSeason(seasonId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      setIsEditModalOpen(false);
    },
  });

  const handleDeleteSeason = () => {
    if (confirm('Are you sure you want to delete this season? This will permanently remove all associated costs and estimates. This action cannot be undone.')) {
      deleteSeasonMutation.mutate();
    }
  };

  const generateMutation = useMutation({
    mutationFn: () => generateEstimate(seasonId),
    onSuccess: (estimateId) => {
      navigate(`/report/${estimateId}`);
    },
    onError: (error: any) => {
      if (error.message?.includes('session has expired')) {
        // Let the UI handle the error; do not forcibly redirect.
      } else {
        setGenerateError(error.message);
      }
    }
  });

  const hasCosts = seasonCosts && seasonCosts.length > 0;
  const totalCostPesewas = seasonCosts?.reduce((sum, cost) => sum + cost.amount_pesewas, 0) || 0;
  
  const completedCategories = new Set(seasonCosts?.map(c => c.category) || []);
  const pendingCategories = expectedCategories?.filter(c => !completedCategories.has(c)) || [];
  const achievedCategories = expectedCategories?.filter(c => completedCategories.has(c)) || [];

  const costChartData = useMemo(() => {
    if (!seasonCosts) return [];
    const grouped = seasonCosts.reduce((acc, cost) => {
      const label = CATEGORIES[cost.category as keyof typeof CATEGORIES]?.label || cost.category;
      if (!acc[label]) acc[label] = 0;
      acc[label] += cost.amount_pesewas / 100;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [seasonCosts]);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<CloseSeasonFormData>({
    resolver: zodResolver(closeSeasonSchema),
  });

  const completeMutation = useMutation({
    mutationFn: (data: CloseSeasonFormData) => {
      const revenuePesewas = data.revenue_cedis ? Math.round(Number(data.revenue_cedis) * 100) : undefined;
      return completeSeason(seasonId, data.harvest_qty, data.harvest_unit, revenuePesewas);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      setIsCloseModalOpen(false);
      reset();
    },
    onError: (error: any) => {
      if (error.message?.includes('session has expired')) {
        // Let the UI handle the error; do not forcibly redirect.
      } else {
        setGenerateError(error.message);
      }
    }
  });

  const onCloseSubmit = (data: CloseSeasonFormData) => {
    completeMutation.mutate(data);
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex-1 p-6 md:p-12 animate-pulse">
        <div className="w-32 h-6 bg-gray-200 rounded mb-8"></div>
        <div className="w-1/2 h-12 bg-gray-200 rounded-lg mb-4"></div>
        <div className="w-1/3 h-6 bg-gray-200 rounded mb-12"></div>
        <div className="w-full h-40 bg-white rounded-[24px] border border-gray-100"></div>
      </div>
    );
  }

  if (isError || !season) {
    return (
      <div className="p-12 text-center mt-12 bg-red-50 rounded-[32px] border border-red-100 max-w-2xl mx-auto">
        <div className="text-6xl mb-4 opacity-50 inline-block bg-red-100 rounded-full p-6 text-red-500">⚠️</div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Season not found</h2>
        <p className="text-gray-500 mb-8 max-w-md">{queryError?.message || `We could not find the season you are looking for (ID: ${seasonId}).`}</p>
        <div className="flex gap-4 justify-center">
          <Link to="/" className="text-emerald-600 font-bold hover:underline py-3">Back to Dashboard</Link>
          <button onClick={() => window.location.reload()} className="bg-red-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-red-700 transition-colors">
            Try Again
          </button>
          <button onClick={async () => {
            const { supabase } = await import('../lib/supabase');
            await supabase.auth.signOut();
            window.location.href = '/signin';
          }} className="bg-white text-red-700 font-bold py-3 px-8 rounded-xl border border-red-200 hover:bg-red-50 transition-colors">
            Sign In Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-6 lg:px-8 animate-fade-in pb-24">
      
      {generateError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm font-medium border border-red-100 animate-fade-in flex items-center justify-between">
          <span>{generateError}</span>
          <button onClick={() => setGenerateError(null)} className="text-red-700 hover:text-red-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

        {/* Header Block */}
        <div className="bg-[#0a0a0a] rounded-[32px] p-8 md:p-12 text-white mb-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[100px] -mr-64 -mt-64 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -ml-32 -mb-32 pointer-events-none"></div>
          
          <div className="absolute top-6 right-6 md:top-8 md:right-8 flex gap-2 z-20">
            <button onClick={() => setIsEditModalOpen(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors" title="Edit Season">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
            <button onClick={handleDeleteSeason} disabled={deleteSeasonMutation.isPending} className="p-2 bg-white/10 hover:bg-red-500/20 rounded-lg text-white/80 hover:text-red-400 transition-colors disabled:opacity-50" title="Delete Season">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8 mt-4 md:mt-0">
            <div>
              <div className="flex items-center space-x-3 mb-3">
                <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
                  {season.crop_name}
                </h1>
                {season.is_complete && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    Completed
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-lg md:text-xl font-light">
                <span className="capitalize">{season.season_window} Season</span> {season.year} • {season.area_planted_acres} acres
              </p>
              
              <div className="mt-8 mb-4">
                <p className="text-gray-500 font-medium mb-1 tracking-widest text-xs uppercase">Total Recorded Cost</p>
                <div className="text-5xl md:text-7xl font-light tracking-tighter text-white">
                  <Money pesewas={totalCostPesewas} />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Generate Estimate Button */}
              <button 
                disabled={generateMutation.isPending || !isOnline}
                onClick={() => {
                  setGenerateError(null);
                  generateMutation.mutate();
                }}
                title={!isOnline ? "You need internet to generate an estimate" : "Generate an estimate based on your crop and recorded costs"}
                className={`font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-emerald-900/20 whitespace-nowrap ${isOnline ? 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95' : 'bg-white/10 text-gray-400 cursor-not-allowed'}`}
              >
                {generateMutation.isPending && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {generateMutation.isPending ? 'Generating...' : 'Generate Estimate'}
              </button>

              {/* Only show Add Cost button in header on desktop, mobile has FAB */}
              {!season.is_complete && (
                <button
                  onClick={() => {
                    setInitialCategory(undefined);
                    setIsCostModalOpen(true);
                  }}
                  className="hidden md:flex px-6 py-4 bg-white text-emerald-900 hover:bg-emerald-50 font-bold rounded-xl transition-all shadow-lg shadow-black/10 items-center justify-center group whitespace-nowrap"
                >
                  <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                  Record Cost
                </button>
              )}
              {!season.is_complete && (
                <button 
                  onClick={() => setIsCloseModalOpen(true)}
                  disabled={!isOnline}
                  className={`font-bold py-4 px-6 rounded-xl transition-all border border-white/10 hover:bg-white/5 ${isOnline ? 'text-white' : 'text-gray-500 cursor-not-allowed'}`}
                >
                  Close Season
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <div className="col-span-1">
            {!hasCosts ? (
              <div className="bg-white dark:bg-white/5 rounded-[32px] p-8 md:p-12 text-center border border-gray-100 dark:border-white/5 shadow-sm">
                <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No costs recorded yet</h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">Track every pesewa you spend on this crop. Accurate records are the foundation of a profitable farm.</p>
                {!season.is_complete && (
                  <button 
                    onClick={() => {
                      setInitialCategory(undefined);
                      setIsCostModalOpen(true);
                    }}
                    className="inline-flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-sm"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    Record First Cost
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Visual Category Tracker */}
                {!season.is_complete && expectedCategories && expectedCategories.length > 0 && (
                  <div className="bg-white dark:bg-[#121212] rounded-[32px] p-6 sm:p-8 border border-gray-100 dark:border-white/5 shadow-[0_8px_40px_rgb(0,0,0,0.03)] mb-8 animate-fade-in-up">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Expected Expenses Checklist</h3>
                      <span className="text-sm font-medium text-gray-500 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full">
                        {achievedCategories.length} / {expectedCategories.length} tracked
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {pendingCategories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => {
                            setInitialCategory(cat);
                            setIsCostModalOpen(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 font-bold text-sm hover:bg-red-100 dark:hover:bg-red-500/20 transition-all active:scale-95"
                          title={`Click to record ${CATEGORIES[cat].label} cost`}
                        >
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                          {CATEGORIES[cat].label}
                          <svg className="w-4 h-4 ml-1 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </button>
                      ))}
                      {achievedCategories.map(cat => (
                        <div
                          key={cat}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-sm opacity-80"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          {CATEGORIES[cat].label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Cost Distribution Chart */}
                {costChartData.length > 0 && (
                  <div className="bg-white dark:bg-[#121212] rounded-[32px] p-6 sm:p-8 border border-gray-100 dark:border-white/5 shadow-[0_8px_40px_rgb(0,0,0,0.03)] mb-8 animate-fade-in-up">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">Cost Distribution</h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={costChartData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="opacity-10 dark:opacity-20" />
                          <XAxis type="number" tickFormatter={(val) => `₵${val}`} className="text-xs text-gray-500" />
                          <YAxis dataKey="name" type="category" width={100} className="text-xs font-bold text-gray-700 dark:text-gray-300" tick={{fill: 'currentColor'}} />
                          <Tooltip 
                            formatter={(value: any) => [`₵${Number(value).toFixed(2)}`, 'Spent']}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {costChartData.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                
                <CostList seasonId={seasonId} />
              </>
            )}
          </div>
        </div>

      {/* Close Season Dialog */}
      {isCloseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !completeMutation.isPending && setIsCloseModalOpen(false)}></div>
          
          <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-full">
            <div className="p-8 md:p-10 overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Close Season</h2>
                  <p className="text-emerald-600 font-bold mt-2">Harvest time! 🌾</p>
                </div>
                <button 
                  onClick={() => setIsCloseModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-8">
                <p className="text-blue-900 text-sm font-medium leading-relaxed">
                  Closing the season means we can use it next time. Your next estimate for this crop will be based on your own figures instead of standard rates.
                </p>
              </div>

              <form onSubmit={handleSubmit(onCloseSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group col-span-1">
                    <label htmlFor="harvest_qty" className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Quantity</label>
                    <input
                      id="harvest_qty"
                      type="number"
                      step="0.01"
                      placeholder="0.0"
                      aria-invalid={errors.harvest_qty ? 'true' : 'false'}
                      aria-describedby={errors.harvest_qty ? 'harvest_qty-error' : undefined}
                      className={`w-full text-2xl font-bold text-gray-900 bg-gray-50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all border ${errors.harvest_qty ? 'border-red-300' : 'border-transparent'}`}
                      {...register('harvest_qty', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="relative group col-span-1">
                    <label htmlFor="harvest_unit" className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Unit</label>
                    <select
                      id="harvest_unit"
                      aria-invalid={errors.harvest_unit ? 'true' : 'false'}
                      aria-describedby={errors.harvest_unit ? 'harvest_unit-error' : undefined}
                      className={`w-full appearance-none text-base font-bold text-gray-900 bg-gray-50 rounded-xl px-4 py-4 h-[58px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all border cursor-pointer ${errors.harvest_unit ? 'border-red-300' : 'border-transparent'}`}
                      {...register('harvest_unit')}
                    >
                      <option value="bag_100kg">100kg Bag</option>
                      <option value="bag_50kg">50kg Bag</option>
                      <option value="metric_tonnes">Metric Tonnes</option>
                    </select>
                  </div>
                </div>
                {errors.harvest_qty && <p id="harvest_qty-error" className="text-sm text-red-500 font-medium -mt-4">{errors.harvest_qty.message}</p>}
                
                <div className="relative group">
                  <label htmlFor="revenue_cedis" className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Revenue (Optional)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">₵</span>
                    <input
                      id="revenue_cedis"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      aria-invalid={errors.revenue_cedis ? 'true' : 'false'}
                      aria-describedby={errors.revenue_cedis ? 'revenue_cedis-error' : undefined}
                      className={`w-full text-xl font-bold text-gray-900 bg-gray-50 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all border ${errors.revenue_cedis ? 'border-red-300' : 'border-transparent'}`}
                      {...register('revenue_cedis', { valueAsNumber: true })}
                    />
                  </div>
                  {errors.revenue_cedis && <p id="revenue_cedis-error" className="mt-2 text-sm text-red-500 font-medium">{errors.revenue_cedis.message}</p>}
                </div>

                {completeMutation.isError && (
                  <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm font-medium border border-red-100">
                    {completeMutation.error.message}
                  </div>
                )}

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || completeMutation.isPending}
                    className="w-full py-4 bg-[#1B5E20] text-white rounded-xl font-bold text-lg hover:bg-[#144718] transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSubmitting || completeMutation.isPending ? 'Closing...' : 'Finalize Season'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Cost Modal */}
      {isCostModalOpen && !season.is_complete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsCostModalOpen(false)}
          ></div>
          <div className="relative w-full max-w-2xl z-10 animate-fade-in-up">
            <AddCostForm 
              seasonId={seasonId}
              initialCategory={initialCategory} 
              onSuccess={() => {
                setIsCostModalOpen(false);
                setInitialCategory(undefined);
              }}
              onCancel={() => {
                setIsCostModalOpen(false);
                setInitialCategory(undefined);
              }}
            />
          </div>
        </div>
      )}

      {/* Mobile FAB */}
      {!season.is_complete && (
        <button
          onClick={() => {
            setInitialCategory(undefined);
            setIsCostModalOpen(true);
          }}
          className="md:hidden fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-6 w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-900/30 z-40 active:scale-95 transition-transform"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
        </button>
      )}
    {/* Edit Season Modal */}
    {isEditModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !editSeasonMutation.isPending && setIsEditModalOpen(false)}></div>
        
        <div className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-full">
          <div className="p-8 overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Season</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              editSeasonMutation.mutate({
                area_planted_acres: Number(formData.get('area')),
                season_window: formData.get('window') as 'major' | 'minor' | 'dry',
                year: Number(formData.get('year')),
              });
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Area Planted (acres)</label>
                <input type="number" step="0.01" name="area" defaultValue={season.area_planted_acres} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Season Window</label>
                <select name="window" defaultValue={season.season_window} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none">
                  <option value="major">Major Season</option>
                  <option value="minor">Minor Season</option>
                  <option value="dry">Dry Season</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Year</label>
                <input type="number" name="year" defaultValue={season.year} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 px-4 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={editSeasonMutation.isPending} className="flex-1 py-3 px-4 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50">
                  {editSeasonMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}

    </div>
  );
}
