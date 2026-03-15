import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import ActivitiesClient from './ActivitiesClient';

/**
 * Server component: prefetches the activities list on the server so the page
 * renders with data immediately (no loading spinner on first visit).
 *
 * The prefetched data is hydrated into the client QueryClient via
 * HydrationBoundary, so `useActivitiesControllerFindAll` inside
 * ActivitiesClient finds the cache already populated.
 *
 * Requires `npm run generate:api` to create `src/api/generated-server/`.
 */
export default async function ActivitiesPage() {
  const queryClient = getQueryClient();

  try {
    // Dynamic imports keep server-only code out of the client bundle.
    const [{ activitiesControllerFindAll }, { getActivitiesControllerFindAllQueryKey }] =
      await Promise.all([
        import('@/api/generated-server/activities/activities'),
        import('@/api/generated/activities/activities'),
      ]);

    await queryClient.prefetchQuery({
      queryKey: getActivitiesControllerFindAllQueryKey(),
      queryFn: () => activitiesControllerFindAll(),
    });
  } catch {
    // Prefetch is best-effort: the client will fetch on mount if it fails
    // (e.g., generated files not yet created, backend unreachable, or user
    // not authenticated).
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ActivitiesClient />
    </HydrationBoundary>
  );
}
