import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createSeason } from '../api/seasons';
import { getCrops } from '../api/crops';
import { useFarm } from '../hooks/useFarm';

const seasonWindows = [
  { value: 'major', label: 'Major season', desc: 'around March to July' },
  { value: 'minor', label: 'Minor season', desc: 'around September to November' },
  { value: 'dry', label: 'Dry season', desc: 'irrigated, off-season' },
] as const;

export function SeasonNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const { farm, isLoading: isFarmLoading } = useFarm();
  
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: crops, isLoading: isCropsLoading, isError: isCropsError } = useQuery({
    queryKey: ['crops'],
    queryFn: getCrops,
  });

  const maxAcres = (farm?.total_area_acres as number) || 0;

  const seasonSchema = z.object({
    crop_id: z.number({ message: 'Please select a crop.' }).min(1),
    year: z.number({ message: 'Please enter a valid year.' }).int().min(2000),
    season_window: z.string().min(2, 'Please select a season window.'),
    area_planted_acres: z.number({
      message: 'Please enter a valid number.'
    })
      .positive('Area planted must be greater than zero acres.')
      .max(maxAcres, `Area planted cannot exceed your farm's total area (${maxAcres} acres).`),
  });

  type SeasonFormData = z.infer<typeof seasonSchema>;

  const { register, handleSubmit, watch, resetField, formState: { errors } } = useForm<SeasonFormData>({
    resolver: zodResolver(seasonSchema),
    defaultValues: {
      year: new Date().getFullYear(),
    }
  });

  const onSubmit = async (data: SeasonFormData) => {
    if (!farm) return;
    
    setServerError(null);
    setIsSubmitting(true);

    try {
      await createSeason({
        farm_id: farm.id as number,
        crop_id: data.crop_id,
        year: data.year,
        season_window: data.season_window as any,
        area_planted_acres: data.area_planted_acres,
      });
      navigate('/');
    } catch (err: any) {
      if (err.message?.includes('session has expired')) {
        navigate('/signin', { state: { message: err.message, from: location } });
      } else {
        setServerError(err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFarmLoading || isCropsLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B5E20]"></div>
      </div>
    );
  }

  if (isCropsError) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-2xl font-bold text-red-900 mb-2">Unable to load crops</h2>
        <p className="text-red-700 mb-6">Please check your connection and try again.</p>
        <button onClick={() => window.location.reload()} className="text-emerald-600 font-bold hover:underline">Reload</button>
      </div>
    );
  }

  if (!farm) return null;

  return (
    <div className="max-w-3xl mx-auto py-12 px-6 lg:px-8 animate-fade-in">
      <div className="mb-10">
        <button onClick={() => navigate('/')} className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors flex items-center mb-8 group">
          <span className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center mr-3 group-hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </span>
          Back to Dashboard
        </button>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4">Start a new season</h1>
        <p className="text-lg text-gray-500 font-medium">Record what you're planting to forecast yields and track costs.</p>
      </div>

      {serverError && (
        <div className="mb-8 p-4 rounded-2xl bg-red-50 text-red-700 text-sm font-medium border border-red-100 animate-fade-in-up">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-[32px] p-8 md:p-12 shadow-[0_8px_40px_rgb(0,0,0,0.03)] border border-gray-100 space-y-10 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        
        {/* Crop Selection */}
        <div className="relative group">
          <label htmlFor="crop_id" className="block text-sm uppercase tracking-widest text-gray-400 font-bold mb-3">Crop</label>
          <div className="relative">
            <select
              id="crop_id"
              className={`w-full appearance-none text-2xl md:text-3xl font-bold text-gray-900 bg-transparent border-b-2 pb-4 focus:outline-none transition-colors cursor-pointer ${
                errors.crop_id ? 'border-red-500' : 'border-gray-100 focus:border-emerald-500 hover:border-gray-200'
              }`}
              {...register('crop_id', { valueAsNumber: true })}
              defaultValue=""
            >
              <option value="" disabled className="text-gray-300">Select a crop...</option>
              {crops?.map((c: any) => (
                <option key={c.id} value={c.id} className="text-lg">
                  {c.name} {c.local_name ? `(${c.local_name})` : ''}
                </option>
              ))}
            </select>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
          {errors.crop_id && <p className="mt-3 text-sm text-red-500 font-medium animate-fade-in">{errors.crop_id.message}</p>}
        </div>

        {/* Year & Season Window (Side by side on desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="relative group">
            <label htmlFor="year" className="block text-sm uppercase tracking-widest text-gray-400 font-bold mb-3">Year</label>
            <input
              id="year"
              type="number"
              className={`w-full text-2xl md:text-3xl font-bold text-gray-900 bg-transparent border-b-2 pb-4 focus:outline-none transition-colors ${
                errors.year ? 'border-red-500' : 'border-gray-100 focus:border-emerald-500 hover:border-gray-200'
              }`}
              {...register('year', { valueAsNumber: true })}
            />
            {errors.year && <p className="mt-3 text-sm text-red-500 font-medium animate-fade-in">{errors.year.message}</p>}
          </div>

          <div className="relative group">
            <label htmlFor="season_window" className="block text-sm uppercase tracking-widest text-gray-400 font-bold mb-3">Season Window</label>
            <div className="relative">
              <select
                id="season_window"
                className={`w-full appearance-none text-2xl md:text-3xl font-bold text-gray-900 bg-transparent border-b-2 pb-4 focus:outline-none transition-colors cursor-pointer ${
                  errors.season_window ? 'border-red-500' : 'border-gray-100 focus:border-emerald-500 hover:border-gray-200'
                }`}
                {...register('season_window')}
                defaultValue=""
              >
                <option value="" disabled className="text-gray-300">Select timing...</option>
                {seasonWindows.map((w) => (
                  <option key={w.value} value={w.value} className="text-lg">
                    {w.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            {errors.season_window && <p className="mt-3 text-sm text-red-500 font-medium animate-fade-in">{errors.season_window.message}</p>}
            
            {/* Show description of selected window */}
            {!errors.season_window && watch('season_window') && (
              <p className="mt-3 text-sm text-emerald-600 font-medium animate-fade-in flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {seasonWindows.find(w => w.value === watch('season_window'))?.desc}
              </p>
            )}
          </div>
        </div>

        {/* Area Planted */}
        <div className="relative group">
          <label htmlFor="area_planted_acres" className="block text-sm uppercase tracking-widest text-gray-400 font-bold mb-3">Area Planted</label>
          <div className="relative flex items-end">
            <input
              id="area_planted_acres"
              type="number"
              step="0.1"
              placeholder="0.0"
              className={`w-full text-4xl md:text-5xl font-light text-gray-900 bg-transparent border-b-2 pb-4 focus:outline-none transition-colors ${
                errors.area_planted_acres ? 'border-red-500' : 'border-gray-100 focus:border-emerald-500 hover:border-gray-200'
              }`}
              {...register('area_planted_acres', { valueAsNumber: true })}
            />
            <span className="absolute right-0 bottom-6 text-xl font-bold text-gray-300 pointer-events-none">Acres</span>
          </div>
          
          <div className="flex justify-between items-center mt-4">
            {errors.area_planted_acres ? (
              <p className="text-sm text-red-500 font-medium animate-fade-in">{errors.area_planted_acres.message}</p>
            ) : (
              <p className="text-sm text-gray-500 font-medium animate-fade-in flex items-center">
                <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                Total Farm Size: <strong className="ml-1 text-gray-900">{maxAcres} acres</strong>
              </p>
            )}
            
            {/* Quick max fill button */}
            {!errors.area_planted_acres && (
              <button 
                type="button"
                onClick={() => resetField('area_planted_acres', { defaultValue: maxAcres })}
                className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors"
              >
                Use Full Farm
              </button>
            )}
          </div>
        </div>

        {/* Action */}
        <div className="pt-8 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto px-10 py-5 bg-[#1B5E20] text-white rounded-full font-bold text-lg hover:bg-[#144718] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center shadow-lg shadow-emerald-900/20"
          >
            {isSubmitting ? 'Saving Season...' : 'Save Season'}
            {!isSubmitting && <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
          </button>
        </div>

      </form>
    </div>
  );
}
