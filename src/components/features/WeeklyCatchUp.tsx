import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFarm } from '../../hooks/useFarm';
import { listSeasons } from '../../api/seasons';
import { addCost, getExpectedCategoriesForCrop, CostCategory } from '../../api/costs';
import { CATEGORIES } from '../../lib/categories';

interface WeeklyCatchUpProps {
  onComplete?: () => void;
}

interface CatchupStep {
  category: CostCategory;
  seasonIds: number[];
  cropNames: string[];
  seasonAreas: number[];
}

// Fixed (not random-per-render) burst offsets for the completion celebration —
// deterministic so the animation doesn't reshuffle on an unrelated re-render.
const CONFETTI_PIECES = [
  { dx: -60, dy: -55, rot: 40, color: '#10b981', delay: 0 },
  { dx: 55, dy: -60, rot: -35, color: '#34d399', delay: 40 },
  { dx: -75, dy: -10, rot: 120, color: '#f59e0b', delay: 80 },
  { dx: 70, dy: -15, rot: -110, color: '#3b82f6', delay: 60 },
  { dx: -35, dy: -75, rot: 200, color: '#a78bfa', delay: 120 },
  { dx: 35, dy: -78, rot: -190, color: '#10b981', delay: 20 },
  { dx: -20, dy: 60, rot: 80, color: '#f59e0b', delay: 100 },
  { dx: 20, dy: 62, rot: -80, color: '#34d399', delay: 140 },
  { dx: -80, dy: 25, rot: 150, color: '#3b82f6', delay: 160 },
  { dx: 80, dy: 20, rot: -150, color: '#a78bfa', delay: 60 },
  { dx: 0, dy: -85, rot: 300, color: '#10b981', delay: 90 },
  { dx: 0, dy: 80, rot: -300, color: '#f59e0b', delay: 40 },
] as const;

export function WeeklyCatchUp({ onComplete }: WeeklyCatchUpProps) {
  const { farm } = useFarm();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);
  
  const [steps, setSteps] = useState<CatchupStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  const [amountInput, setAmountInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState(true);

  const { data: seasons, isLoading: isLoadingSeasons } = useQuery({
    queryKey: ['seasons', farm?.id],
    queryFn: () => listSeasons(farm!.id as number),
    enabled: !!farm?.id,
  });

  const activeSeasons = seasons?.filter(s => !s.is_complete) || [];

  useEffect(() => {
    async function loadSteps() {
      if (isLoadingSeasons || !seasons) return;
      if (activeSeasons.length === 0) {
        setLoadingSteps(false);
        return;
      }
      
      try {
        const categoryMap = new Map<CostCategory, { seasonIds: number[], cropNames: string[], seasonAreas: number[] }>();
        for (const season of activeSeasons) {
          const cats = await getExpectedCategoriesForCrop(season.crop_id);
          for (const c of cats) {
            if (!categoryMap.has(c)) {
              categoryMap.set(c, { seasonIds: [], cropNames: [], seasonAreas: [] });
            }
            categoryMap.get(c)!.seasonIds.push(season.id);
            categoryMap.get(c)!.cropNames.push(season.crop_name);
            categoryMap.get(c)!.seasonAreas.push(Number(season.area_planted_acres) || 0);
          }
        }
        
        const allSteps = Array.from(categoryMap.entries()).map(([category, data]) => ({
          category,
          ...data
        }));
        setSteps(allSteps);
      } catch (err) {
        console.error('Failed to load expected categories', err);
      } finally {
        setLoadingSteps(false);
      }
    }
    loadSteps();
  }, [isLoadingSeasons, activeSeasons.length]);

  if (isLoadingSeasons || loadingSteps) return null;
  if (activeSeasons.length === 0 || steps.length === 0) return null;
  if (!isOpen) return null;

  const currentStep = steps[currentStepIndex];
  const isDone = currentStepIndex >= steps.length;

  const handleSkip = () => {
    setAmountInput('');
    setCurrentStepIndex(s => s + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(amountInput);
    if (!amount || amount <= 0) {
      handleSkip();
      return;
    }

    setIsSubmitting(true);
    const amountPesewas = Math.round(amount * 100);

    // Split proportionally to each season's planted acreage, not evenly —
    // a 1-acre and a 5-acre active season sharing a category should not
    // absorb the same share of a combined cost. Falls back to an even
    // split only if no season in the group has a usable area (e.g. 0).
    const totalArea = currentStep.seasonAreas.reduce((a, b) => a + b, 0);
    const shares = totalArea > 0
      ? currentStep.seasonAreas.map(area => area / totalArea)
      : currentStep.seasonIds.map(() => 1 / currentStep.seasonIds.length);
    const amounts = shares.map(share => Math.round(amountPesewas * share));
    // Rounding can leave the sum a pesewa or two off the entered total —
    // correct it on the largest share so the total always reconciles.
    const roundingDiff = amountPesewas - amounts.reduce((a, b) => a + b, 0);
    if (roundingDiff !== 0) {
      const largestIdx = shares.indexOf(Math.max(...shares));
      amounts[largestIdx] += roundingDiff;
    }

    try {
      const promises = currentStep.seasonIds.map((seasonId, idx) =>
        addCost({
          season_id: seasonId,
          category: currentStep.category,
          amount_pesewas: amounts[idx],
          description: currentStep.seasonIds.length > 1 ? 'Weekly catch-up (split by planted acreage)' : 'Weekly catch-up',
          date_incurred: new Date().toISOString().split('T')[0],
        })
      );

      await Promise.all(promises);
      
      await queryClient.invalidateQueries({ queryKey: ['seasonCosts'] });
      await queryClient.invalidateQueries({ queryKey: ['farm_summary'] });
      await queryClient.invalidateQueries({ queryKey: ['seasons'] });
      
      setAmountInput('');
      setCurrentStepIndex(s => s + 1);
    } catch (e) {
      console.error(e);
      alert('Failed to save cost. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (onComplete) onComplete();
  };

  if (isDone) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-[32px] p-8 shadow-sm border border-emerald-100 dark:border-emerald-800/30 mb-8 animate-fade-in-up flex flex-col items-center text-center relative overflow-hidden">
        <div className="relative w-16 h-16 mb-4">
          {CONFETTI_PIECES.map((c, idx) => (
            <span
              key={idx}
              className="absolute top-1/2 left-1/2 w-2 h-2 rounded-sm animate-confetti"
              style={{
                backgroundColor: c.color,
                // @ts-expect-error custom properties read by the keyframe animation
                '--dx': `${c.dx}px`,
                '--dy': `${c.dy}px`,
                '--rot': `${c.rot}deg`,
                animationDelay: `${c.delay}ms`,
              }}
            />
          ))}
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-800/50 rounded-full flex items-center justify-center animate-check-pop relative">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">You're all caught up!</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Your records are up to date. This keeps your estimates accurate.</p>
        <button onClick={handleClose} className="bg-emerald-600 text-white font-bold px-6 py-2 rounded-xl hover:bg-emerald-700 transition-colors">Continue to Dashboard</button>
      </div>
    );
  }

  const categoryLabel = CATEGORIES[currentStep.category]?.label || currentStep.category;
  
  // Format crop names beautifully (e.g. "Maize, Cowpea and Cassava")
  const cropsFormatter = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });
  const formattedCrops = cropsFormatter.format(currentStep.cropNames);

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-[32px] p-6 sm:p-8 shadow-xl border border-emerald-100 dark:border-emerald-900/30 mb-8 animate-fade-in-up relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div>
          <span className="inline-flex items-center text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-md mb-3">
            Weekly Check-in • Question {currentStepIndex + 1} of {steps.length}
          </span>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Did you spend anything on <span className="text-emerald-600 dark:text-emerald-400">{categoryLabel}</span> for <span className="text-emerald-600 dark:text-emerald-400">{formattedCrops}</span> this week?
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {currentStep.seasonIds.length > 1 ? 'Enter the total amount. We will split it by how many acres you planted of each.' : 'Enter the total for this specific crop.'}
          </p>
        </div>
        <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-4 shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 relative z-10">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="text-gray-500 font-bold">GHS</span>
          </div>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder="0.00"
            className="w-full pl-14 pr-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl font-bold text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleSkip} className="px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
            Nothing
          </button>
          <button type="submit" disabled={!amountInput || isSubmitting} className="px-6 py-3 bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors flex-1 sm:flex-none flex items-center justify-center">
            {isSubmitting ? 'Saving...' : 'Save Cost'}
          </button>
        </div>
      </form>
    </div>
  );
}
