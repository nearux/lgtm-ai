import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getGithubStatus, postSwitchAccount } from '../apis';

export const getGithubStatusQueryOptions = () =>
  queryOptions({
    queryKey: ['auth', 'githubStatus'],
    queryFn: () => getGithubStatus(),
  });

export const postSwitchAccountMutationOptions = () =>
  mutationOptions({
    mutationFn: postSwitchAccount,
  });
