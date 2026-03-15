import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import RoutesClient from './RoutesClient';

/**
 * Server component: prefetches the saved routes list on the server.
 *
 * Requires `npm run generate:api` to create `src/api/generated-server/`.
 */
export default async function RoutesPage() {
  const queryClient = getQueryClient();

  try {
    const [{ routesControllerFindAll }, { getRoutesControllerFindAllQueryKey }] =
      await Promise.all([
        import('@/api/generated-server/routes/routes'),
        import('@/api/generated/routes/routes'),
      ]);

    await queryClient.prefetchQuery({
      queryKey: getRoutesControllerFindAllQueryKey(),
      queryFn: () => routesControllerFindAll(),
    });
  } catch {
    // Best-effort: client fetches on mount if prefetch fails.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RoutesClient />
    </HydrationBoundary>
  );
}
