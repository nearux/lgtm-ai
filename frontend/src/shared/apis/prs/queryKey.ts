export const prsQueryKey = {
  all: (projectId: string, origin?: string) =>
    ['projects', projectId, 'prs', ...(origin ? [origin] : [])] as const,
  detail: (projectId: string, prNumber: number) =>
    ['projects', projectId, 'prs', prNumber] as const,
};
