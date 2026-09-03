import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReport, checkProvisionalBenchmarks, getEstimateById, updateEstimateLine, generateEstimate } from '../api/estimates';
import { getSeason } from '../api/seasons';
import { getExpectedCategoriesForCrop, listCosts } from '../api/costs';
import { getGuidesFor } from '../api/guides';
import { Money } from '../components/ui/Money';
import { pesewasToCedis, cedisToPesewas } from '../lib/money';
import { CATEGORIES, ESSENTIAL_CATEGORIES } from '../lib/categories';
import type { CostCategory } from '../api/costs';
import { AddCostForm } from '../components/domain/AddCostForm';
import { InfoTip } from '../components/ui/InfoTip';
import { useAuth } from '../hooks/useAuth';
import { getProfile } from '../api/auth';
import { getTwiAdvice, playAdviceAudio, speakEnglish, type AdviceTranslation } from '../lib/khaya';

export function EstimateReport() {
  const { estimateId } = useParams<{ estimateId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [costModalCategory, setCostModalCategory] = useState<CostCategory | undefined>(undefined);
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [loadingAudioCategory, setLoadingAudioCategory] = useState<string | null>(null);

  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: getProfile,
    enabled: !!user?.id,
  });
  const showTwiText = profile?.preferred_language === 'tw';

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

  // Reads only from the pre-generated cache (scripts/generate_khaya.ts) —
  // never calls the Khaya API itself. Computed from reportLines directly
  // (not the later-derived flaggedLines) so this hook can sit above the
  // component's early returns below, same as every other query here.
  const flaggedCategoriesForAdvice = (reportLines ?? [])
    .filter((l) => l.is_flagged)
    .map((l) => l.category);
  const { data: twiAdviceByCategory } = useQuery({
    queryKey: ['twiAdvice', flaggedCategoriesForAdvice.join(',')],
    queryFn: async () => {
      const entries = await Promise.all(
        flaggedCategoriesForAdvice.map(
          async (category) => [category, await getTwiAdvice(category)] as const
        )
      );
      return Object.fromEntries(entries) as Record<string, AdviceTranslation>;
    },
    enabled: flaggedCategoriesForAdvice.length > 0,
  });

  // Plays the real, pre-generated Twi clip when Twi text is showing and
  // one exists; otherwise reads the currently-displayed English advice
  // aloud using the browser's own text-to-speech — free, no API call, no
  // quota, and it's what makes this button useful to an English reader
  // too, not just a Twi one.
  const handlePlayAdvice = async (category: string, englishText: string) => {
    setLoadingAudioCategory(category);
    const twiAudioUrl = twiAdviceByCategory?.[category]?.audioUrl;
    if (showTwiText && twiAudioUrl) {
      await playAdviceAudio(twiAudioUrl);
    } else {
      await speakEnglish(englishText);
    }
    setLoadingAudioCategory(null);
  };

  const needsSetup = !reportLines || reportLines.length === 0;

  const { data: expectedCategories } = useQuery({
    queryKey: ['expectedCategories', season?.crop_id],
    queryFn: () => getExpectedCategoriesForCrop(season!.crop_id),
    enabled: !!season?.crop_id && needsSetup,
  });

  const { data: seasonCosts } = useQuery({
    queryKey: ['seasonCosts', rawSeasonId],
    queryFn: () => listCosts(rawSeasonId!),
    enabled: !!rawSeasonId && needsSetup,
  });

  // Crop-specific expected categories when norms exist for this crop; otherwise
  // fall back to the same general checklist used elsewhere (CostList's Quick Fill).
  const checklistCategories = (expectedCategories && expectedCategories.length > 0) ? expectedCategories : ESSENTIAL_CATEGORIES;
  const recordedCategories = new Set((seasonCosts || []).map(c => c.category));
  const missingCategories = checklistCategories.filter(c => !recordedCategories.has(c));

  const regenerateMutation = useMutation({
    mutationFn: () => generateEstimate(rawSeasonId!),
    onSuccess: (newEstimateId) => {
      navigate(`/report/${newEstimateId}`, { replace: true });
    },
  });

  const updateLineMutation = useMutation({
    mutationFn: (variables: { category: string; pesewas: number }) => 
      updateEstimateLine(Number(estimateId), variables.category, variables.pesewas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', estimateId] });
      queryClient.invalidateQueries({ queryKey: ['estimate_raw', estimateId] });
      queryClient.invalidateQueries({ queryKey: ['farm_summary'] });
      setEditingCategory(null);
    }
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

    const usingCropSpecificChecklist = (expectedCategories?.length || 0) > 0;
    const allExpectedRecorded = missingCategories.length === 0;

    return (
      <div className="max-w-4xl mx-auto py-12 px-6 lg:px-8 animate-fade-in mt-12">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100 dark:border-emerald-800/50">
            <svg className="w-10 h-10 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-4 tracking-tight">Need More Data</h2>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Record the categories below for <span className="font-bold text-gray-700 dark:text-gray-300">{season?.crop_name || 'this crop'}</span> to unlock a real estimate — tap any red item to fix it.
            {!usingCropSpecificChecklist && " We don't have crop-specific benchmark rates for this crop yet, so this uses the essentials every farmer tracks — once you record them, we'll build future estimates from your own figures."}
          </p>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] rounded-[32px] p-8 shadow-xl border border-gray-100 dark:border-white/5 mb-10 max-w-2xl mx-auto relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>

            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              Cost Tracking Checklist
              <span className="ml-auto text-sm font-medium text-gray-500 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full">
                {(checklistCategories.length - missingCategories.length)} / {checklistCategories.length} recorded
              </span>
            </h3>

            <div className="space-y-3 relative z-10">
              {checklistCategories.map(cat => {
                const isMissing = missingCategories.includes(cat);
                const config = CATEGORIES[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      if (!isMissing) return;
                      setCostModalCategory(cat);
                      setIsCostModalOpen(true);
                    }}
                    disabled={!isMissing}
                    className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left transition-colors ${
                      isMissing
                        ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 hover:border-red-400 hover:bg-red-100/60 dark:hover:bg-red-500/20 cursor-pointer'
                        : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 cursor-default'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isMissing ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-emerald-500 text-white'}`}>
                      {isMissing ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                        {config?.label || cat}
                        {isMissing ? (
                          <span className="text-[10px] uppercase tracking-widest font-bold text-red-600 dark:text-red-400">Needs fixing</span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-600 dark:text-emerald-400">Fixed</span>
                        )}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{config?.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
        </div>

        <div className="text-center flex flex-col sm:flex-row gap-3 justify-center">
          {allExpectedRecorded ? (
            <button
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending}
              className="inline-flex items-center justify-center px-10 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-500 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-emerald-900/20 disabled:opacity-50"
            >
              {regenerateMutation.isPending ? 'Generating...' : 'Generate Estimate Now'}
              {!regenerateMutation.isPending && <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            </button>
          ) : null}
          <Link
            to={`/season/${rawEstimate?.season_id || seasonId}`}
            className="inline-flex items-center justify-center px-10 py-4 bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-white/10 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-white/10 transition-all"
          >
            Go to Season
          </Link>
        </div>

        {isCostModalOpen && rawSeasonId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm" onClick={() => setIsCostModalOpen(false)}></div>
            <div className="relative w-full max-w-2xl z-10 animate-fade-in-up">
              <AddCostForm
                seasonId={rawSeasonId}
                initialCategory={costModalCategory}
                onSuccess={() => {
                  setIsCostModalOpen(false);
                  setCostModalCategory(undefined);
                  queryClient.invalidateQueries({ queryKey: ['seasonCosts', rawSeasonId] });
                }}
                onCancel={() => {
                  setIsCostModalOpen(false);
                  setCostModalCategory(undefined);
                }}
              />
            </div>
          </div>
        )}
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
      {/* Back Link + Download */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        <Link to={`/season/${meta.season_id}`} className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors flex items-center group w-max">
          <span className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center mr-3 group-hover:bg-gray-50 transition-colors border border-gray-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </span>
          Back to Season
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2.5 rounded-xl shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Download PDF
        </button>
      </div>

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

          {/* Record a new cost — recalculates the estimate immediately on save */}
          <button
            onClick={() => {
              setCostModalCategory(undefined);
              setIsCostModalOpen(true);
            }}
            className="print:hidden shrink-0 inline-flex items-center justify-center px-6 py-3.5 bg-white text-gray-900 font-bold rounded-2xl hover:bg-gray-100 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Record a Cost
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Cost Breakdown */}
        <div className={`${flaggedLines.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'} print:col-span-12`}>
          <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 print:shadow-none print:border-none print:p-0">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-10 print:text-black flex items-center gap-2">
              Where Your Money Goes
              <InfoTip text="'Recorded' categories are exactly what you've entered this season; 'Predicted' ones are a prediction — your own history if you have it for this crop, otherwise the standard benchmark — that will be replaced the moment you record something real for that category." />
            </h2>
            
            <div className="space-y-8 print:space-y-4">
              {sortedLines.map((line) => {
                const percentage = totalPesewas > 0 ? (line.estimated_pesewas / totalPesewas) * 100 : 0;
                const readableCategory = CATEGORIES[line.category as CostCategory]?.label || line.category;
                
                return (
                  <div key={line.category} className="group print:break-inside-avoid">
                    <div className="flex justify-between items-end mb-3">
                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors print:text-black flex items-center">
                          <Link
                            to={`/season/${line.season_id}/category/${line.category}`}
                            className="hover:underline print:no-underline print:pointer-events-none"
                            title={line.is_actual ? `See every ${readableCategory.toLowerCase()} entry behind this number` : `Nothing recorded in ${readableCategory.toLowerCase()} yet — tap to record one`}
                          >
                            {readableCategory}
                          </Link>
                          <span
                            className={`ml-2 inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border print:hidden ${
                              line.is_actual
                                ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                                : 'text-gray-500 bg-gray-50 border-gray-200'
                            }`}
                          >
                            {line.is_actual ? 'Recorded' : 'Predicted'}
                          </span>
                          <InfoTip
                            className="ml-1"
                            text={line.is_actual
                              ? "This is real money — exactly what you've entered for this category this season, not a prediction."
                              : "You haven't recorded anything in this category yet, so this figure is a prediction — your own history for this crop if you have it, otherwise the standard benchmark. It's replaced the moment you record something real."}
                          />
                          {line.is_flagged && (
                            <>
                              <span className="ml-2 inline-flex items-center text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 print:border-black print:text-black print:bg-transparent">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                High
                              </span>
                              <InfoTip
                                className="ml-1 print:hidden"
                                text={`"High" means what you actually recorded here came in more than 30% above the standard benchmark rate for ${readableCategory.toLowerCase()} — real overspending, not a guess. Check the suggestion below for a specific way to reduce it.`}
                              />
                            </>
                          )}
                          {!line.is_actual && (
                            <button
                              onClick={() => {
                                setCostModalCategory(line.category as CostCategory);
                                setIsCostModalOpen(true);
                              }}
                              className="print:hidden ml-2 inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border text-blue-700 bg-blue-50 border-blue-100 hover:bg-blue-100 transition-colors"
                              title="Record what you actually spent on this category"
                            >
                              + Record actual
                            </button>
                          )}
                        </span>
                        <span className="text-sm text-gray-500 font-medium flex items-center print:text-gray-700 h-8">
                          {editingCategory === line.category ? (
                            <form 
                              className="flex items-center gap-2"
                              onSubmit={(e) => {
                                e.preventDefault();
                                if (!editAmount || isNaN(Number(editAmount))) return;
                                updateLineMutation.mutate({ category: line.category, pesewas: cedisToPesewas(Number(editAmount)) });
                              }}
                            >
                              <span className="text-xs text-gray-500 font-bold">GHS</span>
                              <input 
                                type="number" 
                                step="0.01"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="w-24 px-2 py-1 text-sm font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-[#1a1a1a] border border-emerald-500 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                autoFocus
                                disabled={updateLineMutation.isPending}
                              />
                              <button 
                                type="submit"
                                disabled={updateLineMutation.isPending}
                                className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-1 rounded transition-colors disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button 
                                type="button"
                                onClick={() => setEditingCategory(null)}
                                disabled={updateLineMutation.isPending}
                                className="text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1 transition-colors"
                              >
                                Cancel
                              </button>
                            </form>
                          ) : (
                            <div className="flex items-center group/edit">
                              <Money pesewas={line.estimated_pesewas} />
                              <button
                                onClick={() => {
                                  setEditAmount(pesewasToCedis(line.estimated_pesewas).toString());
                                  setEditingCategory(line.category);
                                }}
                                className="ml-2 opacity-0 group-hover/edit:opacity-100 focus:opacity-100 transition-opacity text-emerald-600 hover:text-emerald-700 print:hidden"
                                title="Edit estimate"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                            </div>
                          )}
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
            <InfoTip className="ml-2" text="A category is flagged here only once you've actually recorded a real cost for it that comes in more than 30% above the standard benchmark rate — a still-predicted category is never flagged, since there's nothing real to compare yet." />
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
                const canPlayTwi = showTwiText && !!twiAdviceByCategory?.[line.category]?.audioUrl;
                const speakerButtonLabel = canPlayTwi ? 'Play this advice in Twi' : 'Read this advice aloud';

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
                        Possible saving: <span className="font-bold text-orange-600 dark:text-orange-400 print:text-black"><Money pesewas={line.potential_saving_pesewas} /></span>
                      </p>
                    )}
                    
                    {!line.advice ? (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 font-bold rounded-lg border border-red-200 dark:border-red-800 print:border-black print:text-black print:bg-transparent">
                        BUG: Missing advice for flagged category. The estimate engine must provide advice.
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 mb-4">
                        <p className="text-orange-900/80 dark:text-orange-100/80 font-medium leading-relaxed text-sm print:text-gray-800 flex-1">
                          {showTwiText && twiAdviceByCategory?.[line.category]?.text
                            ? twiAdviceByCategory[line.category].text
                            : line.advice}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePlayAdvice(line.category, line.advice!);
                          }}
                          disabled={loadingAudioCategory === line.category}
                          aria-label={speakerButtonLabel}
                          title={speakerButtonLabel}
                          className="flex-shrink-0 w-11 h-11 rounded-full bg-orange-100 dark:bg-orange-900/40 hover:bg-orange-200 dark:hover:bg-orange-800/60 flex items-center justify-center text-orange-700 dark:text-orange-300 transition-colors print:hidden disabled:opacity-60"
                        >
                          {loadingAudioCategory === line.category ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                          )}
                        </button>
                      </div>
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
                    <Money pesewas={totalSavings} />
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {isCostModalOpen && rawSeasonId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm" onClick={() => setIsCostModalOpen(false)}></div>
          <div className="relative w-full max-w-2xl z-10 animate-fade-in-up">
            <AddCostForm
              seasonId={rawSeasonId}
              initialCategory={costModalCategory}
              onSuccess={() => {
                setIsCostModalOpen(false);
                setCostModalCategory(undefined);
                // A cost just landed in season_costs — the estimate on screen
                // was computed before it existed, so regenerate immediately
                // rather than leaving a stale report showing "Predicted."
                regenerateMutation.mutate();
              }}
              onCancel={() => {
                setIsCostModalOpen(false);
                setCostModalCategory(undefined);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
