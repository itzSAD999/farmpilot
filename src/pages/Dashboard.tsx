import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useFarm } from '../hooks/useFarm';
import { listSeasons } from '../api/seasons';
import { getFarmSummary, getCropSummary } from '../api/dashboard';
import { generateEstimate } from '../api/estimates';
import { Money } from '../components/ui/Money';

export function Dashboard() {
  const { farm } = useFarm();
  const navigate = useNavigate();
  
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

  const isLoading = isLoadingSeasons || isLoadingSummary || isLoadingCrops;
  const isError = isErrorSeasons || isErrorSummary || isErrorCrops;

  return (
    <div className="animate-fade-in-up pb-12 max-w-6xl mx-auto">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 font-medium text-sm mt-1">Manage your farm's seasons and track costs.</p>
        </div>
        <div className="flex space-x-3">
          <Link to="/season/new" className="bg-[#1B5E20] text-white font-bold py-2.5 px-4 rounded-xl shadow-sm hover:bg-[#144718] transition-colors flex items-center justify-center">
            <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Start New Season
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B5E20]"></div>
        </div>
      ) : isError ? (
        <div className="bg-red-50 rounded-[32px] p-12 text-center border border-red-100">
          <div className="text-6xl mb-4 opacity-50 inline-block bg-red-100 rounded-full p-6 text-red-500">⚠️</div>
          <h2 className="text-2xl font-bold text-red-900 mb-3">Unable to load dashboard</h2>
          <p className="text-red-700 max-w-md mx-auto mb-8 font-medium">We couldn't load your farm data. Please check your connection and try again.</p>
          <button onClick={() => window.location.reload()} className="bg-red-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-red-700 transition-colors">
            Try Again
          </button>
        </div>
      ) : !seasons || seasons.length === 0 ? (
        <div className="bg-white rounded-[24px] p-12 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center mt-8">
          <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-[#1B5E20]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No seasons tracked yet</h2>
          <p className="text-gray-500 mb-8 max-w-md">Start tracking your crops, costs, and estimates by adding your first season. It only takes a minute!</p>
          <Link to="/season/new" className="bg-[#1B5E20] text-white font-bold py-3 px-8 rounded-xl shadow-sm hover:bg-[#144718] transition-all hover:scale-105 inline-flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Add Your First Season
          </Link>
        </div>
      ) : (
        <>
          {farmSummary && (
            <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-10 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -mt-20 -mr-20 pointer-events-none transition-transform group-hover:scale-110"></div>
              
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-start justify-between gap-10">
                <div className="flex-1 space-y-8">
                  <div>
                    <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">{farmSummary.farm_name}</h2>
                    <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-600">
                      <span className="inline-flex items-center bg-gray-100 px-3 py-1 rounded-full">
                        <span className="font-bold text-gray-900 mr-1.5">{Number(farmSummary.total_area_acres)}</span> acres total
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
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Total Recorded Spend</p>
                      <p className="text-2xl font-bold text-gray-900 flex items-center">
                        <span className="text-sm font-bold text-gray-500 mr-1">GHS</span>
                        <Money pesewas={Number(farmSummary.total_recorded_pesewas)} />
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Total Estimated Cost</p>
                      <p className="text-2xl font-bold text-gray-900 flex items-center">
                        <span className="text-sm font-bold text-gray-500 mr-1">GHS</span>
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
                      <span className="text-2xl font-medium text-emerald-300 mr-1">GHS</span>
                      <Money pesewas={Number(farmSummary.total_possible_saving_pesewas)} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 flex items-start text-sm text-gray-500">
                <svg className="w-5 h-5 text-gray-500 mr-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p>Each crop is estimated separately because different crops need different inputs. These are the totals across your whole farm.</p>
              </div>
            </div>
          )}

          {/* Crop Comparison */}
          {cropsSummary && cropsSummary.length > 0 && (
            <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-10">
              <h3 className="font-bold text-gray-900 mb-6 text-xl">Crop Comparison</h3>
              
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase tracking-widest text-gray-500">
                      <th className="pb-4 font-bold">Crop</th>
                      <th className="pb-4 font-bold">Seasons</th>
                      <th className="pb-4 font-bold">Total Acres</th>
                      <th className="pb-4 font-bold">Total Spent</th>
                      <th className="pb-4 font-bold text-emerald-600">Cost Per Acre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cropsSummary.map(crop => (
                      <tr key={crop.crop_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 font-bold text-gray-900">{crop.crop_name}</td>
                        <td className="py-4 text-gray-500 font-medium">{crop.season_count}</td>
                        <td className="py-4 text-gray-500 font-medium">{Number(crop.total_acres)} ac</td>
                        <td className="py-4 text-gray-500 font-medium">GHS <Money pesewas={Number(crop.total_recorded_pesewas)} /></td>
                        <td className="py-4 text-emerald-600 font-bold text-lg">
                          {crop.cost_per_acre_pesewas ? (
                            <>GHS <Money pesewas={Number(crop.cost_per_acre_pesewas)} /></>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile view stacked cards */}
              <div className="md:hidden space-y-4">
                {cropsSummary.map(crop => (
                  <div key={crop.crop_id} className="border border-gray-100 rounded-2xl p-5 bg-gray-50/50">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-gray-900 text-lg">{crop.crop_name}</h4>
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-widest text-emerald-600 font-bold block mb-1">Cost / Acre</span>
                        <span className="text-emerald-600 font-bold text-xl">
                          {crop.cost_per_acre_pesewas ? (
                            <>GHS <Money pesewas={Number(crop.cost_per_acre_pesewas)} /></>
                          ) : '-'}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm border-t border-gray-100 pt-4">
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Seasons</span>
                        <span className="text-gray-900 font-medium">{crop.season_count}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Acres</span>
                        <span className="text-gray-900 font-medium">{Number(crop.total_acres)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Spent</span>
                        <span className="text-gray-900 font-medium truncate"><Money pesewas={Number(crop.total_recorded_pesewas)} /></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Seasons List Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 min-h-[250px]">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="font-bold text-gray-900">Your Seasons</h3>
                   <Link to="/season/new" className="text-xs font-bold border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">+ New</Link>
                </div>
                
                {/* Empty State 2: Seasons but no costs */}
                {seasons && seasons.length > 0 && farmSummary && Number(farmSummary.total_recorded_pesewas) === 0 && (
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
                        <p className="text-sm text-emerald-800">You've recorded costs! Tap 'Generate estimate' on a season below to see if your spending is on track.</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {seasons?.map((season) => (
                    <Link to={`/season/${season.id}`} key={season.id} className="block p-5 hover:bg-gray-50 rounded-2xl border border-gray-100 hover:border-emerald-200 cursor-pointer transition-all group shadow-sm hover:shadow-md">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start space-x-4">
                          <div className={`w-12 h-12 rounded-xl shrink-0 ${season.is_complete ? 'bg-gray-100' : 'bg-emerald-50'} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                            {season.is_complete ? (
                              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            ) : (
                              <svg className="w-6 h-6 text-[#1B5E20]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center flex-wrap gap-2 mb-1">
                              <h4 className="text-lg font-extrabold text-gray-900 group-hover:text-[#1B5E20] transition-colors">
                                {season.crop_name}
                              </h4>
                              <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md ${season.is_complete ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'}`}>
                                {season.is_complete ? 'Complete' : 'Recording'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 font-medium capitalize">
                              {season.season_window} {season.year} • <span className="font-bold text-gray-700">{season.area_planted_acres} acres</span>
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                          <div className="text-left sm:text-right">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-0.5">Recorded</p>
                            <p className="text-lg font-bold text-gray-900"><span className="text-sm font-medium text-gray-500 mr-1">GHS</span><Money pesewas={season.total_cost_pesewas} /></p>
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
                          <svg className="w-5 h-5 text-gray-300 group-hover:text-[#1B5E20] transition-colors hidden sm:block ml-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-[#0a0a0a] rounded-[24px] p-6 shadow-xl relative overflow-hidden min-h-[250px] text-white">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1B5E20]/20 to-black pointer-events-none" />
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-emerald-500 opacity-20 rounded-full blur-3xl"></div>
                
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-xl mb-2">Need Guidance?</h3>
                    <p className="text-sm text-white/60 leading-relaxed">
                      Check out the recommended best practices for your current active seasons to maximize yield.
                    </p>
                  </div>
                  
                  <button className="w-full mt-6 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-between group">
                    <span>View Guides</span>
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
