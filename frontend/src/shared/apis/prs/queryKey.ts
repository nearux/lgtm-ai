import type { PRState } from '@lgtmai/backend/types';

export const prsQueryKey = {
  all: ['prs'] as const,
  lists: () => [...prsQueryKey.all, 'list'] as const,
  list: (
    projectId: string,
    params?: { state: PRState; page: number; limit: number; origin?: string }
  ) => [...prsQueryKey.lists(), projectId, params ?? {}] as const,
  details: () => [...prsQueryKey.all, 'detail'] as const,
  detail: (projectId: string, prNumber: number, origin?: string) =>
    [
      ...prsQueryKey.details(),
      projectId,
      prNumber,
      ...(origin ? [origin] : []),
    ] as const,
};
