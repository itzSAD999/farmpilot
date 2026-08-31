import { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Navigate } from 'react-router-dom';

interface PublicRouteProps {
  children: ReactNode;
}

/**
 * Redirects to the dashboard if a session already exists.
 * Used to wrap /signin and /signup so signed-in users can't reach them.
 */
export function PublicRoute({ children }: PublicRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-screen w-full bg-[#F4F7F6]" />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
