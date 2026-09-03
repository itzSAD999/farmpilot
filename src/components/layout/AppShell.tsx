import { useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { getProfile } from '../../api/auth';
import { useTheme } from '../../hooks/useTheme';
import { Link, useLocation } from 'react-router-dom';
import { PwaInstallPrompt } from './PwaInstallPrompt';
import { OfflineBanner } from './OfflineBanner';
import { NotificationDropdown } from './NotificationDropdown';
import { FarmBot } from '../domain/FarmBot';

interface AppShellProps {
  children: ReactNode;
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-gray-50 dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
    >
      {isDark ? (
        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

/**
 * Application shell — header, navigation, sign-out.
 */
export function AppShell({ children }: AppShellProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const { data: profile } = useQuery({ queryKey: ['profile', user?.id], queryFn: getProfile, enabled: !!user?.id });
  const displayName = (profile?.full_name as string) || user?.phone || 'Farmer';

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    // exact match for profile so it doesn't accidentally highlight elsewhere
    if (path === '/profile') return location.pathname === '/profile';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#F4F7F6] dark:bg-[#0a0a0a] flex flex-col font-sans">
      <OfflineBanner />
      <div className="flex-1 flex flex-col md:flex-row">
      
      {/* Mobile Header */}
      <header className="print-hide md:hidden bg-white dark:bg-[#0a0a0a] shadow-[0_4px_20px_rgb(0,0,0,0.03)] z-20 relative border-b border-transparent dark:border-white/5">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/logo.png" alt="FarmPilot Logo" className="h-8 w-auto object-contain" />
          </div>
          <div className="flex space-x-2 items-center">
            <ThemeToggle />
            <NotificationDropdown />
            <Link
              to="/profile"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-800 dark:text-gray-100 rounded-xl bg-gray-50 dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/15 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </Link>
            <button
              onClick={signOut}
              title="Sign Out"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#1B5E20] dark:text-emerald-400 rounded-xl bg-[#1B5E20]/10 hover:bg-[#1B5E20]/20 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className={`print-hide hidden md:flex flex-col bg-white dark:bg-[#0a0a0a] shadow-[4px_0_24px_rgb(0,0,0,0.02)] z-10 sticky top-0 h-screen overflow-y-auto border-r border-transparent dark:border-white/5 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className={`p-4 flex items-center mb-6 relative ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && <img src="/logo.png" alt="FarmPilot Logo" className="h-8 w-auto object-contain" />}
          {isCollapsed && <img src="/icon.png" alt="FP" className="h-8 w-auto object-contain" onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }} />}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 rounded-lg transition-all ${isCollapsed ? 'absolute -right-3 top-1/2 -translate-y-1/2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 shadow-sm opacity-0 group-hover:opacity-100 md:opacity-100 z-20' : ''}`}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <svg className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {!isCollapsed && <div className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Menu</div>}
          
          <Link to="/" title={isCollapsed ? "Dashboard" : undefined} className={`flex items-center px-3 py-3 rounded-xl font-bold group transition-colors ${isCollapsed ? 'justify-center' : ''} ${isActive('/') ? 'bg-[#1B5E20]/10 text-[#1B5E20] dark:text-emerald-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
            <svg className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} ${isActive('/') ? 'text-[#1B5E20] dark:text-emerald-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            {!isCollapsed && <span>Dashboard</span>}
          </Link>
          
          <Link to="/seasons" title={isCollapsed ? "Seasons" : undefined} className={`flex items-center px-3 py-3 rounded-xl font-bold group transition-colors ${isCollapsed ? 'justify-center' : ''} ${isActive('/seasons') ? 'bg-[#1B5E20]/10 text-[#1B5E20] dark:text-emerald-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
            <svg className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} ${isActive('/seasons') ? 'text-[#1B5E20] dark:text-emerald-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {!isCollapsed && <span>Seasons</span>}
          </Link>
          
          <Link to="/costs" title={isCollapsed ? "Costs" : undefined} className={`flex items-center px-3 py-3 rounded-xl font-bold group transition-colors ${isCollapsed ? 'justify-center' : ''} ${isActive('/costs') ? 'bg-[#1B5E20]/10 text-[#1B5E20] dark:text-emerald-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
            <svg className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} ${isActive('/costs') ? 'text-[#1B5E20] dark:text-emerald-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {!isCollapsed && <span>Costs</span>}
          </Link>
          
          <Link to="/guides" title={isCollapsed ? "Guides" : undefined} className={`flex items-center px-3 py-3 rounded-xl font-bold group transition-colors ${isCollapsed ? 'justify-center' : ''} ${isActive('/guides') ? 'bg-[#1B5E20]/10 text-[#1B5E20] dark:text-emerald-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
            <svg className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} ${isActive('/guides') ? 'text-[#1B5E20] dark:text-emerald-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {!isCollapsed && <span>Guides</span>}
          </Link>

          <Link to="/compare" title={isCollapsed ? "Compare" : undefined} className={`flex items-center px-3 py-3 rounded-xl font-bold group transition-colors ${isCollapsed ? 'justify-center' : ''} ${isActive('/compare') ? 'bg-[#1B5E20]/10 text-[#1B5E20] dark:text-emerald-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
            <svg className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} ${isActive('/compare') ? 'text-[#1B5E20] dark:text-emerald-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {!isCollapsed && <span>Compare</span>}
          </Link>

          <Link to="/lab" title={isCollapsed ? "Lab" : undefined} className={`flex items-center px-3 py-3 rounded-xl font-bold group transition-colors ${isCollapsed ? 'justify-center' : ''} ${isActive('/lab') ? 'bg-[#1B5E20]/10 text-[#1B5E20] dark:text-emerald-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
            <svg className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} ${isActive('/lab') ? 'text-[#1B5E20] dark:text-emerald-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.75 3v4.5m4.5-4.5v4.5m-8.5 0h12.5l-2.056 8.223A3 3 0 0113.278 18h-2.556a3 3 0 01-2.916-2.277L5.75 7.5z" />
            </svg>
            {!isCollapsed && <span>Lab</span>}
            {!isCollapsed && <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">New</span>}
          </Link>

          <Link to="/budgets" title={isCollapsed ? "Budgets" : undefined} className={`flex items-center px-3 py-3 rounded-xl font-bold group transition-colors ${isCollapsed ? 'justify-center' : ''} ${isActive('/budgets') ? 'bg-[#1B5E20]/10 text-[#1B5E20] dark:text-emerald-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
            <svg className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} ${isActive('/budgets') ? 'text-[#1B5E20] dark:text-emerald-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 7h6m-6 4h6m-6 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
            </svg>
            {!isCollapsed && <span>Budgets</span>}
          </Link>

        </nav>

        <div className="p-4 mt-auto border-t border-gray-100 dark:border-white/5">
          {isCollapsed ? (
            <div className="flex flex-col gap-3 items-center">
              <Link
                to="/profile"
                title="Settings"
                className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-white/10 rounded-xl transition-colors mt-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
              <button
                onClick={signOut}
                title="Sign Out"
                className="w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors mt-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="bg-[#F4F7F6] dark:bg-[#151515] rounded-2xl p-4 flex flex-col w-full shadow-sm border border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 shrink-0 bg-white dark:bg-white/10 rounded-full flex items-center justify-center text-[#1B5E20] dark:text-emerald-400 font-bold text-base shadow-sm">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate w-full">{displayName}</p>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate w-full">{user?.phone || 'Farmer'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  to="/profile"
                  className="flex-1 min-h-[40px] flex items-center justify-center gap-2 bg-white dark:bg-white/10 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-xl hover:bg-gray-50 dark:hover:bg-white/20 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4 text-[#1B5E20] dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Settings
                </Link>
                <button
                  onClick={signOut}
                  className="flex-1 min-h-[40px] flex items-center justify-center gap-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-xs rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Log Out
                </button>
              </div>
            </div>
          )}
          
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 overflow-y-auto mb-16 md:mb-0 relative flex flex-col">
        <div className="print-hide hidden md:flex justify-end mb-6 w-full shrink-0 relative z-40">
          <div className="flex items-center gap-3 bg-white/80 dark:bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-sm">
            <ThemeToggle />
            <NotificationDropdown align="right" />
          </div>
        </div>
        {children}
        <FarmBot />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="print-hide md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#121212] border-t border-gray-200 dark:border-white/5 pb-safe z-30">
        <div className="flex items-center justify-around h-16 px-2">
          <Link to="/" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/') ? 'text-[#1B5E20] dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive('/') ? 2.5 : 2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="text-[10px] font-bold">Home</span>
          </Link>
          <Link to="/seasons" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/seasons') ? 'text-[#1B5E20] dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive('/seasons') ? 2.5 : 2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px] font-bold">Seasons</span>
          </Link>
          <Link to="/compare" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/compare') ? 'text-[#1B5E20] dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive('/compare') ? 2.5 : 2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-[10px] font-bold">Compare</span>
          </Link>
          <Link to="/guides" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/guides') ? 'text-[#1B5E20] dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive('/guides') ? 2.5 : 2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-[10px] font-bold">Guides</span>
          </Link>
          <Link to="/profile" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/profile') ? 'text-[#1B5E20] dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive('/profile') ? 2.5 : 2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[10px] font-bold">Profile</span>
          </Link>
        </div>
      </nav>
      
      <PwaInstallPrompt />
      </div>
    </div>
  );
}
