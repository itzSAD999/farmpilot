import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { addCost } from '../../api/costs';
import { CATEGORIES, OTHER_CATEGORY_EXPLANATION } from '../../lib/categories';
import type { CostCategory, CostItem } from '../../api/costs';
import { cedisToPesewas } from '../../lib/money';

const baseSchema = z.object({
  category: z.enum(['seeds', 'fertiliser', 'agrochem', 'land_prep', 'labour', 'transport', 'storage', 'other']),
  description: z.string().optional(),
  date_incurred: z.string().optional(),
});

const detailedSchema = baseSchema.extend({
  entry_mode: z.literal('rate'),
  quantity: z.number().positive('Must be > 0'),
  unit: z.string().min(1, 'Required'),
  unit_cost: z.number().nonnegative('Must be >= 0'),
});

const totalOnlySchema = baseSchema.extend({
  entry_mode: z.literal('total'),
  total_amount: z.number().positive('Must be > 0'),
});

const costSchema = z.discriminatedUnion('entry_mode', [detailedSchema, totalOnlySchema]);
type CostFormData = z.infer<typeof costSchema>;

interface AddCostFormProps {
  seasonId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CategoryIcons: Record<string, React.ReactNode> = {
  seeds: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
  fertiliser: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
  agrochem: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11" /></svg>,
  land_prep: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  labour: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  transport: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
  storage: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  other: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
};

export function AddCostForm({ seasonId, onSuccess, onCancel }: AddCostFormProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [entryMode, setEntryMode] = useState<'total' | 'rate'>('total');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting }, getValues } = useForm<CostFormData>({
    resolver: zodResolver(costSchema),
    defaultValues: {
      entry_mode: 'total',
      date_incurred: new Date().toISOString().split('T')[0],
    }
  });

  const watchCategory = watch('category');
  const watchQty = watch('quantity');
  const watchUnitCost = watch('unit_cost');
  const watchUnit = watch('unit');

  const selectedCategoryConfig = watchCategory ? CATEGORIES[watchCategory as CostCategory] : null;

  const computedTotal = (entryMode === 'rate' && watchQty && watchUnitCost) 
    ? (watchQty * watchUnitCost) 
    : 0;

  const handleModeSwitch = (mode: 'total' | 'rate') => {
    setEntryMode(mode);
    setValue('entry_mode', mode);
  };

  const addMutation = useMutation({
    mutationFn: async (data: CostFormData) => {
      let amountPesewas = 0;
      let qty: number | undefined = undefined;
      let unit: string | undefined = undefined;
      let unitCostPesewas: number | undefined = undefined;

      if (data.entry_mode === 'rate') {
        amountPesewas = cedisToPesewas(data.quantity * data.unit_cost);
        qty = data.quantity;
        unit = data.unit;
        unitCostPesewas = cedisToPesewas(data.unit_cost);
      } else {
        amountPesewas = cedisToPesewas(data.total_amount);
      }

      return addCost({
        season_id: seasonId,
        category: data.category,
        description: data.description || undefined,
        date_incurred: data.date_incurred || undefined,
        quantity: qty,
        unit: unit,
        unit_cost_pesewas: unitCostPesewas,
        amount_pesewas: amountPesewas,
      });
    },
    onMutate: async (newCost) => {
      await queryClient.cancelQueries({ queryKey: ['seasonCosts', seasonId] });
      const previousCosts = queryClient.getQueryData<CostItem[]>(['seasonCosts', seasonId]);
      
      if (previousCosts) {
        let amountPesewas = 0;
        if (newCost.entry_mode === 'rate') {
          amountPesewas = cedisToPesewas(newCost.quantity * newCost.unit_cost);
        } else {
          amountPesewas = cedisToPesewas(newCost.total_amount);
        }
        
        const optimisticCost: CostItem = {
          id: Math.random(), // temp id
          season_id: seasonId,
          category: newCost.category,
          description: newCost.description || null,
          quantity: newCost.entry_mode === 'rate' ? newCost.quantity : null,
          unit: newCost.entry_mode === 'rate' ? newCost.unit : null,
          unit_cost_pesewas: newCost.entry_mode === 'rate' ? cedisToPesewas(newCost.unit_cost) : null,
          amount_pesewas: amountPesewas,
          date_incurred: newCost.date_incurred || null,
          created_at: new Date().toISOString(),
        };
        
        queryClient.setQueryData<CostItem[]>(['seasonCosts', seasonId], [...previousCosts, optimisticCost]);
      }
      
      return { previousCosts };
    },
    onError: (err: any, _newCost, context) => {
      if (context?.previousCosts) {
        queryClient.setQueryData(['seasonCosts', seasonId], context.previousCosts);
      }
      if (err.message?.includes('session has expired')) {
        navigate('/signin', { state: { message: err.message, from: location } });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonCosts', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] });
    },
    onSuccess: () => {
      // Preserve category after save
      const currentCategory = getValues('category');
      setValue('category', currentCategory);
      setStep(1); // Return to step 1 for the next item
      setValue('entry_mode', entryMode);
      setValue('date_incurred', new Date().toISOString().split('T')[0]);
      onSuccess?.();
    },
  });

  const onSubmit = (data: CostFormData) => {
    addMutation.mutate(data);
  };

  const handleNextStep = (catId: CostCategory) => {
    setValue('category', catId, { shouldValidate: true });
    setStep(2);
    // Scroll to top of the modal content
    const modalContent = document.getElementById('cost-modal-content');
    if (modalContent) modalContent.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div id="cost-modal-content" className="bg-white dark:bg-[#121212] rounded-[32px] p-6 sm:p-8 shadow-[0_8px_40px_rgb(0,0,0,0.03)] border border-gray-100 dark:border-white/5 animate-fade-in relative max-h-[90vh] overflow-y-auto">
      {onCancel && (
        <button 
          onClick={onCancel}
          className="absolute top-6 right-6 w-10 h-10 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors z-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      )}
      
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="pr-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Record Cost</h2>
          <p className="text-gray-500 font-medium text-sm mt-1">
            {step === 1 ? 'Select what type of cost you incurred.' : 'Enter the details for this cost.'}
          </p>
        </div>
        {step === 2 && (
          <button 
            type="button" 
            onClick={() => setStep(1)} 
            className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            Change Category
          </button>
        )}
      </div>

      {addMutation.isError && !addMutation.error?.message?.includes('session has expired') && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm font-medium border border-red-100 animate-fade-in flex items-center justify-between">
          <span>{addMutation.error.message}</span>
          <button onClick={() => addMutation.reset()} className="text-red-700 hover:text-red-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {step === 1 && (
          <div className="animate-fade-in-up">
            <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-4">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.values(CATEGORIES).map((cat) => {
                const isSelected = watchCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleNextStep(cat.id as CostCategory)}
                    className={`relative p-4 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                      isSelected 
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500' 
                        : 'border-gray-100 dark:border-white/5 bg-white dark:bg-white/5 hover:border-emerald-200 dark:hover:border-emerald-500/30 hover:bg-emerald-50/30 dark:hover:bg-emerald-500/10'
                    }`}
                  >
                    <div className={`mb-3 flex items-center justify-center w-10 h-10 rounded-full ${isSelected ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {CategoryIcons[cat.id]}
                    </div>
                    <h4 className={`text-sm font-bold ${isSelected ? 'text-emerald-900' : 'text-gray-900'}`}>{cat.label}</h4>
                    <p className={`text-xs mt-1 leading-tight ${isSelected ? 'text-emerald-700/80' : 'text-gray-500'}`}>{cat.description}</p>
                  </button>
                );
              })}
            </div>
            {errors.category && <p className="text-sm text-red-500 font-bold mt-2">{errors.category.message}</p>}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-fade-in-up">
            {watchCategory === 'other' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 animate-fade-in-up">
            <p className="text-yellow-800 text-sm font-medium leading-relaxed">
              {OTHER_CATEGORY_EXPLANATION}
            </p>
          </div>
        )}

        {/* DESCRIPTION & DATE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative group md:col-span-2">
            <label htmlFor="description" className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Description (Optional)</label>
            <input
              id="description"
              type="text"
              placeholder="e.g. NPK for the second application"
              aria-invalid={errors.description ? 'true' : 'false'}
              aria-describedby={errors.description ? 'description-error' : undefined}
              className="w-full text-base font-medium text-gray-900 bg-gray-50 rounded-xl px-4 py-4 h-[58px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all border border-transparent placeholder:text-gray-500"
              {...register('description')}
            />
            {errors.description && <p id="description-error" className="text-sm text-red-500 font-bold mt-1">{errors.description.message}</p>}
          </div>
          
          <div className="relative group">
            <label htmlFor="date_incurred" className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Date (Optional)</label>
            <input
              id="date_incurred"
              type="date"
              aria-invalid={errors.date_incurred ? 'true' : 'false'}
              aria-describedby={errors.date_incurred ? 'date_incurred-error' : undefined}
              className="w-full text-base font-bold text-gray-900 bg-gray-50 rounded-xl px-4 py-4 h-[58px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all border border-transparent"
              {...register('date_incurred')}
            />
            {errors.date_incurred && <p id="date_incurred-error" className="text-sm text-red-500 font-bold mt-1">{errors.date_incurred.message}</p>}
          </div>
        </div>

        {/* ENTRY MODE & AMOUNT */}
        <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold">Amount Entry</label>
            <div className="flex bg-gray-200/60 p-1 rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleModeSwitch('total')}
                className={`flex-1 sm:flex-none px-4 py-2.5 text-sm font-bold rounded-lg transition-all ${entryMode === 'total' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                I know the total
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('rate')}
                className={`flex-1 sm:flex-none px-4 py-2.5 text-sm font-bold rounded-lg transition-all ${entryMode === 'rate' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                I know the rate
              </button>
            </div>
          </div>

          {entryMode === 'rate' ? (
            <div className="space-y-6 animate-fade-in-up">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative group">
                  <label htmlFor="quantity" className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Quantity</label>
                  <input
                    id="quantity"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0"
                    aria-invalid={'quantity' in errors ? 'true' : 'false'}
                    aria-describedby={'quantity' in errors ? 'quantity-error' : undefined}
                    className={`w-full text-lg font-bold text-gray-900 bg-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all border ${'quantity' in errors ? 'border-red-300' : 'border-gray-200 shadow-sm'}`}
                    {...register('quantity', { valueAsNumber: true })}
                  />
                  {'quantity' in errors && <p id="quantity-error" className="text-sm text-red-500 font-bold mt-1">{errors.quantity?.message}</p>}
                </div>
                
                <div className="relative group">
                  <label htmlFor="unit" className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Unit</label>
                  <input
                    id="unit"
                    type="text"
                    list="unit-suggestions"
                    placeholder="e.g. bags, trips"
                    aria-invalid={'unit' in errors ? 'true' : 'false'}
                    aria-describedby={'unit' in errors ? 'unit-error' : undefined}
                    className={`w-full text-lg font-bold text-gray-900 bg-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all border ${'unit' in errors ? 'border-red-300' : 'border-gray-200 shadow-sm'}`}
                    {...register('unit')}
                  />
                  <datalist id="unit-suggestions">
                    {selectedCategoryConfig?.units.map(u => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                  {'unit' in errors && <p id="unit-error" className="text-sm text-red-500 font-bold mt-1">{errors.unit?.message}</p>}
                </div>
                
                <div className="relative group">
                  <label htmlFor="unit_cost" className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Price per unit</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₵</span>
                    <input
                      id="unit_cost"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0.00"
                      aria-invalid={'unit_cost' in errors ? 'true' : 'false'}
                      aria-describedby={'unit_cost' in errors ? 'unit_cost-error' : undefined}
                      className={`w-full text-lg font-bold text-gray-900 bg-white rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all border ${'unit_cost' in errors ? 'border-red-300' : 'border-gray-200 shadow-sm'}`}
                      {...register('unit_cost', { valueAsNumber: true })}
                    />
                  </div>
                  {'unit_cost' in errors && <p id="unit_cost-error" className="text-sm text-red-500 font-bold mt-1">{errors.unit_cost?.message}</p>}
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-5 border-t border-gray-200/60">
                {watchQty && watchUnitCost ? (
                  <span className="text-sm font-bold text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                    {watchQty} {watchUnit || 'units'} × GHS {watchUnitCost.toFixed(2)} = GHS {computedTotal.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-sm font-bold text-gray-500">Total amount will appear here</span>
                )}
                <span className="text-2xl font-extrabold text-[#1B5E20]">₵{computedTotal.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="relative group animate-fade-in-up">
              <label htmlFor="total_amount" className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Total Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xl">₵</span>
                <input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-invalid={'total_amount' in errors ? 'true' : 'false'}
                  aria-describedby={'total_amount' in errors ? 'total_amount-error' : undefined}
                  className={`w-full text-3xl font-extrabold text-gray-900 bg-white rounded-xl pl-10 pr-4 py-4 h-[72px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all border ${'total_amount' in errors ? 'border-red-300' : 'border-gray-200 shadow-sm'}`}
                  {...register('total_amount', { valueAsNumber: true })}
                />
              </div>
              {'total_amount' in errors && <p id="total_amount-error" className="text-sm text-red-500 font-bold mt-2">{errors.total_amount?.message}</p>}
            </div>
          )}
        </div>

        {addMutation.isError && (
          <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm font-bold border border-red-200">
            {addMutation.error.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || addMutation.isPending}
          className="w-full py-4 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-emerald-900/20"
        >
          {isSubmitting || addMutation.isPending ? 'Saving...' : 'Save Cost Item'}
        </button>
      </div>
    )}
  </form>
    </div>
  );
}
