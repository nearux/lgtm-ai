import { apiPost } from './client';
import type {
  CommitMessageResponse,
  CommitAndPushResponse,
} from '@lgtmai/backend/types';

export interface GenerateCommitMessageBody {
  prContext?: {
    title: string;
    body: string;
    reviewComment: string;
  };
}

export interface CommitAndPushBody {
  commitMessage: string;
  push?: boolean;
}

export const postGenerateCommitMessage = (
  projectId: string,
  body: GenerateCommitMessageBody
) =>
  apiPost<CommitMessageResponse, GenerateCommitMessageBody>(
    `/api/projects/${projectId}/commit-message`,
    body
  );

export const postCommitAndPush = (projectId: string, body: CommitAndPushBody) =>
  apiPost<CommitAndPushResponse, CommitAndPushBody>(
    `/api/projects/${projectId}/commit-and-push`,
    body
  );
