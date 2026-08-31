import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { normalisePhone } from '../lib/phone';

const signInSchema = z.object({
  mode: z.enum(['phone', 'email']),
  phone: z.string().optional(),
  email: z.string().email('Please enter a valid email address.').optional().or(z.literal('')),
  password: z.string().min(1, 'Please enter your password.'),
}).superRefine((data, ctx) => {
  if (data.mode === 'phone') {
    if (!data.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter your mobile number.',
        path: ['phone'],
      });
    }
  } else {
    if (!data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter your email address.',
        path: ['email'],
      });
    }
  }
});

type SignInFormData = z.infer<typeof signInSchema>;

export function SignIn() {
  const location = useLocation();
  const [mode, setMode] = useState<'phone' | 'email'>('phone');
  const [serverError, setServerError] = useState<string | null>(location.state?.message || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { signInWithPhone, signInWithEmail } = useAuth();
  const navigate = useNavigate();

  const from = location.state?.from?.pathname || '/';

  const { register, handleSubmit, formState: { errors }, resetField, setValue } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      mode: 'phone',
      phone: '',
      email: '',
      password: '',
    },
  });

  const toggleMode = (newMode: 'phone' | 'email') => {
    setMode(newMode);
    setValue('mode', newMode); // Sync React Hook Form state
    setServerError(null);
    if (newMode === 'phone') resetField('email');
    if (newMode === 'email') resetField('phone');
  };

  const onSubmit = async (data: SignInFormData) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'phone' && data.phone) {
        await signInWithPhone(normalisePhone(data.phone), data.password);
      } else if (mode === 'email' && data.email) {
        await signInWithEmail(data.email, data.password);
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      setServerError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans animate-fade-in">
      
      {/* Left Panel - Hidden on mobile, takes 40% width on desktop */}
      <div className="hidden lg:flex flex-col w-[40%] bg-[#0a0a0a] relative overflow-hidden p-12 text-white justify-between">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1B5E20]/20 to-black pointer-events-none" />
        
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
          </div>
          <span className="text-xl font-bold tracking-wide">FarmPilot</span>
        </div>

        <div className="relative z-10 my-auto pr-8 animate-fade-in">
          <div className="text-6xl mb-8 animate-bounce" style={{ animationDuration: '3s' }}>👋</div>
          <h2 className="text-5xl md:text-6xl font-light tracking-tighter leading-[1.1] mb-6">
            Welcome back.
          </h2>
          <p className="text-xl text-white/60 font-light leading-relaxed max-w-md">
            Sign in to access your farm's dashboard and pick up right where you left off.
          </p>
        </div>

        <div className="relative z-10 text-white/40 text-sm font-medium tracking-widest uppercase">
          FarmPilot 2.0
        </div>
      </div>

      {/* Right Panel - Form Area (Takes full width on mobile, 60% on desktop) */}
      <div className="flex-1 flex flex-col relative w-full bg-white overflow-y-auto">
        
        {/* Top Navigation */}
        <div className="relative w-full p-6 md:p-12 flex justify-between items-center z-50 shrink-0">
          <Link to="/welcome" className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors group">
            <span className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center sm:mr-3 group-hover:bg-gray-100 transition-colors shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </span>
            <span className="hidden sm:inline">Home</span>
          </Link>

          <Link to="/signup" className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
            Create account instead
          </Link>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full px-6 py-12 md:px-12">
          
          <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4">Sign In</h1>
            <p className="text-lg text-gray-500 font-medium mb-10 leading-relaxed">Enter your details to access your account.</p>
          </div>

          <div className="flex rounded-full bg-gray-100 p-1 mb-10 max-w-xs animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <button
              type="button"
              className={`flex-1 min-h-[44px] rounded-full py-3 text-sm font-bold transition-all duration-200 ${
                mode === 'phone' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
              }`}
              onClick={() => toggleMode('phone')}
            >
              Phone
            </button>
            <button
              type="button"
              className={`flex-1 min-h-[44px] rounded-full py-3 text-sm font-bold transition-all duration-200 ${
                mode === 'email' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
              }`}
              onClick={() => toggleMode('email')}
            >
              Email
            </button>
          </div>

          {serverError && (
            <div className="mb-8 p-4 rounded-2xl bg-red-50 text-red-700 text-sm font-medium border border-red-100 animate-fade-in">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
            <input type="hidden" value={mode} {...register('mode')} />

            {mode === 'phone' && (
              <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                <label htmlFor="phone" className="sr-only">Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="024 123 4567"
                  aria-invalid={errors.phone ? 'true' : 'false'}
                  aria-describedby={errors.phone ? 'phone-error' : undefined}
                  className="w-full text-3xl md:text-4xl font-light text-gray-900 bg-transparent border-b-2 border-gray-200 pb-4 focus:outline-none focus:border-[#1B5E20] transition-colors placeholder:text-gray-300"
                  {...register('phone')}
                />
                {errors.phone && (
                  <p id="phone-error" className="mt-4 text-base text-red-500 font-medium">{errors.phone.message}</p>
                )}
              </div>
            )}

            {mode === 'email' && (
              <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                <label htmlFor="email" className="sr-only">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="farmer@example.com"
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className="w-full text-3xl md:text-4xl font-light text-gray-900 bg-transparent border-b-2 border-gray-200 pb-4 focus:outline-none focus:border-[#1B5E20] transition-colors placeholder:text-gray-300"
                  {...register('email')}
                />
                {errors.email && (
                  <p id="email-error" className="mt-4 text-base text-red-500 font-medium">{errors.email.message}</p>
                )}
              </div>
            )}

            <div className="relative animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Password"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className="w-full text-2xl md:text-3xl font-light text-gray-900 bg-transparent border-b-2 border-gray-200 pb-4 pr-12 focus:outline-none focus:border-[#1B5E20] transition-colors placeholder:text-gray-300 tracking-wide"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute bottom-2 right-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.71-2.29c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0l-3.29-3.29" /></svg>
                )}
              </button>
              {errors.password && (
                <p id="password-error" className="mt-4 text-base text-red-500 font-medium">{errors.password.message}</p>
              )}
            </div>

            <div className="mt-10 flex items-center justify-between pt-6 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <p className="text-sm text-gray-500 font-medium hidden md:block">
                Press <span className="font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">Enter ↵</span> to continue
              </p>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full md:w-auto px-12 py-5 bg-[#1B5E20] text-white rounded-full font-bold text-lg hover:bg-[#144718] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center shadow-lg shadow-emerald-900/20"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
                {!isSubmitting && <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
