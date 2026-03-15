import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import AdminUsersClient from './AdminUsersClient';

/**
 * Server component: prefetches the full member list for the admin users page.
 *
 * Requires `npm run generate:api` to create `src/api/generated-server/`.
 */
export default async function AdminUsersPage() {
  const queryClient = getQueryClient();

  try {
    const [{ usersControllerFindAll }, { getUsersControllerFindAllQueryKey }] =
      await Promise.all([
        import('@/api/generated-server/users/users'),
        import('@/api/generated/users/users'),
      ]);

    await queryClient.prefetchQuery({
      queryKey: getUsersControllerFindAllQueryKey(),
      queryFn: () => usersControllerFindAll(),
    });
  } catch {
    // Best-effort: client fetches on mount if prefetch fails.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AdminUsersClient />
    </HydrationBoundary>
  );
}
