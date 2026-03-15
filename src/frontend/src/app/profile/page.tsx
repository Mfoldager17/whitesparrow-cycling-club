import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import ProfileClient from './ProfileClient';

/**
 * Server component: prefetches the current user's profile so the form is
 * pre-populated without a loading state.
 *
 * Requires `npm run generate:api` to create `src/api/generated-server/`.
 */
export default async function ProfilePage() {
  const queryClient = getQueryClient();

  try {
    const [{ usersControllerGetMe }, { getUsersControllerGetMeQueryKey }] = await Promise.all([
      import('@/api/generated-server/users/users'),
      import('@/api/generated/users/users'),
    ]);

    await queryClient.prefetchQuery({
      queryKey: getUsersControllerGetMeQueryKey(),
      queryFn: () => usersControllerGetMe(),
    });
  } catch {
    // Best-effort: client fetches on mount if prefetch fails.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProfileClient />
    </HydrationBoundary>
  );
}
