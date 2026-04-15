import { mutationOptions } from '@tanstack/react-query';
import { postGenerateCommitMessage, postCommitAndPush } from '../apis';
import type { GenerateCommitMessageBody, CommitAndPushBody } from '../apis/git';

export const postGenerateCommitMessageMutationOptions = () =>
  mutationOptions({
    mutationFn: ({
      projectId,
      body,
    }: {
      projectId: string;
      body: GenerateCommitMessageBody;
    }) => postGenerateCommitMessage(projectId, body),
  });

export const postCommitAndPushMutationOptions = () =>
  mutationOptions({
    mutationFn: ({
      projectId,
      body,
    }: {
      projectId: string;
      body: CommitAndPushBody;
    }) => postCommitAndPush(projectId, body),
  });
