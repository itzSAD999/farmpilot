import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listCosts, deleteCost } from '../../api/costs';
import type { CostItem } from '../../api/costs';
import { CATEGORIES } from '../../lib/categories';

interface CostListProps {
  seasonId: number;
}

export function CostList({ seasonId }: CostListProps) {
  const queryClient = useQueryClient();

  const { data: costs, isLoading } = useQuery<CostItem[]>({
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-[32px] p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-gray-100 min-h-[400px] flex flex-col justify-center animate-pulse space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-2xl w-full"></div>
        ))}
      </div>
    );
  }

  if (!costs || costs.length === 0) {
    return (
      <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-[0_8px_40px_rgb(0,0,0,0.03)] border border-gray-100 min-h-[300px] flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-300">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Costs Recorded</h2>
        <p className="text-gray-500 max-w-sm">Add what you have spent so far. You need at least one item before we can estimate.</p>
      </div>
    );
  }

  // Group costs by category
  const costsByCategory = costs.reduce((acc, cost) => {
    if (!acc[cost.category]) {
      acc[cost.category] = [];
    }
    acc[cost.category].push(cost);
    return acc;
  }, {} as Record<string, CostItem[]>);

  // Define category order (matches CATEGORIES order roughly)
  const categoryOrder = ['seeds', 'fertiliser', 'agrochem', 'land_prep', 'labour', 'transport', 'storage', 'other'];
  const sortedCategories = Object.keys(costsByCategory).sort((a, b) => {
    return categoryOrder.indexOf(a) - categoryOrder.indexOf(b);
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {sortedCategories.map(category => {
        const categoryCosts = costsByCategory[category];
        const subtotalPesewas = categoryCosts.reduce((sum, c) => sum + c.amount_pesewas, 0);
        const categoryLabel = CATEGORIES[category as keyof typeof CATEGORIES]?.label || category;
        
        return (
          <div key={category} className="bg-white rounded-[32px] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-gray-100">
            <div className="flex justify-between items-center mb-4 px-2 border-b border-gray-100 pb-4">
              <h3 className="text-lg font-bold text-gray-900">{categoryLabel}</h3>
              <span className="text-lg font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg">
                ₵{(subtotalPesewas / 100).toFixed(2)}
              </span>
            </div>

            <div className="space-y-3">
              {categoryCosts.map((cost) => (
                <div key={cost.id} className="p-4 rounded-2xl border border-gray-100 hover:border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors group flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-bold text-gray-900">
                        {cost.description || categoryLabel}
                      </span>
                      {cost.date_incurred && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs font-medium text-gray-500">{new Date(cost.date_incurred).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                    
                    {(cost.quantity || cost.unit_cost_pesewas) ? (
                      <div className="inline-flex items-center text-xs font-bold text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded-md mt-1">
                        {cost.quantity || '?'} {cost.unit || 'units'} × ₵{((cost.unit_cost_pesewas || 0) / 100).toFixed(2)}
                      </div>
                    ) : (
                      <div className="inline-flex items-center text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">
                        Total-only entry
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end pl-4">
                    <span className="text-lg font-bold text-gray-900 mb-2">₵{(cost.amount_pesewas / 100).toFixed(2)}</span>
                    <button 
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this cost?')) {
                          deleteMutation.mutate(cost.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      title="Delete item"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
