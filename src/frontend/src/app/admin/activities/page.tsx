import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import AdminActivitiesClient from './AdminActivitiesClient';

/**
 * Server component: prefetches all activities (including past and cancelled)
 * for the admin activities management page.
 *
 * Requires `npm run generate:api` to create `src/api/generated-server/`.
 */
export default async function AdminActivitiesPage() {
  const queryClient = getQueryClient();

  try {
    const [{ activitiesControllerFindAll }, { getActivitiesControllerFindAllQueryKey }] =
      await Promise.all([
        import('@/api/generated-server/activities/activities'),
        import('@/api/generated/activities/activities'),
      ]);

    await queryClient.prefetchQuery({
      queryKey: getActivitiesControllerFindAllQueryKey({ includePast: true, includeCancelled: true }),
      queryFn: () => activitiesControllerFindAll({ includePast: true, includeCancelled: true }),
    });
  } catch {
    // Best-effort: client fetches on mount if prefetch fails.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AdminActivitiesClient />
    </HydrationBoundary>
  );
}
