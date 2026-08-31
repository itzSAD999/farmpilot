import { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';

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
    <div className="min-h-screen bg-[#F4F7F6] flex flex-col md:flex-row font-sans">
      
      {/* Mobile Header */}
      <header className="md:hidden bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] z-20 relative">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#1B5E20] rounded-[10px] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <div className="font-bold text-gray-900 tracking-tight">FarmPilot</div>
          </div>
          <button
            onClick={signOut}
            className="text-sm font-bold text-[#1B5E20] px-3 py-2 rounded-xl bg-[#1B5E20]/10 hover:bg-[#1B5E20]/20 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white shadow-[4px_0_24px_rgb(0,0,0,0.02)] z-10 sticky top-0 h-screen overflow-y-auto">
        <div className="p-6 flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-[#1B5E20] rounded-xl flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
          </div>
          <span className="font-extrabold text-xl text-gray-900 tracking-tight">FarmPilot</span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Menu</div>
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
              className="w-full py-2 bg-white text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
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
    </div>
  );
}
