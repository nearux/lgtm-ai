import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { gitMutation } from '@/shared/apis';
import type { CommitState } from '../components/ChatPanel';

export function useCommitAndPush(projectId: string | undefined) {
  const [commitState, setCommitState] = useState<CommitState>({
    isCommitting: false,
  });
  const { mutateAsync: generateMessage } = useMutation(
    gitMutation.generateCommitMessage()
  );
  const { mutateAsync: commitAndPush } = useMutation(
    gitMutation.commitAndPush()
  );

  const handleCommitAndPush = async () => {
    if (!projectId) return;
    setCommitState({ isCommitting: true });
    try {
      const { message } = await generateMessage({
        projectId,
        body: {},
      });
      const result = await commitAndPush({
        projectId,
        body: { commitMessage: message },
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
