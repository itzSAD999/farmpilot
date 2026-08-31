import { useQuery } from '@tanstack/react-query';
import { getFarm } from '../api/farms';
import { useAuth } from './useAuth';

/**
 * Farm hook — loads the authenticated user's farm.
 * Uses TanStack Query to manage fetching and caching.
 */
export function useFarm() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['farm', user?.id],
    queryFn: getFarm,
    enabled: !!user, // Only fetch if we have an authenticated user
    retry: false, // Don't hang on the skeleton screen retrying if the request fails
  });

  return { 
    farm: query.data ?? null, 
    isLoading: query.isLoading,
    hasFarm: !!query.data,
    error: query.error, 
    refetch: query.refetch 
  };
}
