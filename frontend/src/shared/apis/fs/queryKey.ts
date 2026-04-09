export const fsQueryKey = {
  all: ['fs'] as const,
  browses: () => [...fsQueryKey.all, 'browse'] as const,
  browse: (path?: string) => [...fsQueryKey.browses(), path] as const,
};
