import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getSeason, completeSeason } from '../api/seasons';
import { listCosts } from '../api/costs';
import { generateEstimate } from '../api/estimates';
import { AddCostForm } from '../components/domain/AddCostForm';
import { CostList } from '../components/features/CostList';
import { Money } from '../components/ui/Money';
import { useOnline } from '../hooks/useOnline';
const closeSeasonSchema = z.object({
  harvest_qty: z.number({ message: 'Please enter a valid quantity.' }).positive('Quantity must be greater than zero.'),
  harvest_unit: z.enum(['bag_100kg', 'bag_50kg', 'metric_tonnes']),
  revenue_cedis: z.number().nonnegative().optional().or(z.literal('')),
});

type CloseSeasonFormData = z.infer<typeof closeSeasonSchema>;

export function SeasonDetail() {
  const { id } = useParams<{ id: string }>();
  const seasonId = Number(id);
  const navigate = useNavigate();
  const isOnline = useOnline();

  const queryClient = useQueryClient();
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const { data: season, isLoading, isError } = useQuery({
    queryKey: ['season', seasonId],
    queryFn: () => getSeason(seasonId),
    enabled: !!seasonId,
  });

  const { data: seasonCosts } = useQuery({
    queryKey: ['seasonCosts', seasonId],
    queryFn: () => listCosts(seasonId),
    enabled: !!seasonId,
  });

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

  if (isLoading) {
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
        <h2 className="text-2xl font-bold text-red-900 mb-2">Season not found</h2>
        <p className="text-red-700 mb-8 max-w-md mx-auto">We couldn't load this season. This usually happens if your session has expired.</p>
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
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[100px] -mr-64 -mt-64"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -ml-32 -mb-32"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
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
                  <span className="text-3xl font-medium text-emerald-500 mr-2 align-top">GHS</span>
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
                  onClick={() => setIsCostModalOpen(true)}
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
                    onClick={() => setIsCostModalOpen(true)}
                    className="inline-flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-sm"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    Record First Cost
                  </button>
                )}
              </div>
            ) : (
              <CostList seasonId={seasonId} />
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
              onSuccess={() => setIsCostModalOpen(false)}
              onCancel={() => setIsCostModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Mobile FAB */}
      {!season.is_complete && (
        <button
          onClick={() => setIsCostModalOpen(true)}
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-900/30 z-40 active:scale-95 transition-transform"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
        </button>
      )}

    </div>
  );
}
