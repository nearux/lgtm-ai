import type { PRState } from '@lgtmai/backend/types';

export const prsQueryKey = {
  all: (
    projectId: string,
    params?: {
      state: PRState;
      page: number;
      limit: number;
    }
  ) => ['projects', projectId, 'prs', params ?? {}] as const,
  detail: (projectId: string, prNumber: number) =>
    ['projects', projectId, 'prs', prNumber] as const,
};
