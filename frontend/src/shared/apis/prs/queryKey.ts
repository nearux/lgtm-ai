export const prsQueryKey = {
  all: (projectId: string, origin?: string) =>
    ['projects', projectId, 'prs', ...(origin ? [origin] : [])] as const,
  detail: (projectId: string, prNumber: number, origin?: string) =>
    [
      'projects',
      projectId,
      'prs',
      prNumber,
      ...(origin ? [origin] : []),
    ] as const,
};
