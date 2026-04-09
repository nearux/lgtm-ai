export const authQueryKey = {
  all: ['auth'] as const,
  githubStatuses: () => [...authQueryKey.all, 'githubStatus'] as const,
  githubStatus: () => [...authQueryKey.githubStatuses()] as const,
};
