import { mutationOptions } from '@tanstack/react-query';
import { apiPost } from '../client';
import type {
  CommitMessageResponse,
  CommitAndPushResponse,
} from '@lgtmai/backend/types';

interface GenerateCommitMessageBody {
  prContext?: {
    title: string;
    body: string;
    reviewComment: string;
  };
}

interface CommitAndPushBody {
  commitMessage: string;
}

export const gitMutation = {
  generateCommitMessage: () =>
    mutationOptions<
      CommitMessageResponse,
      Error,
      { projectId: string; body: GenerateCommitMessageBody }
    >({
      mutationFn: ({ projectId, body }) =>
        apiPost<CommitMessageResponse, GenerateCommitMessageBody>(
          `/api/projects/${projectId}/commit-message`,
          body
        ),
    }),

  commitAndPush: () =>
    mutationOptions<
      CommitAndPushResponse,
      Error,
      { projectId: string; body: CommitAndPushBody }
    >({
      mutationFn: ({ projectId, body }) =>
        apiPost<CommitAndPushResponse, CommitAndPushBody>(
          `/api/projects/${projectId}/commit-and-push`,
          body
        ),
    }),
};
