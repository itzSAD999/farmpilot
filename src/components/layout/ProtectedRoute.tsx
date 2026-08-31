import { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useFarm } from '../../hooks/useFarm';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Redirects to sign-in when no session exists (FR-1.9).
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const { isLoading: farmLoading, hasFarm } = useFarm();

  const LoadingSkeleton = () => (
    <div className="flex h-screen w-full bg-[#F4F7F6] dark:bg-[#0c1210] flex-col md:flex-row animate-pulse">
      {/* Sidebar Skeleton (desktop) */}
      <div className="hidden md:flex flex-col w-64 bg-white dark:bg-[#141c19] p-6 border-r border-gray-100 dark:border-white/5">
        <div className="w-32 h-8 bg-gray-200 dark:bg-white/10 rounded-lg mb-10"></div>
        <div className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl mb-4"></div>
        <div className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl mb-4"></div>
      </div>
      
      {/* Main Content Skeleton */}
      <div className="flex-1 p-6 md:p-12">
        <div className="w-48 h-10 bg-gray-200 dark:bg-white/10 rounded-lg mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-40 bg-white dark:bg-[#1c2622] rounded-[24px] border border-gray-100 dark:border-white/10"></div>
          <div className="h-40 bg-white dark:bg-[#1c2622] rounded-[24px] border border-gray-100 dark:border-white/10"></div>
          <div className="h-40 bg-white dark:bg-[#1c2622] rounded-[24px] border border-gray-100 dark:border-white/10"></div>
        </div>
      </div>
    </div>
  );

  if (authLoading) {
    return <LoadingSkeleton />;
  }

  if (!user) {
    return <Navigate to="/welcome" state={{ from: location }} replace />;
  }

  // Wait for farm check to resolve before routing
  if (farmLoading) {
    return <LoadingSkeleton />;
  }

  const isSetupRoute = location.pathname === '/farm/setup';
  const setupInProgress = typeof window !== 'undefined'
    && sessionStorage.getItem('farm-setup-in-progress') === '1';

  // The Gate: New users must set up a farm.
  if (!hasFarm && !isSetupRoute) {
    return <Navigate to="/farm/setup" replace />;
  }

  // Existing users shouldn't see the setup screen — unless they are
  // already filling it in. Never bounce an in-progress setup to home.
  if (hasFarm && isSetupRoute && !setupInProgress) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
