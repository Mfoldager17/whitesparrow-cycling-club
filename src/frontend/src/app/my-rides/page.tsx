import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import MyRidesClient from './MyRidesClient';

/**
 * Server component: prefetches the current user's ride registrations so the
 * calendar renders with data immediately on first visit.
 *
 * Requires `npm run generate:api` to create `src/api/generated-server/`.
 */
export default async function MyRidesPage() {
  const queryClient = getQueryClient();

  try {
    const [
      { myRegistrationsControllerGetMyRegistrations },
      { getMyRegistrationsControllerGetMyRegistrationsQueryKey },
    ] = await Promise.all([
      import('@/api/generated-server/registrations/registrations'),
      import('@/api/generated/registrations/registrations'),
    ]);

    await queryClient.prefetchQuery({
      queryKey: getMyRegistrationsControllerGetMyRegistrationsQueryKey(),
      queryFn: () => myRegistrationsControllerGetMyRegistrations(),
    });
  } catch {
    // Best-effort: client fetches on mount if prefetch fails.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MyRidesClient />
    </HydrationBoundary>
  );
}
