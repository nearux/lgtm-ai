export const fsQueryKey = {
  all: ['fs'] as const,
  browse: (path?: string) => [...fsQueryKey.all, 'browse', path] as const,
};
