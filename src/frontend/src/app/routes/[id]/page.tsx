import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import RouteDetailClient from './RouteDetailClient';

/**
 * Server component: prefetches the route detail so the map and route info
 * render with data immediately (no loading spinner on first visit).
 *
 * Requires `npm run generate:api` to create `src/api/generated-server/`.
 */
export default async function RouteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const queryClient = getQueryClient();

  try {
    const [{ routesControllerFindOne }, { getRoutesControllerFindOneQueryKey }] =
      await Promise.all([
        import('@/api/generated-server/routes/routes'),
        import('@/api/generated/routes/routes'),
      ]);

    await queryClient.prefetchQuery({
      queryKey: getRoutesControllerFindOneQueryKey(id),
      queryFn: () => routesControllerFindOne(id),
    });
  } catch {
    // Best-effort: client fetches on mount if prefetch fails.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RouteDetailClient />
    </HydrationBoundary>
  );
}
