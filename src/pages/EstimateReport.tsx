import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getReport, checkProvisionalBenchmarks, getEstimateById } from '../api/estimates';
import { getSeason } from '../api/seasons';
import { getGuidesFor } from '../api/guides';
import { Money } from '../components/ui/Money';
import { CATEGORIES } from '../lib/categories';
import type { CostCategory } from '../api/costs';

export function EstimateReport() {
  const { estimateId } = useParams<{ estimateId: string }>();
  
  const { data: reportLines, isLoading, isError, refetch } = useQuery({
    queryKey: ['report', estimateId],
    queryFn: () => getReport(Number(estimateId)),
    enabled: !!estimateId,
  });

  const seasonId = reportLines?.[0]?.season_id;

  const { data: rawEstimate, isLoading: isEstimateLoading } = useQuery({
    queryKey: ['estimate_raw', estimateId],
    queryFn: () => getEstimateById(Number(estimateId)),
    enabled: !!estimateId && (!reportLines || reportLines.length === 0) && !isError,
  });

  const rawSeasonId = seasonId || rawEstimate?.season_id;

  const { data: season } = useQuery({
    queryKey: ['season', rawSeasonId],
    queryFn: () => getSeason(rawSeasonId!),
    enabled: !!rawSeasonId && (!reportLines || reportLines.length === 0),
  });

  const { data: isProvisional } = useQuery({
    queryKey: ['provisional_check', rawSeasonId],
    queryFn: () => checkProvisionalBenchmarks(rawSeasonId!),
    enabled: !!rawSeasonId,
  });

  const { data: matchedGuides } = useQuery({
    queryKey: ['matchedGuides', rawSeasonId],
    queryFn: () => getGuidesFor(rawSeasonId!),
    enabled: !!rawSeasonId,
  });

  if (isLoading || isEstimateLoading) {
    return (
      <div className="flex-1 p-6 md:p-12 animate-pulse">
        <div className="w-32 h-6 bg-gray-200 rounded mb-8"></div>
        <div className="w-full h-48 bg-gray-200 rounded-3xl mb-8"></div>
        <div className="w-full h-96 bg-gray-200 rounded-3xl"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Error Loading Report</h2>
        <p className="text-gray-500 mb-6">We couldn't load this estimate or a network error occurred.</p>
        <div className="flex justify-center space-x-4">
          <button 
            onClick={() => refetch()} 
            className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500 transition-colors"
          >
            Retry
          </button>
          <Link to="/" className="px-6 py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Handle the empty state correctly
  if (!reportLines || reportLines.length === 0) {
    if (!rawEstimate) {
      return (
        <div className="p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Report not found</h2>
          <p className="text-gray-500 mb-6">This estimate might have been deleted.</p>
          <Link to="/" className="px-6 py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
            Back to Dashboard
          </Link>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto py-12 px-6 lg:px-8 animate-fade-in text-center mt-12">
        <div className="w-24 h-24 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-4 tracking-tight">Need More Data</h2>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-8 max-w-xl mx-auto">
          We don't have enough benchmark data for {season?.crop_name || 'this crop'} yet, and you haven't recorded historical costs. Record actual costs for this season, and FarmPilot will use them for future estimates!
        </p>
        <Link to={`/season/${rawEstimate.season_id}`} className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-colors inline-block shadow-lg shadow-emerald-900/20">
          Back to Season
        </Link>
      </div>
    );
  }

  const meta = reportLines[0];
  const totalPesewas = meta.total_pesewas;
  const methodText = meta.method === 'history' 
    ? `Based on your ${meta.seasons_used} previous season(s).` 
    : "Based on standard rates. Record this season and next year's estimate will use your own figures.";

  // Filter out zeros, calculate percentages, and sort lines by amount descending
  const nonZeroLines = reportLines.filter(l => l.estimated_pesewas > 0);
  const sortedLines = [...nonZeroLines].sort((a, b) => b.estimated_pesewas - a.estimated_pesewas);

  // Filter flags and sort by potential savings descending (biggest saving first)
  const flaggedLines = reportLines
    .filter(line => line.is_flagged)
    .sort((a, b) => (b.potential_saving_pesewas || 0) - (a.potential_saving_pesewas || 0));
  
  const totalSavings = flaggedLines.reduce((sum, line) => sum + (line.potential_saving_pesewas || 0), 0);

  return (
    <div className="max-w-6xl mx-auto py-12 px-6 lg:px-8 animate-fade-in pb-24 print:py-0 print:px-0 print:bg-white">
      {/* Back Link */}
      <Link to={`/season/${meta.season_id}`} className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors flex items-center mb-8 group w-max print:hidden">
        <span className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center mr-3 group-hover:bg-gray-50 transition-colors border border-gray-100">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
        </span>
        Back to Season
      </Link>

      {/* Provisional Notice */}
      {isProvisional && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 shadow-sm flex items-start space-x-3 print:border-gray-400 print:bg-transparent">
          <svg className="w-6 h-6 text-amber-600 mt-0.5 shrink-0 print:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <h3 className="font-bold print:text-black">Notice</h3>
            <p className="text-sm print:text-black">Standard rates are provisional and still being verified.</p>
          </div>
        </div>
      )}

      {/* Header Block */}
      <div className="bg-[#0a0a0a] rounded-[32px] p-8 md:p-12 text-white mb-8 relative overflow-hidden shadow-2xl print:bg-transparent print:shadow-none print:text-black print:p-0 print:border-b print:border-black print:rounded-none print:mb-8">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[100px] -mr-64 -mt-64 print:hidden"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -ml-32 -mb-32 print:hidden"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight print:text-black">
              {meta.crop_name} <span className="text-gray-500 font-normal px-2">|</span> <span className="capitalize">{meta.season_window} {meta.year}</span> <span className="text-gray-500 font-normal px-2">|</span> {meta.area_acres} acres
            </h1>
            
            <div className="mt-8 mb-4">
              <p className="text-gray-500 font-medium mb-1 tracking-widest text-xs uppercase print:text-gray-600">Estimated cost for this season</p>
              <div className="text-6xl md:text-7xl font-light tracking-tighter text-white print:text-black">
                <span className="text-3xl font-medium text-emerald-500 mr-2 align-top print:text-gray-800">GHS</span>
                <Money pesewas={totalPesewas} />
              </div>
            </div>
            
            <div className="inline-flex items-center px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-gray-300 print:bg-transparent print:border-gray-300 print:text-black print:px-0">
              <svg className="w-4 h-4 mr-2 text-emerald-400 print:text-black print:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {methodText}
            </div>
            
            {/* Mobile Jump Link */}
            {flaggedLines.length > 0 && (
              <div className="mt-6 md:hidden print:hidden">
                <a href="#savings" className="inline-flex items-center text-sm font-bold text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                  See where you can save
                  <svg className="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Cost Breakdown */}
        <div className={`lg:col-span-${flaggedLines.length > 0 ? '7' : '12'} print:col-span-12`}>
          <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 print:shadow-none print:border-none print:p-0">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-10 print:text-black">Where Your Money Goes</h2>
            
            <div className="space-y-8 print:space-y-4">
              {sortedLines.map((line) => {
                const percentage = totalPesewas > 0 ? (line.estimated_pesewas / totalPesewas) * 100 : 0;
                const readableCategory = CATEGORIES[line.category as CostCategory]?.label || line.category;
                
                return (
                  <div key={line.category} className="group print:break-inside-avoid">
                    <div className="flex justify-between items-end mb-3">
                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors print:text-black flex items-center">
                          {readableCategory}
                          {line.is_flagged && (
                            <span className="ml-2 inline-flex items-center text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 print:border-black print:text-black print:bg-transparent">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                              High
                            </span>
                          )}
                        </span>
                        <span className="text-sm text-gray-500 font-medium flex items-center print:text-gray-700">
                          <span className="mr-1 text-xs text-gray-500 font-bold print:text-gray-600">GHS</span> 
                          <Money pesewas={line.estimated_pesewas} />
                        </span>
                      </div>
                      <span className="text-3xl font-light text-gray-200 group-hover:text-emerald-500 transition-colors tracking-tighter print:text-black">
                        {Math.round(percentage)}%
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-4 w-full bg-gray-50 dark:bg-white/5 rounded-full overflow-hidden border border-gray-100/50 dark:border-white/10 relative print:border-gray-400 print:bg-white print:h-3">
                      <div 
                        className={`absolute top-0 left-0 h-full ${line.is_flagged ? 'bg-orange-500' : 'bg-emerald-500'} rounded-full transition-all duration-1000 ease-out print:bg-black`} 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Where You Can Save */}
        <div id="savings" className="lg:col-span-5 space-y-6 lg:sticky lg:top-6 print:col-span-12 print:mt-12">
          <h2 className="text-sm font-bold text-orange-500 uppercase tracking-widest px-2 flex items-center mb-6 print:text-black">
            <svg className="w-5 h-5 mr-2 print:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Where You Can Save
          </h2>
          
          {flaggedLines.length === 0 ? (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-[24px] p-8 border border-emerald-100 dark:border-emerald-800 text-center print:border-gray-300 print:bg-transparent">
              <div className="w-16 h-16 bg-white dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-emerald-500 dark:text-emerald-400 print:border print:border-gray-300 print:text-black">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100 mb-2 print:text-black">Looking Good!</h3>
              <p className="text-emerald-700 dark:text-emerald-300 font-medium print:text-gray-700">Nothing stands out as high this season.</p>
            </div>
          ) : (
            <>
              {flaggedLines.map((line) => {
                const readableCategory = CATEGORIES[line.category as CostCategory]?.label || line.category;
                const guide = matchedGuides?.find((g: any) => g.category === line.category);
                
                const cardContent = (
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                      <h3 className="font-bold text-orange-900 dark:text-orange-100 text-lg uppercase tracking-tight print:text-black">
                        <span className="mr-2 text-xl" aria-hidden="true">⚠️</span>
                        <span className="sr-only">FLAGGED: </span>
                        {readableCategory}
                      </h3>
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 text-xs font-bold border border-orange-200 dark:border-orange-800 print:bg-transparent print:border-black print:text-black">
                        <svg className="w-3.5 h-3.5 mr-1.5 text-orange-600 dark:text-orange-400 print:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        +{line.variance_pct}% above expected
                      </span>
                    </div>
                    
                    {line.potential_saving_pesewas != null && (
                      <p className="text-xl font-light text-orange-800 dark:text-orange-200 mb-5 print:text-black">
                        Possible saving: <span className="font-bold text-orange-600 dark:text-orange-400 print:text-black">GHS <Money pesewas={line.potential_saving_pesewas} /></span>
                      </p>
                    )}
                    
                    {!line.advice ? (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 font-bold rounded-lg border border-red-200 dark:border-red-800 print:border-black print:text-black print:bg-transparent">
                        BUG: Missing advice for flagged category. The estimate engine must provide advice.
                      </div>
                    ) : (
                      <p className="text-orange-900/80 dark:text-orange-100/80 font-medium leading-relaxed text-sm print:text-gray-800 mb-4">
                        {line.advice}
                      </p>
                    )}

                    {guide && (
                      <div className="mt-4 pt-4 border-t border-orange-200/50 dark:border-orange-800/30 flex items-center justify-between text-orange-700 dark:text-orange-400 font-bold group-hover:text-orange-900 dark:group-hover:text-orange-300 transition-colors">
                        <span>Read the full guide</span>
                        <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    )}
                  </div>
                );

                const cardClasses = "block bg-[#fff8f1] dark:bg-[#2a1a10] rounded-[24px] p-6 md:p-8 border border-orange-100/50 dark:border-orange-900/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-all hover:border-orange-300 dark:hover:border-orange-700 print:border-gray-400 print:bg-transparent print:shadow-none print:break-inside-avoid";

                return guide ? (
                  <Link key={line.category} to={`/guides/${guide.id}`} className={cardClasses}>
                    {cardContent}
                  </Link>
                ) : (
                  <div key={line.category} className={cardClasses}>
                    {cardContent}
                  </div>
                );
              })}
              
              {/* Total Savings Card */}
              <div className="bg-emerald-600 rounded-[24px] p-6 md:p-8 text-white shadow-lg relative overflow-hidden flex items-center justify-between mt-8 print:bg-transparent print:text-black print:border-2 print:border-black print:shadow-none">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl -mr-12 -mt-12 print:hidden"></div>
                <div className="relative z-10 w-full flex items-center justify-between">
                  <p className="text-emerald-100 text-sm font-bold uppercase tracking-widest print:text-black">Total possible saving</p>
                  <div className="text-3xl font-bold tracking-tight print:text-black">
                    <span className="text-emerald-300 font-medium text-lg mr-1 print:text-black">GHS</span>
                    <Money pesewas={totalSavings} />
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
