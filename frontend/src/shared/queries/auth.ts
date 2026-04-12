import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { apiGet, apiPost } from '../apis/client';
import type {
  GitHubAuthStatus,
  SwitchAccountBody,
} from '@lgtmai/backend/types';

export const getGithubStatusQueryOptions = () =>
  queryOptions({
    queryKey: ['auth', 'githubStatus'],
    queryFn: () => apiGet<GitHubAuthStatus>('/api/auth/github/status'),
  });

export const switchAccountMutationOptions = () =>
  mutationOptions({
    mutationFn: (data: SwitchAccountBody) =>
      apiPost<GitHubAuthStatus, SwitchAccountBody>(
        '/api/auth/github/switch',
        data
      ),
  });
