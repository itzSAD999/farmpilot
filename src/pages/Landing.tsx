import { Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

// Reusable animated number component
function AnimatedNumber({ 
  value, 
  prefix = '', 
  suffix = '', 
  decimals = 0,
  duration = 2000
}: { 
  value: number, 
  prefix?: string, 
  suffix?: string, 
  decimals?: number,
  duration?: number 
}) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutExpo for a fast start and slow finish
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(easeProgress * value);
      
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };
    
    animationFrameId = window.requestAnimationFrame(step);
    
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [value, duration]);

  // Format with commas and requested decimals
  const formatted = count.toLocaleString('en-US', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });

  return <span>{prefix}{formatted}{suffix}</span>;
}

function InteractiveModal({ feature, onClose }: { feature: string; onClose: () => void }) {
  // Interactive State
  const [acres, setAcres] = useState(4.5);
  
  const [expenseMultiplier, setExpenseMultiplier] = useState(1);
  const baseRevenue = 85000;
  const fertilizerCost = 12400 * expenseMultiplier;
  const laborCost = 6200 * expenseMultiplier;

  const [activeSeason, setActiveSeason] = useState<'major'|'minor'>('major');

  const [syncStatus, setSyncStatus] = useState<'offline'|'syncing'|'synced'>('offline');

  // Simulate sync
  useEffect(() => {
    if (feature === 'offline' && syncStatus === 'syncing') {
      const timer = setTimeout(() => setSyncStatus('synced'), 2000);
      return () => clearTimeout(timer);
    }
  }, [feature, syncStatus]);

  let content = null;
  
  if (feature === 'season') {
    content = (
      <div className="space-y-6">
        <h3 className="text-3xl font-bold text-white tracking-tight">Season Tracking</h3>
        <p className="text-white/60 leading-relaxed text-lg">
          Toggle between seasons to instantly compare yields and adjust strategies. Historical data is your greatest asset.
        </p>
        
        <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
          <div className="flex rounded-full bg-black/50 p-1 mb-8 w-fit border border-white/10">
            <button 
              onClick={() => setActiveSeason('major')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeSeason === 'major' ? 'bg-emerald-500 text-black' : 'text-white/50 hover:text-white'}`}
            >
              Major Season
            </button>
            <button 
              onClick={() => setActiveSeason('minor')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeSeason === 'minor' ? 'bg-emerald-500 text-black' : 'text-white/50 hover:text-white'}`}
            >
              Minor Season
            </button>
          </div>

          <div className="flex items-end space-x-6 h-40">
            {activeSeason === 'major' ? (
              <>
                <div className="w-1/3 bg-white/10 rounded-t-xl h-[40%] group relative transition-all duration-500"><div className="absolute -top-8 left-1/2 -translate-x-1/2 text-white/50 text-xs">2022</div></div>
                <div className="w-1/3 bg-white/10 rounded-t-xl h-[60%] group relative transition-all duration-500"><div className="absolute -top-8 left-1/2 -translate-x-1/2 text-white/50 text-xs">2023</div></div>
                <div className="w-1/3 bg-emerald-500 rounded-t-xl h-[90%] shadow-[0_0_30px_rgba(16,185,129,0.3)] relative transition-all duration-500"><div className="absolute -top-8 left-1/2 -translate-x-1/2 text-emerald-400 font-bold text-xs">2024</div></div>
              </>
            ) : (
              <>
                <div className="w-1/3 bg-white/10 rounded-t-xl h-[30%] group relative transition-all duration-500"><div className="absolute -top-8 left-1/2 -translate-x-1/2 text-white/50 text-xs">2022</div></div>
                <div className="w-1/3 bg-white/10 rounded-t-xl h-[45%] group relative transition-all duration-500"><div className="absolute -top-8 left-1/2 -translate-x-1/2 text-white/50 text-xs">2023</div></div>
                <div className="w-1/3 bg-emerald-500 rounded-t-xl h-[70%] shadow-[0_0_30px_rgba(16,185,129,0.3)] relative transition-all duration-500"><div className="absolute -top-8 left-1/2 -translate-x-1/2 text-emerald-400 font-bold text-xs">2024</div></div>
              </>
            )}
          </div>
          <div className="mt-8 border-t border-white/10 pt-4 flex justify-between text-sm">
            <span className="text-white/50">Projected Yield</span>
            <span className="text-white font-bold text-xl">{activeSeason === 'major' ? '4.2 Tons/Acre' : '3.1 Tons/Acre'}</span>
          </div>
        </div>
      </div>
    );
  } else if (feature === 'financials') {
    content = (
      <div className="space-y-6">
        <h3 className="text-3xl font-bold text-white tracking-tight">Financials Simulator</h3>
        <p className="text-white/60 leading-relaxed text-lg">
          Simulate your entire season's profitability. Adjust yield and market prices against your input costs to forecast your bottom line before you plant a single seed.
        </p>

        <div className="bg-white/5 rounded-3xl p-6 border border-white/10 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6 bg-black/40 p-5 rounded-2xl border border-white/5">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/50 uppercase tracking-widest font-bold">Yield (Tons)</span>
                  <span className="text-white font-bold">{expenseMultiplier.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="1" max="50" step="1" 
                  value={expenseMultiplier * 10} 
                  onChange={(e) => setExpenseMultiplier(parseFloat(e.target.value) / 10)}
                  className="w-full accent-emerald-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/50 uppercase tracking-widest font-bold">Input Costs (GH₵)</span>
                  <span className="text-red-400 font-bold">{(fertilizerCost + laborCost).toLocaleString()}</span>
                </div>
                <input 
                  type="range" min="1000" max="50000" step="500" 
                  value={fertilizerCost + laborCost} 
                  onChange={(e) => setExpenseMultiplier(parseFloat(e.target.value) / 18600)}
                  className="w-full accent-red-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex flex-col justify-center space-y-4">
              <div className="bg-black/50 rounded-2xl p-4 border border-white/5 flex justify-between items-center">
                <span className="text-xs text-emerald-400 uppercase tracking-widest font-bold">Revenue</span>
                <span className="text-lg font-bold text-white">GH₵ {(baseRevenue * (expenseMultiplier * 0.8)).toLocaleString()}</span>
              </div>
              <div className="bg-black/50 rounded-2xl p-4 border border-white/5 flex justify-between items-center">
                <span className="text-xs text-red-400 uppercase tracking-widest font-bold">Costs</span>
                <span className="text-lg font-bold text-white">- GH₵ {(fertilizerCost + laborCost).toLocaleString()}</span>
              </div>
              <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/30 flex justify-between items-center shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <span className="text-xs text-emerald-400 uppercase tracking-widest font-bold">Net Profit</span>
                <span className="text-xl font-bold text-white">GH₵ {((baseRevenue * (expenseMultiplier * 0.8)) - (fertilizerCost + laborCost)).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="w-full h-2 rounded-full overflow-hidden flex">
            <div className="bg-red-500 h-full transition-all" style={{ width: `${Math.min(100, ((fertilizerCost + laborCost) / (baseRevenue * (expenseMultiplier * 0.8))) * 100)}%` }}></div>
            <div className="bg-emerald-500 h-full transition-all flex-1"></div>
          </div>
          <div className="flex justify-between text-[10px] text-white/40 uppercase tracking-widest font-bold">
            <span>Cost Margin</span>
            <span>Profit Margin</span>
          </div>
        </div>
      </div>
    );
  } else if (feature === 'offline') {
    content = (
      <div className="space-y-6">
        <h3 className="text-3xl font-bold text-white tracking-tight">Offline-First</h3>
        <p className="text-white/60 leading-relaxed text-lg">
          Simulate going off-grid. Enter some data while disconnected, then reconnect to watch FarmPilot seamlessly sync to the cloud.
        </p>
        
        <div className="bg-white/5 rounded-3xl p-8 border border-white/10 flex flex-col items-center justify-center py-16">
          <button 
            onClick={() => setSyncStatus(syncStatus === 'offline' ? 'syncing' : 'offline')}
            className={`px-8 py-4 rounded-full font-bold transition-all shadow-lg flex items-center space-x-3 ${
              syncStatus === 'offline' 
                ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' 
                : syncStatus === 'syncing'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
            }`}
          >
            {syncStatus === 'offline' && (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" /></svg>
                <span>Offline (Click to Reconnect)</span>
              </>
            )}
            {syncStatus === 'syncing' && (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                <span>Syncing Data...</span>
              </>
            )}
            {syncStatus === 'synced' && (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                <span>All Data Synced</span>
              </>
            )}
          </button>
          
          {syncStatus === 'synced' && (
             <button onClick={() => setSyncStatus('offline')} className="mt-6 text-sm text-white/40 hover:text-white transition-colors underline">Go back offline</button>
          )}
        </div>
      </div>
    );
  } else if (feature === 'precision') {
    content = (
      <div className="space-y-6">
        <h3 className="text-3xl font-bold text-white tracking-tight">Precision Control</h3>
        <p className="text-white/60 leading-relaxed text-lg">
          Slide to adjust your target acreage and watch the seed and fertilizer requirements calculate instantly.
        </p>
        
        <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/20 rounded-3xl p-8 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
          
          <div className="text-center mb-8">
            <span className="text-blue-300 text-sm font-medium uppercase tracking-widest">Target Area</span>
            <div className="flex items-center justify-center mt-2">
              <input 
                type="range" 
                min="0.5" 
                max="100" 
                step="0.5" 
                value={acres} 
                onChange={(e) => setAcres(parseFloat(e.target.value))}
                className="w-1/2 mr-4 accent-blue-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
              <h4 className="text-5xl font-light text-white w-32 text-left">{acres.toFixed(1)} <span className="text-2xl text-blue-400 block">Acres</span></h4>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col items-center text-center">
              <svg className="w-6 h-6 text-emerald-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-xs text-white/50 mb-1">Seeds Req.</span>
              <span className="text-xl font-bold text-white">{(acres * 40).toFixed(0)}k</span>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col items-center text-center">
              <svg className="w-6 h-6 text-purple-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              <span className="text-xs text-white/50 mb-1">Fertilizer (NPK)</span>
              <span className="text-xl font-bold text-white">{(acres * 2.5).toFixed(1)} Bags</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      ></div>
      
      {/* Modal Content */}
      <div className="relative bg-[#111] border border-white/10 w-full max-w-2xl rounded-[32px] p-8 md:p-12 shadow-2xl animate-fade-in-up z-10">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        {content}
      </div>
    </div>
  );
}

const BACKGROUND_VIDEOS = [
  "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-tractor-plowing-a-field-39828-large.mp4",
  "https://cdn.coverr.co/videos/coverr-a-tractor-plowing-a-field-5099/1080p.mp4",
  "https://www.w3schools.com/html/mov_bbb.mp4"
];

export function Landing() {
  const { user, isLoading } = useAuth();
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentVideoIndex((prev) => (prev + 1) % BACKGROUND_VIDEOS.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-black" />;
  }

  // If already logged in, bypass landing page
  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen w-full bg-black overflow-x-hidden font-sans selection:bg-[#1B5E20] selection:text-white animate-fade-in">
      {selectedFeature && (
        <InteractiveModal feature={selectedFeature} onClose={() => setSelectedFeature(null)} />
      )}
      
      {/* Hero Section (100vh) */}
      <section className="relative w-full min-h-[600px] h-screen flex flex-col justify-between">
        
        {/* Cinematic Video Carousel Background */}
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none bg-black flex items-center justify-center">
          {BACKGROUND_VIDEOS.map((src, idx) => (
            <video 
              key={src}
              autoPlay 
              loop 
              muted 
              playsInline
              poster={idx === 0 ? "/hero.jpg" : undefined}
              className={`absolute inset-0 w-full h-full object-cover scale-[1.05] transition-opacity duration-[2000ms] ease-in-out ${
                idx === currentVideoIndex ? 'opacity-50' : 'opacity-0'
              }`}
            >
              <source src={src} type="video/mp4" />
            </video>
          ))}
          {/* Vignette Overlay for cinematic feel */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_black_100%)] opacity-70"></div>
        </div>

        {/* Header */}
        <header className="relative z-10 w-full px-6 py-8 md:px-12 md:py-10 flex justify-between items-start">
          <h1 className="text-[3.5rem] sm:text-[4.5rem] md:text-[6rem] lg:text-[7rem] xl:text-[9rem] font-light text-white tracking-tighter leading-none -mt-4 opacity-95 flex items-start">
            FARM PILOT<sup className="text-xl sm:text-2xl md:text-3xl xl:text-4xl mt-4 md:mt-8 ml-2">®</sup>
          </h1>
          <div className="hidden md:flex space-x-12 xl:space-x-16 text-xs text-white uppercase tracking-[0.2em] font-medium opacity-80 mt-4">
            <a href="#features" className="hover:text-emerald-400 hover:opacity-100 transition-all">Features</a>
            <Link to="/signin" className="hover:text-emerald-400 hover:opacity-100 transition-all">Go to Dashboard</Link>
          </div>
        </header>

        {/* Hero Footer */}
        <footer className="relative z-10 w-full px-6 py-8 md:px-12 md:py-12 flex flex-col md:flex-row md:items-end justify-between">
          <div className="mb-8 md:mb-0">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-wide opacity-90 mb-4">
              Your smart digital farm.
            </h2>
            <p className="max-w-md text-sm sm:text-base font-light text-white/70 leading-relaxed">
              Increase the efficiency of your farming business with mathematical precision. Manage seasons, track expenses, and forecast yields from a single platform.
            </p>
          </div>

          <div className="flex flex-col space-y-4 w-full sm:w-64">
            <Link 
              to="/signup" 
              className="w-full py-4 text-center uppercase tracking-widest text-xs font-bold bg-white text-black hover:bg-gray-200 transition-colors"
            >
              Start Building
            </Link>
            <a 
              href="#features" 
              className="w-full py-4 text-center uppercase tracking-widest text-xs font-bold border border-white/30 text-white hover:bg-white/10 transition-colors"
            >
              Explore Features
            </a>
          </div>
        </footer>
      </section>

      {/* Features Section - Premium Bento Grid */}
      <section id="features" className="relative w-full bg-black px-6 py-24 md:px-12 lg:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 lg:mb-20">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tighter mb-6 md:mb-0 text-white">
              Control every <br/> <span className="text-emerald-400">acre.</span>
            </h2>
            <p className="max-w-sm text-white/60 font-light leading-relaxed">
              FarmPilot is designed for modern farmers who treat agriculture as a precise science. Built for speed, accuracy, and growth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-auto lg:h-[600px]">
            {/* Feature 1: Season Tracking (Large Span) */}
            <div 
              onClick={() => setSelectedFeature('season')}
              className="cursor-pointer md:col-span-2 lg:col-span-2 lg:row-span-1 bg-gradient-to-br from-[#111] to-[#0a0a0a] rounded-[32px] p-8 border border-white/5 relative overflow-hidden group hover:border-white/20 transition-all duration-500 hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]"
            >
              <div className="absolute right-0 bottom-0 opacity-20 transform translate-x-1/4 translate-y-1/4 group-hover:scale-110 transition-transform duration-700">
                <svg className="w-64 h-64 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              
              <div className="relative z-10 w-full h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-emerald-400 mb-6 bg-black/50 backdrop-blur-sm group-hover:bg-emerald-500/20 group-hover:text-emerald-300 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <h3 className="text-2xl font-medium tracking-wide mb-3 text-white group-hover:text-emerald-400 transition-colors">Season Tracking</h3>
                  <p className="text-sm text-white/50 font-light leading-relaxed max-w-sm">
                    Log every crop, every season. Compare yields across major and minor windows with granular reporting.
                  </p>
                </div>

                {/* Interactive Mockup */}
                <div className="mt-8 bg-white/5 rounded-2xl p-4 border border-white/10 w-full max-w-md backdrop-blur-md flex items-center space-x-4 group-hover:bg-white/10 transition-colors">
                   <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-400 font-bold">MZ</div>
                   <div className="flex-1">
                     <div className="h-2 w-3/4 bg-white/20 rounded-full mb-2"></div>
                     <div className="h-2 w-1/2 bg-white/10 rounded-full"></div>
                   </div>
                   <div className="text-xs font-bold text-emerald-400"><AnimatedNumber value={12} prefix="+" suffix="%" /></div>
                </div>
              </div>
            </div>

            {/* Feature 2: Financials (Tall Span) */}
            <div 
              onClick={() => setSelectedFeature('financials')}
              className="cursor-pointer md:col-span-2 lg:col-span-1 lg:row-span-2 bg-gradient-to-br from-emerald-900/20 to-black rounded-[32px] p-8 border border-white/5 relative overflow-hidden group hover:border-emerald-500/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(16,185,129,0.1)] min-h-[400px]"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-emerald-500/30 transition-colors duration-700"></div>
              
              <div className="relative z-10 w-full h-full flex flex-col">
                <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-emerald-400 mb-6 bg-black/50 backdrop-blur-sm group-hover:bg-emerald-500/20 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-2xl font-medium tracking-wide mb-3 text-white group-hover:text-emerald-400 transition-colors">Financials</h3>
                <p className="text-sm text-white/50 font-light leading-relaxed mb-8 lg:mb-12">
                  Record every expense down to the pesewa. Understand your true profit margins before the harvest even begins.
                </p>

                {/* Interactive Mockup */}
                <div className="mt-auto space-y-3">
                  <div className="bg-black/40 rounded-2xl p-5 border border-white/10 backdrop-blur-md text-center group-hover:border-emerald-500/30 transition-colors">
                    <p className="text-xs text-white/50 mb-1">Total Revenue</p>
                    <p className="text-3xl font-light text-white tracking-tight"><AnimatedNumber value={42500} prefix="GH₵ " /></p>
                  </div>
                  {[
                    { label: 'Fertilizer', amount: '- GH₵ 2,400', color: 'text-red-400' },
                    { label: 'Labor', amount: '- GH₵ 1,200', color: 'text-red-400' },
                    { label: 'Sales', amount: '+ GH₵ 8,500', color: 'text-emerald-400' },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center bg-white/5 rounded-xl p-3 px-4 text-sm font-medium group-hover:bg-white/10 transition-colors">
                      <span className="text-white/70">{item.label}</span>
                      <span className={item.color}>{item.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Feature 3: Offline-First */}
            <div 
              onClick={() => setSelectedFeature('offline')}
              className="cursor-pointer md:col-span-1 lg:col-span-1 lg:row-span-1 bg-gradient-to-br from-[#111] to-[#0a0a0a] rounded-[32px] p-8 border border-white/5 relative overflow-hidden group hover:border-white/20 transition-all duration-500 hover:shadow-[0_0_40px_rgba(255,255,255,0.05)] min-h-[300px]"
            >
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-emerald-400 mb-6 bg-black/50 backdrop-blur-sm group-hover:bg-emerald-500/20 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h3 className="text-xl font-medium tracking-wide mb-2 text-white group-hover:text-emerald-400 transition-colors">Offline-First</h3>
                  <p className="text-xs text-white/50 font-light leading-relaxed">
                    Your farm doesn't always have a signal. FarmPilot caches your data locally and syncs automatically.
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 mt-4 bg-white/5 self-start px-3 py-1.5 rounded-full border border-white/10 group-hover:border-emerald-500/50 transition-colors">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-white/70">Syncing to cloud</span>
                </div>
              </div>
            </div>

            {/* Feature 4: Mathematical Precision */}
            <div 
              onClick={() => setSelectedFeature('precision')}
              className="cursor-pointer md:col-span-1 lg:col-span-1 lg:row-span-1 bg-gradient-to-br from-[#111] to-[#0a0a0a] rounded-[32px] p-8 border border-white/5 relative overflow-hidden group hover:border-white/20 transition-all duration-500 hover:shadow-[0_0_40px_rgba(255,255,255,0.05)] min-h-[300px]"
            >
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-blue-400 mb-6 bg-black/50 backdrop-blur-sm group-hover:bg-blue-500/20 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
                  </div>
                  <h3 className="text-xl font-medium tracking-wide mb-2 text-white group-hover:text-blue-400 transition-colors">Precision Control</h3>
                  <p className="text-xs text-white/50 font-light leading-relaxed">
                    Calculate seed requirements and pesticide ratios instantly based on acreage.
                  </p>
                </div>

                <div className="flex items-end justify-between mt-4 group-hover:opacity-100 transition-opacity">
                  <div className="text-white">
                    <span className="text-xs text-white/40 block mb-1">Acres</span>
                    <span className="text-2xl font-light"><AnimatedNumber value={4.5} decimals={1} /></span>
                  </div>
                  <div className="text-blue-400">
                    <span className="text-xs text-blue-500 block mb-1">Seeds Req.</span>
                    <span className="text-2xl font-light"><AnimatedNumber value={180} suffix="k" /></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative w-full bg-[#111] px-6 py-24 md:px-12 md:py-32 flex flex-col items-center text-center">
        <h2 className="text-3xl md:text-5xl font-light tracking-tighter mb-8 text-white">
          Ready to optimize your harvest?
        </h2>
        <Link 
          to="/signup" 
          className="px-10 py-5 text-center uppercase tracking-widest text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-xl shadow-emerald-900/20"
        >
          Start using FarmPilot
        </Link>
      </section>

      {/* Simple Footer */}
      <footer className="w-full px-6 py-8 md:px-12 flex justify-between items-center border-t border-white/10 text-xs text-white/40 uppercase tracking-wider bg-black">
        <p>© {new Date().getFullYear()} FarmPilot</p>
        <p>Built for the future</p>
      </footer>
    </div>
  );
}
