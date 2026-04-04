import { mutationOptions } from '@tanstack/react-query';
import { apiPost } from '../client';
import type {
  GitHubAuthStatus,
  SwitchAccountBody,
} from '@lgtmai/backend/types';

export const authMutation = {
  switchAccount: () =>
    mutationOptions<GitHubAuthStatus, Error, SwitchAccountBody>({
      mutationFn: (data) =>
        apiPost<GitHubAuthStatus, SwitchAccountBody>(
          '/api/auth/github/switch',
          data
        ),
    }),
};
