import { mutationOptions } from '@tanstack/react-query';
import { apiPost } from '../apis/client';
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
  push?: boolean;
}

export const generateCommitMessageMutationOptions = () =>
  mutationOptions({
    mutationFn: ({
      projectId,
      body,
    }: {
      projectId: string;
      body: GenerateCommitMessageBody;
    }) =>
      apiPost<CommitMessageResponse, GenerateCommitMessageBody>(
        `/api/projects/${projectId}/commit-message`,
        body
      ),
  });

export const commitAndPushMutationOptions = () =>
  mutationOptions({
    mutationFn: ({
      projectId,
      body,
    }: {
      projectId: string;
      body: CommitAndPushBody;
    }) =>
      apiPost<CommitAndPushResponse, CommitAndPushBody>(
        `/api/projects/${projectId}/commit-and-push`,
        body
      ),
  });
