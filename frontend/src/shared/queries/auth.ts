import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getGithubStatus, switchAccount } from '../apis';

export const getGithubStatusQueryOptions = () =>
  queryOptions({
    queryKey: ['auth', 'githubStatus'],
    queryFn: () => getGithubStatus(),
  });

export const switchAccountMutationOptions = () =>
  mutationOptions({
    mutationFn: switchAccount,
  });
