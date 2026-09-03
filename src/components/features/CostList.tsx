import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { listCosts, quickFillCosts } from '../../api/costs';
import type { CostItem, CostCategory } from '../../api/costs';
import { useState } from 'react';
import { CATEGORIES, ESSENTIAL_CATEGORIES } from '../../lib/categories';
import { Money } from '../ui/Money';
import { AddCostForm } from '../domain/AddCostForm';

interface CostListProps {
  seasonId: number;
}

export function CostList({ seasonId }: CostListProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [quickAddCategory, setQuickAddCategory] = useState<CostCategory | null>(null);

  const { data: costs, isLoading, isError } = useQuery<CostItem[]>({
    queryKey: ['seasonCosts', seasonId],
    queryFn: () => listCosts(seasonId),
  });

  const quickFillMutation = useMutation({
    mutationFn: () => quickFillCosts(seasonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonCosts', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] });
    }
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-[32px] p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-gray-100 min-h-[400px] flex flex-col justify-center animate-pulse space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-2xl w-full"></div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 rounded-[32px] p-8 text-center border border-red-100 min-h-[300px] flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold text-red-900 mb-2">Unable to load costs</h2>
        <p className="text-red-700">Please check your connection and try again.</p>
        <button onClick={() => queryClient.invalidateQueries({ queryKey: ['seasonCosts', seasonId] })} className="mt-4 text-red-700 font-bold hover:underline">Retry</button>
      </div>
    );
  }

  const expectedCategories = ESSENTIAL_CATEGORIES;

  // Initialize with expected categories to ensure they always render
  const costsByCategory = (costs || []).reduce((acc, cost) => {
    if (!acc[cost.category]) {
      acc[cost.category] = [];
    }
    acc[cost.category].push(cost);
    return acc;
  }, Object.fromEntries(expectedCategories.map(cat => [cat, []])) as Record<string, CostItem[]>);

  // Define category order (matches CATEGORIES order roughly)
  const categoryOrder = ['seeds', 'fertiliser', 'agrochem', 'land_prep', 'labour', 'transport', 'storage', 'other'];
  const sortedCategories = Object.keys(costsByCategory).sort((a, b) => {
    return categoryOrder.indexOf(a) - categoryOrder.indexOf(b);
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {(!costs || costs.length === 0) && (
        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-[24px] p-6 text-center border border-emerald-100 dark:border-emerald-800/20 mb-6 flex flex-col items-center">
          <div className="w-12 h-12 bg-white dark:bg-white/5 rounded-full flex items-center justify-center mb-3 shadow-sm">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Need a quick start?</h4>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4 text-sm leading-relaxed">
            If you don't know your exact spending yet, we can automatically fill in estimated averages for the essential categories. You can always edit them later!
          </p>
          <button 
            onClick={() => quickFillMutation.mutate()} 
            disabled={quickFillMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {quickFillMutation.isPending ? 'Filling...' : 'Quick Fill with Averages'}
          </button>
        </div>
      )}
      
      {sortedCategories.map(category => {
        const categoryCosts = costsByCategory[category];
        const isExpectedButEmpty = expectedCategories.includes(category as CostCategory) && categoryCosts.length === 0;
        const subtotalPesewas = categoryCosts.reduce((sum, c) => sum + c.amount_pesewas, 0);
        const categoryLabel = CATEGORIES[category as keyof typeof CATEGORIES]?.label || category;
        
        return (
          <button
            key={category}
            type="button"
            onClick={() => isExpectedButEmpty ? setQuickAddCategory(category as CostCategory) : navigate(`/season/${seasonId}/category/${category}`)}
            className={`w-full bg-white rounded-[32px] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] border text-left hover:shadow-[0_4px_20px_rgb(0,0,0,0.06)] transition-shadow ${isExpectedButEmpty ? 'border-amber-200 bg-amber-50/20' : 'border-gray-100 hover:border-emerald-200'}`}
          >
            <div className="w-full flex justify-between items-center px-2">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  {categoryLabel}
                  {isExpectedButEmpty ? (
                    <span className="inline-flex items-center text-xs font-bold text-amber-700 bg-amber-100/50 px-2.5 py-1 rounded-md border border-amber-200" title="This is a required cost for a complete estimate — tap to set it up">
                      <svg className="w-4 h-4 mr-1.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      Needs to be setup
                    </span>
                  ) : (
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  )}
                </h3>
                {isExpectedButEmpty ? (
                  <p className="text-xs text-amber-700 font-medium mt-1">
                    Every estimate needs this category filled in — tap to enter what you've spent, or a standard rate if you don't know it yet.
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 font-medium mt-1">
                    {categoryCosts.length} {categoryCosts.length === 1 ? 'entry' : 'entries'} — tap to view or edit
                  </p>
                )}
              </div>
              {!isExpectedButEmpty && (
                <span className="text-lg font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg shrink-0">
                  <Money pesewas={subtotalPesewas} />
                </span>
              )}
            </div>
          </button>
        );
      })}

      {quickAddCategory && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setQuickAddCategory(null)}></div>
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in-up">
            <AddCostForm
              seasonId={seasonId}
              initialCategory={quickAddCategory}
              onSuccess={() => setQuickAddCategory(null)}
              onCancel={() => setQuickAddCategory(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
