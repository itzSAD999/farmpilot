import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { listCosts, deleteCost, quickFillCosts } from '../../api/costs';
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
  const [editingCost, setEditingCost] = useState<CostItem | null>(null);
  const [quickAddCategory, setQuickAddCategory] = useState<CostCategory | null>(null);

  const { data: costs, isLoading, isError } = useQuery<CostItem[]>({
    queryKey: ['seasonCosts', seasonId],
    queryFn: () => listCosts(seasonId),
  });

  const deleteMutation = useMutation({
    mutationFn: (costId: number) => deleteCost(costId),
    onMutate: async (costId) => {
      await queryClient.cancelQueries({ queryKey: ['seasonCosts', seasonId] });
      const previousCosts = queryClient.getQueryData<CostItem[]>(['seasonCosts', seasonId]);
      if (previousCosts) {
        queryClient.setQueryData<CostItem[]>(['seasonCosts', seasonId], previousCosts.filter(c => c.id !== costId));
      }
      return { previousCosts };
    },
    onError: (_err, _costId, context) => {
      if (context?.previousCosts) {
        queryClient.setQueryData(['seasonCosts', seasonId], context.previousCosts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonCosts', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] });
    },
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
          <div key={category} className={`bg-white rounded-[32px] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] border ${isExpectedButEmpty ? 'border-amber-200 bg-amber-50/20' : 'border-gray-100'}`}>
            <button
              type="button"
              onClick={() => isExpectedButEmpty ? setQuickAddCategory(category as CostCategory) : navigate(`/season/${seasonId}/category/${category}`)}
              className={`w-full flex justify-between items-center px-2 text-left hover:opacity-80 transition-opacity ${isExpectedButEmpty ? '' : 'mb-4 border-b border-gray-100 pb-4'}`}
            >
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
              {!isExpectedButEmpty && (
                <span className="text-lg font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg">
                  <Money pesewas={subtotalPesewas} />
                </span>
              )}
            </button>

            {!isExpectedButEmpty && (
              <div className="space-y-3">
                {categoryCosts.map((cost) => (
                  <div key={cost.id} className="p-4 rounded-2xl border border-gray-100 hover:border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors group flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
                        <span className="text-sm font-bold text-gray-900">
                          {cost.description || categoryLabel}
                        </span>
                        {cost.date_incurred && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-xs font-medium text-gray-500">{new Date(cost.date_incurred).toLocaleDateString()}</span>
                          </>
                        )}
                        {cost.id < 0 && (
                          <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01" /></svg>
                            Not yet synced
                          </span>
                        )}
                      </div>
                      
                      {(cost.quantity || cost.unit_cost_pesewas) ? (
                        <div className="inline-flex items-center text-xs font-bold text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded-md mt-1">
                          {cost.quantity || '?'} {cost.unit || 'units'} × <Money pesewas={cost.unit_cost_pesewas || 0} />
                        </div>
                      ) : (
                        <div className="inline-flex items-center text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-1">
                          Total-only entry
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end pl-4">
                      <span className="text-lg font-bold text-gray-900 mb-2"><Money pesewas={cost.amount_pesewas} /></span>
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingCost(cost)}
                          className="text-gray-500 hover:text-emerald-500 transition-colors w-[44px] h-[44px] flex items-center justify-center"
                          title="Edit item"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this cost?')) {
                              deleteMutation.mutate(cost.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="text-gray-500 hover:text-red-500 transition-colors w-[44px] h-[44px] flex items-center justify-center disabled:opacity-50"
                          title="Delete item"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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

      {editingCost && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingCost(null)}></div>
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in-up">
            <AddCostForm
              seasonId={seasonId}
              initialData={editingCost}
              onSuccess={() => setEditingCost(null)}
              onCancel={() => setEditingCost(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
