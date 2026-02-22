import {
  matchQuery,
  MutationCache,
  QueryClient,
  type DefaultOptions,
  type QueryKey,
} from '@tanstack/react-query';

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      invalidates?: Array<QueryKey>;
      errorMessage?: string;
    };
  }
}

interface GetQueryClientOptions {
  queries?: DefaultOptions['queries'];
}

let queryClientInstance: QueryClient | null = null;

export function getQueryClient({ queries }: GetQueryClientOptions = {}) {
  if (queryClientInstance) {
    return queryClientInstance;
  }

  queryClientInstance = new QueryClient({
    defaultOptions: {
      queries: queries || {
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60,
        retry: false,
        throwOnError: true,
      },
    },
    mutationCache: new MutationCache({
      onSuccess: (_data, _variables, _context, mutation) => {
        queryClientInstance!.invalidateQueries({
          predicate: (query) =>
            mutation.meta?.invalidates?.some((queryKey) =>
              matchQuery({ queryKey }, query)
            ) || false,
        });
      },
    }),
  });

  return queryClientInstance;
}
