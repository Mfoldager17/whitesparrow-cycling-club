import { defineConfig } from 'orval';

export default defineConfig({
  /**
   * Client-side output — React Query hooks used in 'use client' components.
   * Generated into: src/api/generated/
   */
  whitesparrow: {
    input: {
      target: 'http://localhost:3001/api/docs-json',
      validation: false,
    },
    output: {
      mode: 'tags-split',          // one file per Swagger tag
      target: 'src/api/generated',
      schemas: 'src/api/generated/models',
      client: 'react-query',
      httpClient: 'axios',
      override: {
        mutator: {
          path: 'src/api/axios-instance.ts',
          name: 'axiosInstance',
        },
        query: {
          useQuery: true,
          useMutation: true,
          signal: true,
        },
      },
    },
  },

  /**
   * Server-side output — plain async query functions usable in Next.js server
   * components and for prefetching with HydrationBoundary.
   * Generated into: src/api/generated-server/
   *
   * Usage in a server component page:
   *   import { activitiesControllerFindAll } from '@/api/generated-server/activities/activities';
   *   import { getActivitiesControllerFindAllQueryKey } from '@/api/generated/activities/activities';
   *   import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
   *   import { getQueryClient } from '@/lib/query-client';
   *
   *   export default async function Page() {
   *     const queryClient = getQueryClient();
   *     await queryClient.prefetchQuery({
   *       queryKey: getActivitiesControllerFindAllQueryKey(),
   *       queryFn: () => activitiesControllerFindAll(),
   *     });
   *     return (
   *       <HydrationBoundary state={dehydrate(queryClient)}>
   *         <ActivitiesClient />
   *       </HydrationBoundary>
   *     );
   *   }
   */
  whitesparrow_server: {
    input: {
      target: 'http://localhost:3001/api/docs-json',
      validation: false,
    },
    output: {
      mode: 'tags-split',
      target: 'src/api/generated-server',
      schemas: 'src/api/generated/models',  // reuse shared model types
      client: 'fetch',
      override: {
        mutator: {
          path: 'src/api/server-fetch.ts',
          name: 'serverFetch',
        },
      },
    },
  },
});
