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

  const queryClient = useQueryClient();
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
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
      setGenerateError(error.message);
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
      <div className="p-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Season not found</h2>
        <Link to="/" className="text-emerald-600 font-bold hover:underline">Back to Dashboard</Link>
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

      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <Link to="/" className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors flex items-center mb-8 group">
            <span className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center mr-3 group-hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </span>
            Dashboard
          </Link>
          
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">{season.crop_name}</h1>
            {season.is_complete && (
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Completed
              </span>
            )}
          </div>
          <p className="text-xl text-gray-500 font-medium capitalize">
            {season.season_window} Season {season.year} <span className="mx-2 text-gray-300">•</span> {season.area_planted_acres} acres
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            disabled={!hasCosts || generateMutation.isPending}
            onClick={() => {
              setGenerateError(null);
              generateMutation.mutate();
            }}
            title={hasCosts ? "Generate an estimate based on your recorded costs" : "Record at least one cost first"}
            className={`font-bold py-2.5 px-5 rounded-xl transition-all flex items-center ${hasCosts ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md active:scale-95' : 'bg-white text-gray-400 border border-gray-200 cursor-not-allowed opacity-70'}`}
          >
            {generateMutation.isPending && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {generateMutation.isPending ? 'Generating...' : 'Generate Estimate'}
          </button>
          
          {!season.is_complete && (
            <button 
              onClick={() => setIsCloseModalOpen(true)}
              className="bg-[#0a0a0a] text-white font-bold py-2.5 px-5 rounded-xl hover:bg-gray-800 transition-colors"
            >
              Close Season
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Cost List and Form Area */}
        <div className="lg:col-span-2 space-y-8">
          {!season.is_complete && <AddCostForm seasonId={seasonId} />}
          <CostList seasonId={seasonId} />
        </div>

        {/* Sidebar Summary (1 column) */}
        <div className="space-y-6">
          <div className="bg-[#1B5E20] rounded-[24px] p-8 text-white relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
            <h3 className="text-emerald-100 font-bold uppercase tracking-widest text-xs mb-2 relative z-10">Total Costs</h3>
            <p className="text-4xl font-light tracking-tight relative z-10">₵{(totalCostPesewas / 100).toFixed(2)}</p>
          </div>

          {season.is_complete && (
            <div className="bg-white rounded-[24px] p-8 border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
              <h3 className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-4">Harvest Summary</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Yield</p>
                  <p className="text-lg font-bold text-gray-900">{season.harvest_qty} {season.harvest_unit?.replace('_', ' ')}</p>
                </div>
                {season.revenue_pesewas != null && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Revenue</p>
                    <p className="text-lg font-bold text-emerald-600">₵{(season.revenue_pesewas / 100).toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>
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

              {/* Crucial Motivational Text */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-8">
                <p className="text-blue-900 text-sm font-medium leading-relaxed">
                  Closing the season means we can use it next time. Your next estimate for this crop will be based on your own figures instead of standard rates.
                </p>
              </div>

              <form onSubmit={handleSubmit(onCloseSubmit)} className="space-y-6">
                
                {/* Harvest Yield */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group col-span-1">
                    <label className="block text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">Quantity</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.0"
                      className={`w-full text-2xl font-bold text-gray-900 bg-gray-50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all border ${errors.harvest_qty ? 'border-red-300' : 'border-transparent'}`}
                      {...register('harvest_qty', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="relative group col-span-1">
                    <label className="block text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">Unit</label>
                    <select
                      className={`w-full appearance-none text-base font-bold text-gray-900 bg-gray-50 rounded-xl px-4 py-4 h-[58px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all border cursor-pointer ${errors.harvest_unit ? 'border-red-300' : 'border-transparent'}`}
                      {...register('harvest_unit')}
                    >
                      <option value="bag_100kg">100kg Bag</option>
                      <option value="bag_50kg">50kg Bag</option>
                      <option value="metric_tonnes">Metric Tonnes</option>
                    </select>
                  </div>
                </div>
                {errors.harvest_qty && <p className="text-sm text-red-500 font-medium -mt-4">{errors.harvest_qty.message}</p>}
                
                {/* Revenue */}
                <div className="relative group">
                  <label className="block text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">Revenue (Optional)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">₵</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className={`w-full text-xl font-bold text-gray-900 bg-gray-50 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all border ${errors.revenue_cedis ? 'border-red-300' : 'border-transparent'}`}
                      {...register('revenue_cedis', { valueAsNumber: true })}
                    />
                  </div>
                  {errors.revenue_cedis && <p className="mt-2 text-sm text-red-500 font-medium">{errors.revenue_cedis.message}</p>}
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
    </div>
  );
}
