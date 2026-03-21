import { useChatPanelSync } from '../../../hooks';
import { useChatPanel } from '../../../contexts';
import {
  buildPromptForAction,
  getExecutionMode,
  ACTION_LABELS,
} from '../../../utils/reviewPrompts';
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

      const prompt =
        customPrompt || buildPromptForAction(actionId, target, prNumber);
      const executionMode = getExecutionMode(actionId);

      const userMessage = ACTION_LABELS[actionId] || customPrompt || actionId;
      addUserMessage(userMessage);

      setMode('chat');
      execute(prompt, workingDir, { executionMode });
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
