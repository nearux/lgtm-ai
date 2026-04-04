import type { PRState } from '@lgtmai/backend/types';

export const prsQueryKey = {
  all: (
    projectId: string,
    params?: { state: PRState; page: number; limit: number; origin?: string }
  ) => ['projects', projectId, 'prs', params ?? {}] as const,
  detail: (projectId: string, prNumber: number, origin?: string) =>
    [
      'projects',
      projectId,
      'prs',
      prNumber,
      ...(origin ? [origin] : []),
    ] as const,
};
