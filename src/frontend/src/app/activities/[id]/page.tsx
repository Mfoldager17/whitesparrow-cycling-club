import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import ActivityDetailClient from './ActivityDetailClient';

/**
 * Server component: prefetches the activity detail, comments, registrations,
 * and saved routes list so the page renders with data immediately.
 *
 * Requires `npm run generate:api` to create `src/api/generated-server/`.
 */
export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const queryClient = getQueryClient();

  try {
    const [
      { activitiesControllerFindOne },
      { getActivitiesControllerFindOneQueryKey },
      { commentsControllerGetForActivity },
      { getCommentsControllerGetForActivityQueryKey },
      { registrationsControllerGetForActivity },
      { getRegistrationsControllerGetForActivityQueryKey },
      { routesControllerFindAll },
      { getRoutesControllerFindAllQueryKey },
    ] = await Promise.all([
      import('@/api/generated-server/activities/activities'),
      import('@/api/generated/activities/activities'),
      import('@/api/generated-server/comments/comments'),
      import('@/api/generated/comments/comments'),
      import('@/api/generated-server/registrations/registrations'),
      import('@/api/generated/registrations/registrations'),
      import('@/api/generated-server/routes/routes'),
      import('@/api/generated/routes/routes'),
    ]);

    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: getActivitiesControllerFindOneQueryKey(id),
        queryFn: () => activitiesControllerFindOne(id),
      }),
      queryClient.prefetchQuery({
        queryKey: getCommentsControllerGetForActivityQueryKey(id),
        queryFn: () => commentsControllerGetForActivity(id),
      }),
      queryClient.prefetchQuery({
        queryKey: getRegistrationsControllerGetForActivityQueryKey(id),
        queryFn: () => registrationsControllerGetForActivity(id),
      }),
      queryClient.prefetchQuery({
        queryKey: getRoutesControllerFindAllQueryKey(),
        queryFn: () => routesControllerFindAll(),
      }),
    ]);
  } catch {
    // Best-effort: client fetches on mount if prefetch fails.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ActivityDetailClient />
    </HydrationBoundary>
  );
}
