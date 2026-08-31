import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { normalisePhone, formatPhoneDisplay, isValidGhanaPhone } from '../lib/phone';

const signUpSchema = z.object({
  mode: z.enum(['phone', 'email']),
  phone: z.string().optional(),
  email: z.string().email('Please enter a valid email address.').optional().or(z.literal('')),
  fullName: z.string().min(2, 'Please enter your full name.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  confirmPassword: z.string(),
}).superRefine((data, ctx) => {
  if (data.mode === 'phone') {
    if (!data.phone || !isValidGhanaPhone(data.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter a valid 10-digit Ghanaian mobile number.',
        path: ['phone'],
      });
    }
  } else {
    if (!data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter a valid email address.',
        path: ['email'],
      });
    }
  }

  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Passwords do not match.',
      path: ['confirmPassword'],
    });
  }
});

type SignUpFormData = z.infer<typeof signUpSchema>;

export function SignUp() {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<'phone' | 'email'>('phone');
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { signUpWithPhone, signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const { register, handleSubmit, watch, trigger, formState: { errors }, resetField, setFocus, setError, setValue } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    mode: 'onChange',
    defaultValues: {
      mode: 'phone',
      phone: '',
      email: '',
      fullName: '',
      password: '',
      confirmPassword: '',
    },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const phoneValue = watch('phone');
  const normalisedPhone = phoneValue ? normalisePhone(phoneValue) : '';
  const displayPhone = normalisedPhone ? formatPhoneDisplay(normalisedPhone) : '';
  const fullNameValue = watch('fullName');

  const pwdValue = watch('password') || '';
  const pwdChecks = {
    length: pwdValue.length >= 8,
    capital: /[A-Z]/.test(pwdValue),
    number: /[0-9]/.test(pwdValue),
    special: /[^A-Za-z0-9]/.test(pwdValue),
  };
  const pwdStrength = Object.values(pwdChecks).filter(Boolean).length;
  
  const strengthColor = (strength: number) => {
    if (strength === 0) return 'bg-gray-200';
    if (strength === 1) return 'bg-red-500';
    if (strength === 2) return 'bg-orange-500';
    if (strength === 3) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const toggleMode = (newMode: 'phone' | 'email') => {
    setMode(newMode);
    setValue('mode', newMode); // Sync React Hook Form state
    setServerError(null);
    if (newMode === 'phone') resetField('email');
    if (newMode === 'email') resetField('phone');
  };

  const handleNext = async () => {
    let fieldsToValidate: any = [];
    if (step === 1) fieldsToValidate = ['fullName'];
    if (step === 2) fieldsToValidate = mode === 'phone' ? ['phone'] : ['email'];
    if (step === 3) fieldsToValidate = ['password'];
    if (step === 4) fieldsToValidate = ['confirmPassword'];

    let isValid = await trigger(fieldsToValidate);
    
    // Explicitly check for password match on Step 4 since trigger() for just the field won't fire superRefine
    if (step === 4 && isValid) {
      const confirmPwd = watch('confirmPassword');
      if (pwdValue !== confirmPwd) {
        setError('confirmPassword', { type: 'custom', message: 'Passwords do not match.' });
        isValid = false;
      }
    }

    if (isValid) {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((prev) => prev - 1);
  };

  const onSubmit = async (data: SignUpFormData) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'phone' && data.phone) {
        await signUpWithPhone(normalisePhone(data.phone), data.password, data.fullName);
      } else if (mode === 'email' && data.email) {
        await signUpWithEmail(data.email, data.password, data.fullName);
      }
      setStep(6); // Success step
      
      // If phone mode, they are logged in and can be redirected immediately
      if (mode === 'phone') {
        setTimeout(() => {
          navigate(from, { replace: true });
        }, 3000);
      }
      // If email mode, we leave them on the success step to check their email!
    } catch (err: any) {
      setServerError(err.message);
      setIsSubmitting(false);
    }
  };

  // Focus management when steps change
  useEffect(() => {
    if (step === 1) setTimeout(() => setFocus('fullName'), 100);
    if (step === 2) setTimeout(() => setFocus(mode === 'phone' ? 'phone' : 'email'), 100);
    if (step === 3) setTimeout(() => setFocus('password'), 100);
    if (step === 4) setTimeout(() => setFocus('confirmPassword'), 100);
  }, [step, mode, setFocus]);

  // Dynamic content for the left panel based on step
  const getSideContent = () => {
    switch(step) {
      case 1:
        return {
          title: "Let's build your farm's future.",
          subtitle: "FarmPilot 2.0 brings precision agriculture to your fingertips.",
          icon: "🌱"
        };
      case 2:
        return {
          title: "Stay connected.",
          subtitle: "We'll use this to keep your data synced across devices.",
          icon: "📡"
        };
      case 3:
        return {
          title: "Lock it down.",
          subtitle: "Your farm's financial and historical data is strictly confidential.",
          icon: "🛡️"
        };
      case 4:
        return {
          title: "Verify it's you.",
          subtitle: "Please confirm your password to ensure no typos.",
          icon: "🔑"
        };
      case 5:
        return {
          title: "Almost there.",
          subtitle: "Just verify your details to launch your dashboard.",
          icon: "🚀"
        };
      default:
        return {
          title: "Welcome aboard.",
          subtitle: "Preparing your workspace...",
          icon: "✨"
        };
    }
  };

  const sideContent = getSideContent();

  return (
    <div className="flex h-[100dvh] w-full bg-white overflow-hidden font-sans animate-fade-in">
      
      {/* Left Panel - Hidden on mobile, takes 40% width on desktop */}
      <div className="hidden lg:flex flex-col w-[40%] bg-[#0a0a0a] relative overflow-hidden p-12 text-white justify-between transition-colors duration-1000">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1B5E20]/20 to-black pointer-events-none" />
        
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
          </div>
          <span className="text-xl font-bold tracking-wide">FarmPilot</span>
        </div>

        <div className="relative z-10 my-auto pr-8 animate-fade-in" key={step}>
          <div className="text-6xl mb-8 animate-bounce" style={{ animationDuration: '3s' }}>{sideContent.icon}</div>
          <h2 className="text-5xl md:text-6xl font-light tracking-tighter leading-[1.1] mb-6">
            {sideContent.title}
          </h2>
          <p className="text-xl text-white/60 font-light leading-relaxed max-w-md">
            {sideContent.subtitle}
          </p>
        </div>

        <div className="absolute bottom-12 right-12 z-10 flex items-center space-x-4 text-sm animate-fade-in-up">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500 text-black font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            <div key={step} className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-30" style={{ animationDuration: '1.5s' }}></div>
            <span key={`text-${step}`} className="animate-fade-in">{step}</span>
          </div>
          <div className="w-10 h-[2px] bg-white/20"></div>
          <span className="text-white/40 font-bold text-lg">6</span>
        </div>
      </div>

      {/* Right Panel - Form Area (Takes full width on mobile, 60% on desktop) */}
      <div className="flex-1 flex flex-col relative w-full bg-white overflow-y-auto">
        
        {/* Top Navigation */}
        <div className="relative w-full p-6 md:p-12 flex justify-between items-center z-50 shrink-0">
          {step > 1 && step < 6 ? (
            <button onClick={handleBack} className="flex items-center text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors group">
              <span className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center sm:mr-3 group-hover:bg-gray-100 transition-colors shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </span>
              <span className="hidden sm:inline">Back</span>
            </button>
          ) : step === 1 ? (
            <Link to="/welcome" className="flex items-center text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors group">
              <span className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center sm:mr-3 group-hover:bg-gray-100 transition-colors shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </span>
              <span className="hidden sm:inline">Home</span>
            </Link>
          ) : <div />}

          {step < 6 && (
            <Link to="/signin" className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
              Log in instead
            </Link>
          )}
        </div>

        {/* Progress Bar (Mobile only) */}
        <div className="lg:hidden absolute top-0 left-0 w-full h-1 bg-gray-100 z-30">
          <div className="h-full bg-[#1B5E20] transition-all duration-500 ease-out" style={{ width: `${(step / 6) * 100}%` }} />
        </div>

        {/* Form Container */}
        <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full px-6 py-12 md:px-12">
          
          {serverError && (
            <div className="mb-8 p-4 rounded-2xl bg-red-50 text-red-700 text-sm font-medium border border-red-100 animate-fade-in">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="w-full">
            <input type="hidden" value={mode} {...register('mode')} />
            
            <div className="relative min-h-[300px]">
              
              {/* Step 1: Name */}
              {step === 1 && (
                <div className="absolute inset-0 flex flex-col justify-center">
                  <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4 animate-fade-in-up" style={{ animationDelay: '0ms' }}>What should we call you?</h1>
                  <p className="text-lg text-gray-500 font-medium mb-12 animate-fade-in-up" style={{ animationDelay: '100ms' }}>Enter your full name to get started.</p>
                  
                  <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <input
                      type="text"
                      placeholder="e.g. Kofi Mensah"
                      className="w-full text-3xl md:text-4xl font-light text-gray-900 bg-transparent border-b-2 border-gray-200 pb-4 focus:outline-none focus:border-[#1B5E20] transition-colors placeholder:text-gray-300"
                      {...register('fullName')}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleNext(); } }}
                    />
                    {errors.fullName && <p className="mt-4 text-base text-red-500 font-medium">{errors.fullName.message}</p>}
                  </div>
                </div>
              )}

              {/* Step 2: Contact */}
              {step === 2 && (
                <div className="absolute inset-0 flex flex-col justify-center">
                  <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4 animate-fade-in-up" style={{ animationDelay: '0ms' }}>Hi {fullNameValue.split(' ')[0]},</h1>
                  <p className="text-lg text-gray-500 font-medium mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: '100ms' }}>Enter a {mode === 'phone' ? 'phone number' : 'email'} to log in with.</p>

                  <div className="flex rounded-full bg-gray-100 p-1 mb-10 max-w-xs animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <button type="button" className={`flex-1 rounded-full py-3 text-sm font-bold transition-all duration-200 ${mode === 'phone' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`} onClick={() => toggleMode('phone')}>Phone</button>
                    <button type="button" className={`flex-1 rounded-full py-3 text-sm font-bold transition-all duration-200 ${mode === 'email' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`} onClick={() => toggleMode('email')}>Email</button>
                  </div>

                  {mode === 'phone' ? (
                    <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                      <input
                        type="tel"
                        placeholder="024 123 4567"
                        className="w-full text-3xl md:text-4xl font-light text-gray-900 bg-transparent border-b-2 border-gray-200 pb-4 focus:outline-none focus:border-[#1B5E20] transition-colors placeholder:text-gray-300"
                        {...register('phone')}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleNext(); } }}
                      />
                      {displayPhone && !errors.phone && <p className="mt-4 text-base text-[#1B5E20] font-bold animate-fade-in">We read this as: {displayPhone}</p>}
                      {errors.phone && <p className="mt-4 text-base text-red-500 font-medium animate-fade-in">{errors.phone.message}</p>}
                    </div>
                  ) : (
                    <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                      <input
                        type="email"
                        placeholder="farmer@example.com"
                        className="w-full text-3xl md:text-4xl font-light text-gray-900 bg-transparent border-b-2 border-gray-200 pb-4 focus:outline-none focus:border-[#1B5E20] transition-colors placeholder:text-gray-300"
                        {...register('email')}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleNext(); } }}
                      />
                      {errors.email && <p className="mt-4 text-base text-red-500 font-medium animate-fade-in">{errors.email.message}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Security */}
              {step === 3 && (
                <div className="absolute inset-0 flex flex-col justify-center">
                  <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4 animate-fade-in-up" style={{ animationDelay: '0ms' }}>Secure your account</h1>
                  <p className="text-lg text-gray-500 font-medium mb-10 animate-fade-in-up" style={{ animationDelay: '100ms' }}>Choose a strong password to protect your farm data.</p>

                  <div className="space-y-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        autoComplete="new-password"
                        className="w-full text-2xl md:text-3xl font-light text-gray-900 bg-transparent border-b-2 border-gray-200 pb-4 pr-12 focus:outline-none focus:border-[#1B5E20] transition-colors placeholder:text-gray-300 tracking-wide"
                        {...register('password')}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleNext(); } }}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute bottom-4 right-0 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none">
                        {showPassword ? (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        ) : (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.71-2.29c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0l-3.29-3.29" /></svg>
                        )}
                      </button>
                    </div>
                    
                    {/* Password Strength Meter & Checklist */}
                    <div className="mt-8 space-y-6">
                      <div className="flex h-2 w-full space-x-1 rounded-full overflow-hidden bg-gray-100">
                        <div className={`h-full flex-1 ${pwdValue.length > 0 ? strengthColor(pwdStrength) : 'bg-transparent'} transition-colors duration-300`} />
                        <div className={`h-full flex-1 ${pwdStrength >= 2 ? strengthColor(pwdStrength) : 'bg-transparent'} transition-colors duration-300`} />
                        <div className={`h-full flex-1 ${pwdStrength >= 3 ? strengthColor(pwdStrength) : 'bg-transparent'} transition-colors duration-300`} />
                        <div className={`h-full flex-1 ${pwdStrength >= 4 ? strengthColor(pwdStrength) : 'bg-transparent'} transition-colors duration-300`} />
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm font-medium">
                        <div className={`flex items-center ${pwdChecks.length ? 'text-emerald-700' : 'text-gray-400'}`}><svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>8+ characters</div>
                        <div className={`flex items-center ${pwdChecks.capital ? 'text-emerald-700' : 'text-gray-400'}`}><svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>Capital letter</div>
                        <div className={`flex items-center ${pwdChecks.number ? 'text-emerald-700' : 'text-gray-400'}`}><svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>Number</div>
                        <div className={`flex items-center ${pwdChecks.special ? 'text-emerald-700' : 'text-gray-400'}`}><svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>Special character</div>
                      </div>
                    </div>
                    
                    {errors.password && <p className="text-base text-red-500 font-medium">{errors.password.message}</p>}
                  </div>
                </div>
              )}

              {/* Step 4: Confirm Password */}
              {step === 4 && (
                <div className="absolute inset-0 flex flex-col justify-center">
                  <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4 animate-fade-in-up" style={{ animationDelay: '0ms' }}>Confirm password</h1>
                  <p className="text-lg text-gray-500 font-medium mb-10 animate-fade-in-up" style={{ animationDelay: '100ms' }}>Enter your password again to ensure there are no typos.</p>

                  <div className="space-y-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm Password"
                        autoComplete="new-password"
                        className="w-full text-2xl md:text-3xl font-light text-gray-900 bg-transparent border-b-2 border-gray-200 pb-4 pr-12 focus:outline-none focus:border-[#1B5E20] transition-colors placeholder:text-gray-300 tracking-wide"
                        {...register('confirmPassword')}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleNext(); } }}
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute bottom-4 right-0 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none">
                        {showConfirmPassword ? (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        ) : (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.71-2.29c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0l-3.29-3.29" /></svg>
                        )}
                      </button>
                    </div>
                    
                    <div className="min-h-[30px]">
                      {errors.confirmPassword ? (
                        <p className="text-base text-red-500 font-medium animate-fade-in">{errors.confirmPassword.message}</p>
                      ) : watch('confirmPassword') && watch('confirmPassword') === pwdValue ? (
                        <p className="text-base text-emerald-600 font-bold flex items-center animate-fade-in">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          Passwords match!
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Summary / Cross-check */}
              {step === 5 && (
                <div className="absolute inset-0 flex flex-col justify-center">
                  <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4 animate-fade-in-up" style={{ animationDelay: '0ms' }}>Cross-check</h1>
                  <p className="text-lg text-gray-500 font-medium mb-12 animate-fade-in-up" style={{ animationDelay: '100ms' }}>Review and edit any details directly.</p>

                  <div className="bg-gray-50/50 border border-gray-100 rounded-[32px] p-8 md:p-10 space-y-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    
                    <label className="flex flex-col border-b border-gray-200 pb-4 group cursor-text">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                        <span className="text-sm uppercase tracking-widest text-gray-400 font-bold mb-2 md:mb-0 mr-4">Name</span>
                        <div className="flex items-center flex-1 justify-end">
                          <input 
                            type="text"
                            {...register('fullName')}
                            className="text-2xl font-bold text-gray-900 bg-transparent text-left md:text-right w-full focus:outline-none focus:text-emerald-700 transition-all px-0 truncate"
                            placeholder="Full Name"
                          />
                          <svg className="w-5 h-5 text-gray-300 ml-4 opacity-50 group-hover:opacity-100 group-hover:text-emerald-600 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </div>
                      </div>
                      {errors.fullName && <p className="text-sm text-red-500 font-bold mt-2 text-right">{errors.fullName.message}</p>}
                    </label>

                    <label className="flex flex-col border-b border-gray-200 pb-4 group cursor-text">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                        <span className="text-sm uppercase tracking-widest text-gray-400 font-bold mb-2 md:mb-0 mr-4">Contact</span>
                        <div className="flex items-center flex-1 justify-end">
                          <input 
                            type={mode === 'phone' ? 'tel' : 'email'}
                            {...register(mode === 'phone' ? 'phone' : 'email')}
                            className="text-xl md:text-2xl font-bold text-gray-900 bg-transparent text-left md:text-right w-full focus:outline-none focus:text-emerald-700 transition-all px-0 truncate"
                            placeholder={mode === 'phone' ? 'Phone Number' : 'Email Address'}
                          />
                          <svg className="w-5 h-5 text-gray-300 ml-4 opacity-50 group-hover:opacity-100 group-hover:text-emerald-600 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </div>
                      </div>
                      {mode === 'phone' && errors.phone && <p className="text-sm text-red-500 font-bold mt-2 text-right">{errors.phone.message}</p>}
                      {mode === 'email' && errors.email && <p className="text-sm text-red-500 font-bold mt-2 text-right">{errors.email.message}</p>}
                    </label>

                    <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-gray-200 pb-4 group cursor-text">
                      <span className="text-sm uppercase tracking-widest text-gray-400 font-bold mb-2 md:mb-0 mr-4">Password</span>
                      <div className="flex items-center flex-1 justify-end relative">
                        <input 
                          type={showPassword ? 'text' : 'password'}
                          {...register('password')}
                          autoComplete="new-password"
                          className="text-xl md:text-2xl font-bold text-gray-900 bg-transparent text-left md:text-right w-full focus:outline-none focus:text-emerald-700 transition-all px-0 truncate pr-10"
                          placeholder="Password"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 flex items-center text-gray-300 hover:text-gray-600 focus:outline-none opacity-50 group-hover:opacity-100 transition-all bg-gray-50/80 rounded-full p-1">
                          {showPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.71-2.29c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0l-3.29-3.29" /></svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:justify-between md:items-center pb-2 group cursor-text">
                      <span className="text-sm uppercase tracking-widest text-gray-400 font-bold mb-2 md:mb-0 mr-4">Confirm</span>
                      <div className="flex items-center flex-1 justify-end relative">
                        <input 
                          type={showConfirmPassword ? 'text' : 'password'}
                          {...register('confirmPassword')}
                          autoComplete="new-password"
                          className="text-xl md:text-2xl font-bold text-gray-900 bg-transparent text-left md:text-right w-full focus:outline-none focus:text-emerald-700 transition-all px-0 truncate pr-10"
                          placeholder="Confirm Password"
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-0 flex items-center text-gray-300 hover:text-gray-600 focus:outline-none opacity-50 group-hover:opacity-100 transition-all bg-gray-50/80 rounded-full p-1">
                          {showConfirmPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.71-2.29c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0l-3.29-3.29" /></svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {(errors.password || errors.confirmPassword) && (
                      <div className="flex flex-col items-end -mt-4 text-sm text-red-500 font-bold">
                        {errors.password && <p>{errors.password.message}</p>}
                        {errors.confirmPassword && <p>{errors.confirmPassword.message}</p>}
                        {!errors.confirmPassword && watch('password') !== watch('confirmPassword') && <p>Passwords do not match.</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 6: Success */}
              {step === 6 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center animate-fade-in-up">
                  <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4">Account created!</h1>
                  <p className="text-xl text-gray-500 font-medium leading-relaxed max-w-md">
                    Congratulations, {fullNameValue.split(' ')[0]}.<br/>
                    {mode === 'email' 
                      ? "We've sent a secure confirmation link to your email. Please click it to verify your account and log in." 
                      : "Welcome to FarmPilot. Taking you to your dashboard..."}
                  </p>
                  
                  {mode === 'phone' ? (
                    <div className="mt-12 flex space-x-3 justify-center">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  ) : (
                    <Link to="/signin" className="mt-12 bg-white border border-gray-200 text-gray-900 font-bold py-3 px-8 rounded-full shadow-sm hover:bg-gray-50 transition-colors">
                      Back to Sign In
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {step < 6 && (
              <div className="mt-16 flex items-center justify-between border-t border-gray-100 pt-8 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                <p className="text-sm text-gray-400 font-medium hidden md:block">
                  Press <span className="font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">Enter ↵</span> to continue
                </p>
                
                {step < 5 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-full md:w-auto px-12 py-5 bg-black text-white rounded-full font-bold text-lg hover:bg-gray-800 transition-all active:scale-[0.98] flex items-center justify-center shadow-lg"
                  >
                    Continue
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full md:w-auto px-12 py-5 bg-[#1B5E20] text-white rounded-full font-bold text-lg hover:bg-[#144718] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center shadow-lg shadow-emerald-900/20"
                  >
                    {isSubmitting ? 'Creating account...' : 'Create Account'}
                    {!isSubmitting && <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
