import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { createFarm } from '../api/farms';
import { useAuth } from '../hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { GhanaMap } from '../components/domain/GhanaMap';

const farmSetupSchema = z.object({
  name: z.string().min(2, 'Please enter a name for your farm.'),
  region: z.string().min(2, 'Please select a region.'),
  district: z.string().min(2, 'Please enter your district.'),
  total_area_acres: z.number({
    message: 'Please enter a valid number greater than zero.'
  }).positive('Farm area must be greater than zero acres.'),
});

type FarmSetupFormData = z.infer<typeof farmSetupSchema>;

const GHANA_DISTRICTS: Record<string, string[]> = {
  'Ashanti': ['Adansi South', 'Adansi North', 'Ahafo Ano North', 'Amansie Central', 'Asante Akim North', 'Ejisu-Juaben', 'Kumasi Metropolitan', 'Offinso North', 'Sekyere East'],
  'Bono': ['Sunyani', 'Berekum', 'Dormaa', 'Jaman North', 'Jaman South', 'Tain', 'Wenchi'],
  'Bono East': ['Techiman', 'Atebubu-Amantin', 'Kintampo North', 'Kintampo South', 'Nkoranza', 'Pru', 'Sene'],
  'Ahafo': ['Asunafo North', 'Asunafo South', 'Asutifi North', 'Asutifi South', 'Tano North', 'Tano South'],
  'Northern': ['Tamale', 'Yendi', 'Savelugu', 'Tolon', 'Kumbungu', 'Sagnarigu', 'Karaga'],
  'Savannah': ['Bole', 'Central Gonja', 'East Gonja', 'North Gonja', 'Sawla-Tuna-Kalba', 'West Gonja'],
  'North East': ['East Mamprusi', 'West Mamprusi', 'Bunkpurugu-Nyankpanduri', 'Chereponi', 'Mamprugu Moagduri', 'Yunyoo-Nasuan'],
  'Upper East': ['Bolgatanga', 'Bawku', 'Navrongo', 'Bongo', 'Kassena Nankana', 'Pusiga', 'Talensi'],
  'Upper West': ['Wa', 'Jirapa', 'Lawra', 'Nadowli', 'Nandom', 'Sissala East', 'Sissala West'],
  'Volta': ['Ho', 'Ketu South', 'Keta', 'Hohoe', 'Akatsi', 'South Tongu', 'North Tongu', 'Adaklu'],
  'Oti': ['Dambai', 'Biakoye', 'Jasikan', 'Kadjebi', 'Krachi East', 'Krachi West', 'Nkwanta North', 'Nkwanta South'],
  'Eastern': ['Koforidua', 'Nsawam', 'Nkawkaw', 'Suhum', 'Aburi', 'Akropong', 'Kibi', 'Mpraeso'],
  'Central': ['Cape Coast', 'Winneba', 'Kasoa', 'Elmina', 'Saltpond', 'Mankessim', 'Assin Fosu'],
  'Western': ['Sekondi-Takoradi', 'Tarkwa', 'Axim', 'Tarkwa-Nsuaem', 'Prestea', 'Ellembelle', 'Jomoro'],
  'Western North': ['Sefwi Wiawso', 'Bibiani', 'Enchi', 'Aowin', 'Bia East', 'Bia West', 'Juabeso'],
  'Greater Accra': ['Accra', 'Tema', 'Madina', 'Adenta', 'Ga East', 'Ga West', 'Ga South']
};

export function FarmSetup() {
  const [step, setStep] = useState(1);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors, isValid }, trigger, watch, setValue } = useForm<FarmSetupFormData>({
    resolver: zodResolver(farmSetupSchema),
    mode: 'onChange',
  });

  const watchRegion = watch('region');
  const watchDistrict = watch('district');

  const handleNext = async () => {
    let fieldsToValidate: (keyof FarmSetupFormData)[] = [];
    if (step === 1) fieldsToValidate = ['name'];
    if (step === 2) fieldsToValidate = ['region', 'district'];
    
    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    setStep(s => Math.max(1, s - 1));
  };

  const onSubmit = async (data: FarmSetupFormData) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      await createFarm(data);
      await queryClient.invalidateQueries({ queryKey: ['farm', user?.id] });
      setStep(4); // Success step
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
    } catch (err: any) {
      if (err.message?.includes('session has expired')) {
        navigate('/signin', { state: { message: err.message, from: location } });
      } else {
        setServerError(err.message);
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white/50 rounded-3xl relative overflow-hidden">
      
      {/* Progress Indicator */}
      {step < 4 && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex space-x-3">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-all duration-500 ${
                i === step ? 'w-12 bg-emerald-600' : i < step ? 'w-4 bg-emerald-200' : 'w-4 bg-gray-200'
              }`}
            />
          ))}
        </div>
      )}

      <div className="max-w-xl w-full">
        {serverError && (
          <div className="mb-8 p-4 rounded-2xl bg-red-50 text-red-700 text-sm font-medium border border-red-100 animate-fade-in">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          {/* STEP 1: WELCOME & NAME */}
          {step === 1 && (
            <div className="animate-fade-in-up space-y-10">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center p-4 bg-emerald-50 rounded-full mb-4">
                  <span className="text-4xl">👋</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">Let's set up your farm</h1>
                <p className="text-xl text-gray-500 font-medium">What do you call your land?</p>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="e.g. Mensah Family Farm"
                  className="w-full text-center text-4xl md:text-5xl font-light text-gray-900 bg-transparent border-b-2 border-gray-200 pb-4 focus:outline-none focus:border-[#1B5E20] transition-colors placeholder:text-gray-300"
                  {...register('name')}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleNext();
                    }
                  }}
                />
                {errors.name && (
                  <p className="mt-4 text-center text-base text-red-500 font-medium">{errors.name.message}</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: LOCATION */}
          {step === 2 && (
            <div className="animate-fade-in-up space-y-10">
              <div className="text-center space-y-2">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Where is it located?</h2>
                <p className="text-lg text-gray-500 font-medium">Select your region and enter your district.</p>
              </div>

              <GhanaMap 
                selectedRegion={watchRegion} 
                onSelect={(r) => setValue('region', r, { shouldValidate: true })} 
              />
              {errors.region && (
                <p className="text-center text-base text-red-500 font-medium">{errors.region.message}</p>
              )}

              <div className="pt-6 relative max-w-sm mx-auto z-50">
                <input
                  type="text"
                  placeholder="District (e.g. Ejisu-Juaben)"
                  className="w-full text-center text-3xl font-light text-gray-900 bg-transparent border-b-2 border-gray-200 pb-4 focus:outline-none focus:border-[#1B5E20] transition-colors placeholder:text-gray-300"
                  {...register('district')}
                  onChange={(e) => {
                    register('district').onChange(e);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setShowSuggestions(false);
                      handleNext();
                    }
                  }}
                />
                
                {/* Suggestions Dropdown */}
                {showSuggestions && watchRegion && GHANA_DISTRICTS[watchRegion] && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto z-50 animate-fade-in-up py-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 py-2 border-b border-gray-50 mb-2">Districts in {watchRegion}</p>
                    {GHANA_DISTRICTS[watchRegion]
                      .filter(d => !watchDistrict || d.toLowerCase().includes(watchDistrict.toLowerCase()))
                      .map((district) => (
                        <button
                          key={district}
                          type="button"
                          className="w-full text-left px-5 py-3 hover:bg-emerald-50 text-gray-700 font-medium transition-colors focus:bg-emerald-50 focus:outline-none"
                          onClick={() => {
                            setValue('district', district, { shouldValidate: true });
                            setShowSuggestions(false);
                          }}
                        >
                          {district}
                        </button>
                      ))}
                    {GHANA_DISTRICTS[watchRegion].filter(d => !watchDistrict || d.toLowerCase().includes(watchDistrict.toLowerCase())).length === 0 && (
                      <div className="px-5 py-3 text-sm text-gray-500 italic">No exact matches, but you can press Enter to use your typed district.</div>
                    )}
                  </div>
                )}

                {errors.district && (
                  <p className="mt-4 text-center text-base text-red-500 font-medium">{errors.district.message}</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: SIZE */}
          {step === 3 && (
            <div className="animate-fade-in-up space-y-10">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center p-4 bg-emerald-50 rounded-full mb-4">
                  <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">How large is your farm?</h2>
                <p className="text-lg text-gray-500 font-medium">Enter the total land area in acres.</p>
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="relative flex items-baseline justify-center">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="0.0"
                    className="w-40 text-center text-6xl font-light text-gray-900 bg-transparent border-b-2 border-gray-200 pb-4 focus:outline-none focus:border-[#1B5E20] transition-colors placeholder:text-gray-300"
                    {...register('total_area_acres', { valueAsNumber: true })}
                    autoFocus
                  />
                  <span className="ml-4 text-3xl font-light text-gray-400">acres</span>
                </div>
                {errors.total_area_acres && (
                  <p className="mt-4 text-base text-red-500 font-medium">{errors.total_area_acres.message}</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 4 && (
            <div className="animate-fade-in-up flex flex-col items-center justify-center space-y-6 py-12">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center animate-bounce">
                <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Farm Created!</h2>
              <p className="text-emerald-600 font-medium">Preparing your dashboard...</p>
            </div>
          )}

          {/* Navigation Buttons */}
          {step < 4 && (
            <div className="pt-12 flex items-center justify-between animate-fade-in">
              <button
                type="button"
                onClick={handleBack}
                className={`px-8 py-4 text-gray-500 font-bold hover:text-gray-900 transition-colors ${step === 1 ? 'invisible' : ''}`}
              >
                Back
              </button>
              
              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-12 py-4 bg-[#1B5E20] text-white rounded-full font-bold text-lg hover:bg-[#144718] transition-all active:scale-[0.98] shadow-lg shadow-emerald-900/20"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || !isValid}
                  className="px-12 py-4 bg-[#1B5E20] text-white rounded-full font-bold text-lg hover:bg-[#144718] transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-emerald-900/20 flex items-center"
                >
                  {isSubmitting ? 'Saving...' : 'Finish Setup'}
                  {!isSubmitting && <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
