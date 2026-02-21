export const prsQueryKey = {
  all: (projectId: string) => ['projects', projectId, 'prs'] as const,
  detail: (projectId: string, prNumber: number) =>
    ['projects', projectId, 'prs', prNumber] as const,
};
