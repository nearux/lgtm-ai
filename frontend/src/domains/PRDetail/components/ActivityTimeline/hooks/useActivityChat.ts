import { useChatPanelSync, useChatPanelParams } from '../../../hooks';
import { useChatPanel } from '../../../contexts';
import { ACTION_LABELS } from '../../../utils/reviewPrompts';
import type { PRMeta, ClaudeChatContext } from '@lgtmai/backend/types';
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
  diffHunk?: string;
}

interface UseActivityChatOptions {
  workingDir: string;
  projectId: string;
  prNumber: number;
  prMeta: PRMeta;
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
  prMeta,
  setValidations,
  setActiveTarget,
}: UseActivityChatOptions) {
  const { setTargetContext, setOnExecuteAction } = useChatPanel();
  const { openActionSelector, openChat } = useChatPanelParams();
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

      openChat();
      execute(
        {
          type: 'command',
          command: actionId as 'validate' | 'fix' | 'explain' | 'custom',
          context: {
            type: target.type,
            author: target.author,
            body: target.body,
            ...(target.path ? { path: target.path } : {}),
            ...(target.diffHunk ? { diffHunk: target.diffHunk } : {}),
            prMeta,
          },
          ...(customPrompt ? { customPrompt } : {}),
        },
        workingDir,
        { executionMode: 'bypassPermissions' },
        chatContext
      );
    });

    openActionSelector(target.type, target.id);
  };

  return { handleOpenChat, messages };
}
