import { queryOptions } from '@tanstack/react-query';
import { apiGet } from '../client';
import { authQueryKey } from './queryKey';
import type { GitHubAuthStatus } from '@lgtmai/backend/types';

export const authQuery = {
  githubStatus: () =>
    queryOptions<GitHubAuthStatus>({
      queryKey: authQueryKey.githubStatus(),
      queryFn: () => apiGet<GitHubAuthStatus>('/api/auth/github/status'),
    }),
};
