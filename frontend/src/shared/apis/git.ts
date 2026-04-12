import { apiPost } from './client';
import type {
  CommitMessageResponse,
  CommitAndPushResponse,
} from '@lgtmai/backend/types';

export type { CommitMessageResponse, CommitAndPushResponse };

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

export const generateCommitMessage = (
  projectId: string,
  body: GenerateCommitMessageBody
) =>
  apiPost<CommitMessageResponse, GenerateCommitMessageBody>(
    `/api/projects/${projectId}/commit-message`,
    body
  );

export const commitAndPush = (projectId: string, body: CommitAndPushBody) =>
  apiPost<CommitAndPushResponse, CommitAndPushBody>(
    `/api/projects/${projectId}/commit-and-push`,
    body
  );
