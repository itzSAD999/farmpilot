import { Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target); // Only reveal once
        }
      });
    }, { 
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px"
    });

    document.querySelectorAll('.reveal-on-scroll').forEach(el => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);
}

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

  // "What's actually in the app" section state
  const [overspendPct, setOverspendPct] = useState(18);
  const [benchmarkFilled, setBenchmarkFilled] = useState(false);
  const [maizeAcres, setMaizeAcres] = useState(3);
  const [cassavaAcres, setCassavaAcres] = useState(2);
  const [wcQuestionIdx, setWcQuestionIdx] = useState(0);
  const [wcAmount, setWcAmount] = useState('');
  const [wcAnswers, setWcAnswers] = useState<Record<string, number>>({});
  const [chatQuestion, setChatQuestion] = useState<'overspend' | 'total' | null>(null);
  const [dashboardView, setDashboardView] = useState<'pie' | 'bar'>('pie');
  const [coldStartMode, setColdStartMode] = useState<'new' | 'returning'>('new');

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
  } else if (feature === 'overspend') {
    const benchmark = 3800;
    const spent = benchmark * (1 + overspendPct / 100);
    const isFlagged = overspendPct > 30;
    content = (
      <div className="space-y-6">
        <h3 className="text-3xl font-bold text-white tracking-tight">Overspend Detection</h3>
        <p className="text-white/60 leading-relaxed text-lg">
          Drag your fertiliser spend and watch it get checked against the real benchmark — cross 30% over, and it flags with a reason, just like it does in the app.
        </p>

        <div className={`bg-white/5 rounded-3xl p-8 border transition-colors duration-300 ${isFlagged ? 'border-amber-500/50' : 'border-white/10'}`}>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-white/50 uppercase tracking-widest font-bold">Your Fertiliser Spend</span>
            <span className={`font-bold ${isFlagged ? 'text-amber-400' : 'text-white'}`}>GH₵ {spent.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <input
            type="range" min="-20" max="80" step="1"
            value={overspendPct}
            onChange={(e) => setOverspendPct(parseFloat(e.target.value))}
            className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-white/10 ${isFlagged ? 'accent-amber-500' : 'accent-emerald-500'}`}
          />
          <div className="flex justify-between text-[10px] text-white/30 uppercase tracking-widest font-bold mt-1 mb-6">
            <span>Under</span>
            <span>Benchmark: GH₵ {benchmark.toLocaleString()}</span>
            <span>Over</span>
          </div>

          {isFlagged ? (
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 animate-fade-in">
              <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <div>
                <p className="text-amber-300 font-bold text-sm">Fertiliser is {overspendPct}% over benchmark</p>
                <p className="text-white/50 text-xs mt-1">That's GH₵ {(spent - benchmark).toLocaleString(undefined, { maximumFractionDigits: 0 })} more than the expected per-acre NPK rate. Check for bulk-buy discounts or a smaller application.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
              <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              <p className="text-emerald-300 font-bold text-sm">Within the expected range — no flag.</p>
            </div>
          )}
        </div>
      </div>
    );
  } else if (feature === 'benchmarkfill') {
    content = (
      <div className="space-y-6">
        <h3 className="text-3xl font-bold text-white tracking-tight">"Don't know this cost?"</h3>
        <p className="text-white/60 leading-relaxed text-lg">
          Recording labour costs but never wrote down the number? Tap once and the standard rate for your acreage fills in for you.
        </p>

        <div className="bg-white/5 rounded-3xl p-8 border border-white/10 space-y-4">
          <div className="flex items-center justify-between bg-black/40 rounded-2xl p-4 border border-white/5">
            <span className="text-white/60 text-sm font-bold">Category</span>
            <span className="text-white font-bold px-3 py-1 bg-white/10 rounded-lg text-sm">Labour</span>
          </div>

          {!benchmarkFilled ? (
            <button
              onClick={() => setBenchmarkFilled(true)}
              className="w-full flex items-center justify-between gap-3 p-4 rounded-xl border border-dashed border-emerald-400/50 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors text-left"
            >
              <span className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0 font-bold">?</span>
                <span>
                  <span className="block text-sm font-bold text-emerald-300">Don't know this cost?</span>
                  <span className="block text-xs text-emerald-400/80">Tap to use the estimated average</span>
                </span>
              </span>
            </button>
          ) : (
            <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 animate-fade-in flex items-center justify-between">
              <span className="text-sm font-bold text-emerald-300">Total Amount</span>
              <span className="text-2xl font-extrabold text-white">GH₵ 1,840.00</span>
            </div>
          )}

          <button onClick={() => setBenchmarkFilled(false)} className="text-xs text-white/30 hover:text-white/60 transition-colors underline">Reset</button>
        </div>
      </div>
    );
  } else if (feature === 'weeklycheckin') {
    const WC_CATEGORIES = [
      { key: 'fertiliser', label: 'Fertiliser' },
      { key: 'land_prep', label: 'Land Preparation' },
    ];
    const totalAcres = maizeAcres + cassavaAcres;
    const maizeShare = totalAcres > 0 ? maizeAcres / totalAcres : 0.5;
    const isDone = wcQuestionIdx >= WC_CATEGORIES.length;
    const currentCat = !isDone ? WC_CATEGORIES[wcQuestionIdx] : null;
    const liveAmount = parseFloat(wcAmount) || 0;

    const answerAndAdvance = () => {
      if (!currentCat) return;
      setWcAnswers((prev) => ({ ...prev, [currentCat.key]: liveAmount }));
      setWcAmount('');
      setWcQuestionIdx((i) => i + 1);
    };

    content = (
      <div className="space-y-6">
        <h3 className="text-3xl font-bold text-white tracking-tight">Weekly Check-in</h3>
        <p className="text-white/60 leading-relaxed text-lg">
          The same short prompt FarmPilot asks once a week — one question per shared category, split automatically by acreage.
        </p>

        <div className="bg-white/5 rounded-3xl p-8 border border-white/10 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/50 uppercase tracking-widest font-bold">Maize</span>
                <span className="text-white font-bold">{maizeAcres.toFixed(1)} ac</span>
              </div>
              <input type="range" min="0" max="10" step="0.5" value={maizeAcres} onChange={(e) => setMaizeAcres(parseFloat(e.target.value))} className="w-full accent-emerald-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/50 uppercase tracking-widest font-bold">Cassava</span>
                <span className="text-white font-bold">{cassavaAcres.toFixed(1)} ac</span>
              </div>
              <input type="range" min="0" max="10" step="0.5" value={cassavaAcres} onChange={(e) => setCassavaAcres(parseFloat(e.target.value))} className="w-full accent-blue-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            {!isDone && currentCat ? (
              <div key={currentCat.key} className="animate-fade-in-up space-y-4">
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Question {wcQuestionIdx + 1} of {WC_CATEGORIES.length}</p>
                <p className="text-white text-xl font-medium">
                  How much did you spend on <span className="text-emerald-400 font-bold">{currentCat.label}</span> this week?
                </p>
                <p className="text-white/40 text-xs">Shared across your active seasons — Maize ({maizeAcres.toFixed(1)} ac) and Cassava ({cassavaAcres.toFixed(1)} ac).</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">GH₵</span>
                  <input
                    type="number" min="0" step="0.01" placeholder="0.00" autoFocus
                    value={wcAmount}
                    onChange={(e) => setWcAmount(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && liveAmount > 0 && answerAndAdvance()}
                    className="w-full text-2xl font-bold text-white bg-black/40 border border-white/10 rounded-xl pl-14 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
                {liveAmount > 0 && (
                  <div className="flex items-center gap-3 text-sm animate-fade-in">
                    <span className="text-white/50">Splits as</span>
                    <span className="font-bold text-emerald-400">Maize GH₵{(liveAmount * maizeShare).toFixed(0)}</span>
                    <span className="text-white/30">+</span>
                    <span className="font-bold text-blue-400">Cassava GH₵{(liveAmount * (1 - maizeShare)).toFixed(0)}</span>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setWcAmount(''); setWcQuestionIdx((i) => i + 1); }} className="text-sm font-bold text-white/40 hover:text-white transition-colors px-4 py-3">Skip</button>
                  <button onClick={answerAndAdvance} disabled={liveAmount <= 0} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3 transition-colors">
                    Log it →
                  </button>
                </div>
              </div>
            ) : (
              <div className="animate-fade-in text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto">
                  <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-white text-lg font-bold">All caught up for this week.</p>
                <div className="space-y-1 text-sm text-white/60">
                  {WC_CATEGORIES.filter(c => wcAnswers[c.key] > 0).map(c => (
                    <p key={c.key}>{c.label}: <span className="text-white font-bold">GH₵{wcAnswers[c.key].toFixed(0)}</span> logged, split by acreage</p>
                  ))}
                  {WC_CATEGORIES.every(c => !wcAnswers[c.key]) && <p>Nothing logged this round — try again with a real amount.</p>}
                </div>
                <button onClick={() => { setWcQuestionIdx(0); setWcAnswers({}); setWcAmount(''); }} className="text-xs font-bold text-white/40 hover:text-white underline transition-colors">Try again</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } else if (feature === 'aiassistant') {
    content = (
      <div className="space-y-6">
        <h3 className="text-3xl font-bold text-white tracking-tight">Ask FarmPilot</h3>
        <p className="text-white/60 leading-relaxed text-lg">
          The assistant answers from your real, recorded data — not a script. Try a question.
        </p>

        <div className="bg-white/5 rounded-3xl border border-white/10 flex flex-col h-[340px] overflow-hidden">
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            {!chatQuestion && (
              <div className="text-white/30 text-sm text-center pt-16">Pick a question below to see a real-shaped answer.</div>
            )}
            {chatQuestion === 'overspend' && (
              <>
                <div className="self-end ml-auto max-w-[80%] bg-emerald-600 text-white text-sm font-medium rounded-2xl rounded-br-sm px-4 py-2.5">Am I overspending anywhere this season?</div>
                <div className="max-w-[85%] bg-black/50 border border-white/10 text-white/80 text-sm rounded-2xl rounded-bl-sm px-4 py-3 leading-relaxed">
                  Yes — your <span className="text-amber-400 font-bold">fertiliser</span> spend is 42% above the benchmark for maize this season (GH₵4,800 vs an expected GH₵3,376). Labour is 15% under, so it's mostly the fertiliser line worth a second look.
                </div>
              </>
            )}
            {chatQuestion === 'total' && (
              <>
                <div className="self-end ml-auto max-w-[80%] bg-emerald-600 text-white text-sm font-medium rounded-2xl rounded-br-sm px-4 py-2.5">What's my total cost per acre so far?</div>
                <div className="max-w-[85%] bg-black/50 border border-white/10 text-white/80 text-sm rounded-2xl rounded-bl-sm px-4 py-3 leading-relaxed">
                  GH₵2,145 per acre across your 2.5-acre maize plot, based on what you've recorded plus the benchmark for categories you haven't logged yet.
                </div>
              </>
            )}
          </div>
          <div className="p-4 border-t border-white/10 flex flex-wrap gap-2 shrink-0">
            <button onClick={() => setChatQuestion('overspend')} className="text-xs font-bold px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 transition-colors">Am I overspending?</button>
            <button onClick={() => setChatQuestion('total')} className="text-xs font-bold px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 transition-colors">Cost per acre so far?</button>
          </div>
        </div>
      </div>
    );
  } else if (feature === 'dashboards') {
    const slices = [
      { label: 'Fertiliser', pct: 38, color: '#10b981' },
      { label: 'Labour', pct: 26, color: '#3b82f6' },
      { label: 'Seeds', pct: 18, color: '#f59e0b' },
      { label: 'Land Prep', pct: 12, color: '#8b5cf6' },
      { label: 'Other', pct: 6, color: '#ec4899' },
    ];
    let acc = 0;
    const gradientStops = slices.map(s => {
      const start = acc; acc += s.pct;
      return `${s.color} ${start}% ${acc}%`;
    }).join(', ');
    content = (
      <div className="space-y-6">
        <h3 className="text-3xl font-bold text-white tracking-tight">A Dashboard on Every Page</h3>
        <p className="text-white/60 leading-relaxed text-lg">
          Costs, Seasons, and each season's own page all carry a real visual breakdown — not just the top-level dashboard.
        </p>

        <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
          <div className="flex rounded-full bg-black/50 p-1 mb-8 w-fit border border-white/10">
            <button onClick={() => setDashboardView('pie')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${dashboardView === 'pie' ? 'bg-emerald-500 text-black' : 'text-white/50 hover:text-white'}`}>Pie</button>
            <button onClick={() => setDashboardView('bar')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${dashboardView === 'bar' ? 'bg-emerald-500 text-black' : 'text-white/50 hover:text-white'}`}>Bar</button>
          </div>

          {dashboardView === 'pie' ? (
            <div className="flex items-center gap-8 flex-wrap justify-center">
              <div className="w-40 h-40 rounded-full shrink-0" style={{ background: `conic-gradient(${gradientStops})` }} />
              <div className="space-y-2">
                {slices.map(s => (
                  <div key={s.label} className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-white/70 font-medium">{s.label}</span>
                    <span className="text-white font-bold ml-auto">{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-end space-x-4 h-40">
              {slices.map(s => (
                <div key={s.label} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className="w-full rounded-t-lg transition-all duration-500" style={{ height: `${(s.pct / 38) * 100}%`, backgroundColor: s.color }} />
                  <span className="text-[10px] text-white/40 font-bold mt-2 text-center">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } else if (feature === 'coldstart') {
    content = (
      <div className="space-y-6">
        <h3 className="text-3xl font-bold text-white tracking-tight">First Season, or Tenth</h3>
        <p className="text-white/60 leading-relaxed text-lg">
          Same screen, two data sources — toggle to see where your estimate comes from.
        </p>

        <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
          <div className="flex rounded-full bg-black/50 p-1 mb-8 w-fit border border-white/10">
            <button onClick={() => setColdStartMode('new')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${coldStartMode === 'new' ? 'bg-emerald-500 text-black' : 'text-white/50 hover:text-white'}`}>New Crop</button>
            <button onClick={() => setColdStartMode('returning')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${coldStartMode === 'returning' ? 'bg-emerald-500 text-black' : 'text-white/50 hover:text-white'}`}>Closed a Season Already</button>
          </div>

          <div className="bg-black/40 rounded-2xl p-6 border border-white/5">
            <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-2">Estimate source</p>
            {coldStartMode === 'new' ? (
              <p className="text-white text-lg leading-relaxed animate-fade-in">
                <span className="text-emerald-400 font-bold">MoFA benchmark rates</span> — no history yet, so every category starts from the standard per-acre norm for this crop.
              </p>
            ) : (
              <p className="text-white text-lg leading-relaxed animate-fade-in">
                <span className="text-blue-400 font-bold">Your own recorded figures</span> from the closed season — the estimate now reflects what you actually spent, not just the generic rate.
              </p>
            )}
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

/** Tracks scroll position (0-1 progress, plus raw px) for the progress
 * bar and the hero's parallax/fade, throttled to one update per frame. */
function useScrollProgress() {
  const [state, setState] = useState({ y: 0, progress: 0 });

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setState({ y, progress: max > 0 ? Math.min(1, y / max) : 0 });
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return state;
}

export function Landing() {
  useScrollReveal();
  const { user, isLoading } = useAuth();
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const { y: scrollY, progress: scrollProgress } = useScrollProgress();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentVideoIndex((prev) => (prev + 1) % BACKGROUND_VIDEOS.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  // Hero parallax: the video drifts slower than the page (classic
  // parallax), the header/footer content fades and lifts away as it
  // scrolls out — capped to the hero's own height so nothing keeps
  // moving once it's off-screen.
  const heroProgress = Math.min(1, scrollY / 700);

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

      {/* Scroll progress */}
      <div className="fixed top-0 left-0 right-0 h-[3px] z-[60] bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-[width] duration-100 ease-out"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>

      {/* Hero Section (100vh) */}
      <section className="relative w-full min-h-[600px] h-screen flex flex-col justify-between overflow-hidden">

        {/* Cinematic Video Carousel Background — drifts slower than the page (parallax) */}
        <div
          className="absolute inset-0 w-[100%] h-[130%] z-0 overflow-hidden pointer-events-none bg-black flex items-center justify-center"
          style={{ transform: `translateY(${heroProgress * 90}px)` }}
        >
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
        <header
          className="relative z-10 w-full px-6 py-8 md:px-12 md:py-10 flex justify-between items-start"
          style={{ opacity: 1 - heroProgress * 0.9, transform: `translateY(${-heroProgress * 40}px)` }}
        >
          <h1 className="text-[3.5rem] sm:text-[4.5rem] md:text-[6rem] lg:text-[7rem] xl:text-[9rem] font-light text-white tracking-tighter leading-none -mt-4 opacity-95 flex items-start">
            FARM PILOT<sup className="text-xl sm:text-2xl md:text-3xl xl:text-4xl mt-4 md:mt-8 ml-2">®</sup>
          </h1>
          <div className="hidden md:flex space-x-12 xl:space-x-16 text-xs text-white uppercase tracking-[0.2em] font-medium opacity-80 mt-4">
            <a href="#features" className="hover:text-emerald-400 hover:opacity-100 transition-all">Features</a>
            <Link to="/signin" className="hover:text-emerald-400 hover:opacity-100 transition-all">Go to Dashboard</Link>
          </div>
        </header>

        {/* Hero Footer */}
        <footer
          className="relative z-10 w-full px-6 py-8 md:px-12 md:py-12 flex flex-col md:flex-row md:items-end justify-between"
          style={{ opacity: 1 - heroProgress * 1.2, transform: `translateY(${heroProgress * 50}px)` }}
        >
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

        {/* Scroll cue */}
        <a
          href="#features"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/50 hover:text-white transition-colors"
          style={{ opacity: 1 - heroProgress * 3 }}
          aria-label="Scroll to features"
        >
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Scroll</span>
          <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
        </a>
      </section>

      {/* Features Section - Premium Bento Grid */}
      <section id="features" className="relative w-full bg-black px-6 py-24 md:px-12 lg:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 lg:mb-20 reveal-on-scroll-slow reveal-on-scroll" style={{ transitionDelay: '100ms' }}>
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
              className="reveal-on-scroll cursor-pointer md:col-span-2 lg:col-span-2 lg:row-span-1 bg-gradient-to-br from-[#111] to-[#0a0a0a] rounded-[32px] p-8 border border-white/5 relative overflow-hidden group hover:border-white/20 transition-all duration-500 hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]"
              style={{ transitionDelay: '200ms' }}
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
              className="reveal-on-scroll cursor-pointer md:col-span-2 lg:col-span-1 lg:row-span-2 bg-gradient-to-br from-emerald-900/20 to-black rounded-[32px] p-8 border border-white/5 relative overflow-hidden group hover:border-emerald-500/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(16,185,129,0.1)] min-h-[400px]"
              style={{ transitionDelay: '300ms' }}
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
              className="reveal-on-scroll cursor-pointer md:col-span-1 lg:col-span-1 lg:row-span-1 bg-gradient-to-br from-[#111] to-[#0a0a0a] rounded-[32px] p-8 border border-white/5 relative overflow-hidden group hover:border-white/20 transition-all duration-500 hover:shadow-[0_0_40px_rgba(255,255,255,0.05)] min-h-[300px]"
              style={{ transitionDelay: '400ms' }}
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
              className="reveal-on-scroll cursor-pointer md:col-span-1 lg:col-span-1 lg:row-span-1 bg-gradient-to-br from-[#111] to-[#0a0a0a] rounded-[32px] p-8 border border-white/5 relative overflow-hidden group hover:border-white/20 transition-all duration-500 hover:shadow-[0_0_40px_rgba(255,255,255,0.05)] min-h-[300px]"
              style={{ transitionDelay: '500ms' }}
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

      {/* What's Actually In The App — real, shipped features */}
      <section className="relative w-full bg-black px-6 py-24 md:px-12 lg:py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 lg:mb-20 reveal-on-scroll-slow reveal-on-scroll" style={{ transitionDelay: '100ms' }}>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tighter mb-6 md:mb-0 text-white">
              Built for the <br/> <span className="text-emerald-400">real season.</span>
            </h2>
            <p className="max-w-sm text-white/60 font-light leading-relaxed">
              Not a mockup — every card below is a feature you can open and use right now, including with the live demo account.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                key: 'overspend',
                title: 'Overspend detection, not just tracking',
                body: "Every recorded cost is compared category-by-category against an independent benchmark built from MoFA input prices and per-acre norms. Anything more than 30% over gets flagged with a specific, sourced reason — across all 10 seeded crops.",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
                accent: 'text-amber-400',
                preview: (
                  <div className="mt-2 mb-5 bg-black/40 rounded-xl p-3 border border-white/5">
                    <div className="flex justify-between text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1.5">
                      <span>Fertiliser</span><span className="text-amber-400">+42%</span>
                    </div>
                    <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-amber-500 rounded-full" style={{ width: '78%' }} />
                      <div className="absolute inset-y-0 w-px bg-white/60" style={{ left: '55%' }} />
                    </div>
                  </div>
                ),
              },
              {
                key: 'benchmarkfill',
                title: "“Don't know this cost?”",
                body: 'Recording an expense you can’t put a number on? One tap fills in the standard benchmark rate for that category, scaled to your farm’s acreage — no guessing, no blank fields.',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
                accent: 'text-emerald-400',
                preview: (
                  <div className="mt-2 mb-5 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-white/30 line-through px-2 py-1 rounded bg-white/5 border border-dashed border-white/10">GH₵ ???</span>
                    <svg className="w-3.5 h-3.5 text-white/20 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    <span className="text-[11px] font-bold text-emerald-300 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30">GH₵ 1,840.00</span>
                  </div>
                ),
              },
              {
                key: 'weeklycheckin',
                title: 'Weekly Check-in',
                body: 'A short weekly prompt to log shared costs across every active season — split proportionally to how many acres you actually planted of each crop, not divided evenly.',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
                accent: 'text-blue-400',
                preview: (
                  <div className="mt-2 mb-5">
                    <div className="flex h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500" style={{ width: '60%' }} />
                      <div className="bg-blue-500" style={{ width: '40%' }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-white/40 font-bold mt-1.5">
                      <span>Maize 60%</span><span>Cassava 40%</span>
                    </div>
                  </div>
                ),
              },
              {
                key: 'aiassistant',
                title: 'AI farm assistant that sees your real numbers',
                body: 'Ask FarmPilot’s built-in assistant about your spending and it answers using your actual flagged categories and variance — not a generic chatbot bolted on the side.',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-6l-4 4v-4z" />,
                accent: 'text-purple-400',
                preview: (
                  <div className="mt-2 mb-5 space-y-1.5">
                    <div className="ml-auto w-fit max-w-[75%] bg-emerald-600/80 text-white text-[10px] font-bold rounded-lg rounded-br-sm px-2.5 py-1.5">Am I overspending?</div>
                    <div className="w-fit max-w-[80%] bg-white/5 border border-white/10 text-white/60 text-[10px] font-medium rounded-lg rounded-bl-sm px-2.5 py-1.5">Yes — fertiliser is 42% over...</div>
                  </div>
                ),
              },
              {
                key: 'dashboards',
                title: 'A dashboard on every page',
                body: 'Costs, Seasons, and each season’s own page carry their own visual breakdown — pie charts, bar charts, and search/filter — not just one dashboard at the top level.',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
                accent: 'text-orange-400',
                preview: (
                  <div className="mt-2 mb-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full shrink-0" style={{ background: 'conic-gradient(#10b981 0% 47%, #3b82f6 47% 77%, #f59e0b 77% 95%, #8b5cf6 95% 100%)' }} />
                    <div className="flex-1 space-y-1">
                      <div className="h-1.5 bg-white/15 rounded-full w-full" />
                      <div className="h-1.5 bg-white/10 rounded-full w-2/3" />
                    </div>
                  </div>
                ),
              },
              {
                key: 'coldstart',
                title: 'Works from day one, with or without history',
                body: 'New to a crop? Your first estimate comes straight from the benchmark. Closed a season already? Next time, your own recorded figures take over — same screen, no setup required.',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />,
                accent: 'text-yellow-400',
                preview: (
                  <div className="mt-2 mb-5 flex items-center gap-2 text-[10px] font-bold">
                    <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/40">Benchmark</span>
                    <svg className="w-3 h-3 text-white/20 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    <span className="px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-300">Your History</span>
                  </div>
                ),
              },
            ].map((f, i) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setSelectedFeature(f.key)}
                className="reveal-on-scroll text-left cursor-pointer bg-gradient-to-br from-[#111] to-[#0a0a0a] rounded-[32px] p-8 border border-white/5 hover:border-white/20 transition-all duration-500 hover:shadow-[0_0_40px_rgba(255,255,255,0.05)] hover:scale-[1.02] active:scale-[0.99] flex flex-col"
                style={{ transitionDelay: `${100 + i * 100}ms` }}
              >
                <div className={`w-12 h-12 rounded-full border border-white/20 flex items-center justify-center mb-6 bg-black/50 backdrop-blur-sm ${f.accent}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{f.icon}</svg>
                </div>
                <h3 className="text-xl font-medium tracking-wide mb-3 text-white">{f.title}</h3>
                <p className="text-sm text-white/50 font-light leading-relaxed">{f.body}</p>
                {f.preview}
                <span className="mt-auto inline-flex items-center text-xs font-bold uppercase tracking-widest text-white/40">
                  Try it
                  <svg className="w-3.5 h-3.5 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative w-full bg-[#111] px-6 py-24 md:px-12 md:py-32 flex flex-col items-center text-center reveal-on-scroll" style={{ transitionDelay: '200ms' }}>
        <h2 className="text-3xl md:text-5xl font-light tracking-tighter mb-8 text-white">
          Ready to optimize your harvest?
        </h2>
        <Link
          to="/signup"
          className="px-10 py-5 text-center uppercase tracking-widest text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-xl shadow-emerald-900/20"
        >
          Start using FarmPilot
        </Link>
        <Link
          to="/signin"
          className="mt-6 text-xs uppercase tracking-widest font-bold text-white/50 hover:text-white transition-colors underline underline-offset-4 decoration-white/20"
        >
          Just want to look around? Sign in with the demo account
        </Link>
      </section>

      {/* Simple Footer */}
      <footer className="w-full px-6 py-8 md:px-12 flex flex-col md:flex-row justify-between items-center border-t border-white/10 text-xs text-white/40 uppercase tracking-wider bg-black gap-4 md:gap-0">
        <p>© {new Date().getFullYear()} FarmPilot</p>
        <div className="flex space-x-6">
          <a href="https://github.com/itzSAD999/farmpilot" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}
