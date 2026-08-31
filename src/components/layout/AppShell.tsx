import { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { PwaInstallPrompt } from './PwaInstallPrompt';
import { OfflineBanner } from './OfflineBanner';

interface AppShellProps {
  children: ReactNode;
}

/**
 * Application shell — header, navigation, sign-out.
 */
export function AppShell({ children }: AppShellProps) {
  const { user, profile, signOut } = useAuth();
  const displayName = (profile?.full_name as string) || user?.phone || 'Farmer';

  return (
    <div className="min-h-screen bg-[#F4F7F6] flex flex-col font-sans">
      <OfflineBanner />
      <div className="flex-1 flex flex-col md:flex-row">
      
      {/* Mobile Header */}
      <header className="md:hidden bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] z-20 relative">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/logo.png" alt="FarmPilot Logo" className="h-8 w-auto object-contain" />
          </div>
          <button
            onClick={signOut}
            className="min-h-[44px] min-w-[44px] text-sm font-bold text-[#1B5E20] px-3 py-2 rounded-xl bg-[#1B5E20]/10 hover:bg-[#1B5E20]/20 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white shadow-[4px_0_24px_rgb(0,0,0,0.02)] z-10 sticky top-0 h-screen overflow-y-auto">
        <div className="p-6 flex items-center mb-6">
          <img src="/logo.png" alt="FarmPilot Logo" className="h-10 w-auto object-contain" />
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Menu</div>
          <a href="/" className="flex items-center px-3 py-3 bg-[#1B5E20]/10 text-[#1B5E20] rounded-xl font-bold group">
            <svg className="w-5 h-5 mr-3 text-[#1B5E20]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Dashboard
          </a>
          {/* We can add more nav links here in the future (Calendar, Team, Settings) */}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-[#F4F7F6] rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#1B5E20] font-bold text-lg mb-2 shadow-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <p className="text-sm font-bold text-gray-900 truncate w-full">{displayName}</p>
            <p className="text-xs font-medium text-gray-500 mb-4">{user?.phone || 'Farmer'}</p>
            <button
              onClick={signOut}
              className="min-h-[44px] w-full py-2 bg-white text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
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
