import { QueryClient } from '@tanstack/react-query';

/**
 * Creates a new QueryClient with settings appropriate for SSR:
 * - `staleTime: 60 * 1000` so prefetched data is not immediately refetched
 *   on the first client render.
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Prefetched data stays fresh for 1 minute, avoiding an immediate
        // client-side refetch right after hydration.
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * Returns a `QueryClient` appropriate for the current environment:
 *
 * - **Server**: always returns a *new* instance so request data is never
 *   shared across concurrent server renders.
 * - **Browser**: returns a singleton so React Query's cache persists across
 *   re-renders and route navigations.
 */
export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server-side: fresh client per request.
    return makeQueryClient();
  }

  // Browser: reuse the singleton to preserve the cache.
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
