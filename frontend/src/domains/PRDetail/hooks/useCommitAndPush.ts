import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  postGenerateCommitMessageMutationOptions,
  postCommitAndPushMutationOptions,
} from '@/queries';
import type { CommitState } from '../components/ChatPanel';

export function useCommitAndPush(projectId: string | undefined) {
  const [commitState, setCommitState] = useState<CommitState>({
    isCommitting: false,
  });
  const { mutateAsync: generateMessage } = useMutation(
    postGenerateCommitMessageMutationOptions()
  );
  const { mutateAsync: commitAndPush } = useMutation(
    postCommitAndPushMutationOptions()
  );

  const handleCommitAndPush = async (push: boolean) => {
    if (!projectId) return;
    setCommitState({ isCommitting: true });
    try {
      const { message } = await generateMessage({
        projectId,
        body: {},
      });
      const result = await commitAndPush({
        projectId,
        body: { commitMessage: message, push },
      });
      setCommitState({ isCommitting: false, result });
    } catch (err) {
      setCommitState({
        isCommitting: false,
        result: {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        },
      });
    }
  };

  return { commitState, handleCommitAndPush };
}
