import { apiGet, apiPost } from './client';
import type {
  GitHubAuthStatus,
  SwitchAccountBody,
} from '@lgtmai/backend/types';

export const getGithubStatus = () =>
  apiGet<GitHubAuthStatus>('/api/auth/github/status');

export const postSwitchAccount = (data: SwitchAccountBody) =>
  apiPost<GitHubAuthStatus, SwitchAccountBody>('/api/auth/github/switch', data);
