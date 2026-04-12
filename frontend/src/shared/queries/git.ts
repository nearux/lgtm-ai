import { mutationOptions } from '@tanstack/react-query';
import { generateCommitMessage, commitAndPush } from '../apis';
import type { GenerateCommitMessageBody, CommitAndPushBody } from '../apis';

export const generateCommitMessageMutationOptions = () =>
  mutationOptions({
    mutationFn: ({
      projectId,
      body,
    }: {
      projectId: string;
      body: GenerateCommitMessageBody;
    }) => generateCommitMessage(projectId, body),
  });

export const commitAndPushMutationOptions = () =>
  mutationOptions({
    mutationFn: ({
      projectId,
      body,
    }: {
      projectId: string;
      body: CommitAndPushBody;
    }) => commitAndPush(projectId, body),
  });
