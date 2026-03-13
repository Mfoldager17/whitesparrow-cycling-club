import { defineConfig } from 'orval';

export default defineConfig({
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
});
