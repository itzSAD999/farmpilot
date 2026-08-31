import { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Link } from 'react-router-dom';
import { PwaInstallPrompt } from './PwaInstallPrompt';
import { OfflineBanner } from './OfflineBanner';
import { NotificationDropdown } from './NotificationDropdown';

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
      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 dark:text-gray-300 rounded-xl bg-gray-50 dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/15 transition-colors"
    >
      {isDark ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  const { user, profile, signOut } = useAuth();
  const displayName = (profile?.full_name as string) || user?.phone || 'Farmer';

  return (
    <div className="min-h-screen bg-[#F4F7F6] dark:bg-[#0c1210] flex flex-col font-sans">
      <OfflineBanner />
      <div className="flex-1 flex flex-col md:flex-row">
      
      {/* Mobile Header */}
      <header className="md:hidden bg-white dark:bg-[#141c19] shadow-[0_4px_20px_rgb(0,0,0,0.03)] z-20 relative border-b border-transparent dark:border-white/5">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/logo.png" alt="FarmPilot Logo" className="h-8 w-auto object-contain" />
          </div>
          <div className="flex space-x-2 items-center">
            <ThemeToggle />
            <NotificationDropdown />
            <Link
              to="/profile"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 dark:text-gray-300 rounded-xl bg-gray-50 dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/15 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </Link>
            <button
              onClick={signOut}
              className="min-h-[44px] min-w-[44px] text-sm font-bold text-[#1B5E20] dark:text-emerald-400 px-3 py-2 rounded-xl bg-[#1B5E20]/10 hover:bg-[#1B5E20]/20 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-[#141c19] shadow-[4px_0_24px_rgb(0,0,0,0.02)] z-10 sticky top-0 h-screen overflow-y-auto border-r border-transparent dark:border-white/5">
        <div className="p-6 flex items-center justify-between mb-6">
          <img src="/logo.png" alt="FarmPilot Logo" className="h-10 w-auto object-contain" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationDropdown />
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <div className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Menu</div>
          <Link to="/" className="flex items-center px-3 py-3 bg-[#1B5E20]/10 text-[#1B5E20] dark:text-emerald-400 rounded-xl font-bold group">
            <svg className="w-5 h-5 mr-3 text-[#1B5E20] dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Dashboard
          </Link>
          <Link to="/profile" className="flex items-center px-3 py-3 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
            <svg className="w-5 h-5 mr-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Profile
          </Link>
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-[#F4F7F6] dark:bg-white/5 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-white dark:bg-[#1c2622] rounded-full flex items-center justify-center text-[#1B5E20] dark:text-emerald-400 font-bold text-lg mb-2 shadow-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate w-full">{displayName}</p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4">{user?.phone || 'Farmer'}</p>
            <button
              onClick={signOut}
              className="min-h-[44px] w-full py-2 bg-white dark:bg-[#1c2622] text-gray-700 dark:text-gray-200 font-bold text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 transition-colors shadow-sm"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {children}
      </main>
      
      <PwaInstallPrompt />
      </div>
    </div>
  );
}
