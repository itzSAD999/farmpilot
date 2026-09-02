import { useQuery } from "@tanstack/react-query";
import { getFarm } from "../api/farms";
import { useAuth } from "./useAuth";

/**
 * Farm hook — loads the authenticated user's farm.
 * Uses TanStack Query to manage fetching and caching.
 */
export function useFarm() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["farm", user?.id],
    queryFn: () => getFarm(user!.id),
    enabled: !!user, // Only fetch if we have an authenticated user
    retry: false, // Don't hang on the skeleton screen retrying if the request fails
  });

  // isLoading must be true any time we can't yet answer "does this user have a farm?"
  // — while auth hasn't resolved (!user)
  // — while the first fetch is in flight (query.isLoading, which is isPending + enabled)
  // — during a refetch when we have no cached data yet
  const isLoading =
    !user || query.isLoading || (query.isFetching && query.data === undefined);

  return {
    farm: query.data ?? null,
    isLoading,
    hasFarm: Boolean(query.data?.id),
    error: query.error,
    refetch: query.refetch,
  };
}
