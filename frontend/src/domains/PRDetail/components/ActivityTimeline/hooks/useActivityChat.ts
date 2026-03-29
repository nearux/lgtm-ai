import { useChatPanelSync } from '../../../hooks';
import { useChatPanel } from '../../../contexts';
import { ACTION_LABELS } from '../../../utils/reviewPrompts';
import type { ClaudeChatContext } from '@lgtmai/backend/types';
import type { ValidationStatus } from '../../ReviewList/components';

export interface ValidationState {
  status: ValidationStatus;
  result?: string;
}

export interface ValidationTarget {
  type: 'review' | 'comment';
  id: string;
  body: string;
  author: string;
  path?: string;
}

interface UseActivityChatOptions {
  workingDir: string;
  projectId: string;
  prNumber: number;
  setValidations: React.Dispatch<
    React.SetStateAction<Record<string, ValidationState>>
  >;
  setActiveTarget: React.Dispatch<
    React.SetStateAction<ValidationTarget | null>
  >;
}

export function useActivityChat({
  workingDir,
  projectId,
  prNumber,
  setValidations,
  setActiveTarget,
}: UseActivityChatOptions) {
  const { openPanel, setMode, setTargetContext, setOnExecuteAction } =
    useChatPanel();
  const {
    status: wsStatus,
    messages,
    connect,
    execute,
    clearMessages,
    addUserMessage,
  } = useChatPanelSync(workingDir);

  const handleOpenChat = (target: ValidationTarget) => {
    if (wsStatus !== 'connected') {
      connect();
    }
    setActiveTarget(target);
    clearMessages();

    setTargetContext({
      type: target.type === 'review' ? 'review' : 'inline',
      author: target.author,
      body: target.body,
      path: target.path,
      prNumber,
    });

    setOnExecuteAction((actionId: string, customPrompt?: string) => {
      setValidations((prev) => ({
        ...prev,
        [target.id]: { status: 'validating' },
      }));

      const userMessage = ACTION_LABELS[actionId] || customPrompt || actionId;
      addUserMessage(userMessage);

      const chatContext: ClaudeChatContext = {
        projectId,
        prNumber,
        scopeType: target.type === 'review' ? 'REVIEW' : 'COMMENT',
        scopeTargetId: target.id,
        title: userMessage,
      };

      setMode('chat');
      execute(
        {
          type: 'command',
          command: actionId as 'validate' | 'fix' | 'explain' | 'custom',
          context: {
            type: target.type,
            author: target.author,
            body: target.body,
            ...(target.path ? { path: target.path } : {}),
            prNumber,
          },
          ...(customPrompt ? { customPrompt } : {}),
        },
        workingDir,
        { executionMode: 'bypassPermissions' },
        chatContext
      );
    });

    setMode('action-selection');
    openPanel(
      target.type === 'review'
        ? `Chat: ${target.author}'s review`
        : `Chat: ${target.author}'s comment`
    );
  };

  return { handleOpenChat, messages };
}
