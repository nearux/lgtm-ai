import { useMutation } from '@tanstack/react-query';
import { useChatPanelSync, useChatPanelParams } from '../../../hooks';
import { useChatPanel } from '../../../contexts';
import { ACTION_LABELS } from '../../../utils/reviewPrompts';
import { prsMutation } from '@/shared/apis';
import { useOverlay } from '@/shared/hooks';
import { CheckoutModal } from '../../ReviewList/components/CheckoutModal/CheckoutModal';
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
  prState: string;
  origin?: string;
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
  prState,
  origin,
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
  const overlay = useOverlay();
  const { mutate, isPending } = useMutation({
    ...prsMutation.checkout(),
    onError: (error) => {
      console.error('Checkout failed:', error);
    },
  });

  const executeAction = (
    actionId: string,
    customPrompt: string | undefined,
    target: ValidationTarget
  ) => {
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
  };

  const handleFixAction = (
    actionId: string,
    customPrompt: string | undefined,
    target: ValidationTarget
  ) => {
    if (prState !== 'OPEN') {
      executeAction(actionId, customPrompt, target);
      return;
    }

    overlay.open(
      ({ isOpen, close }) => (
        <CheckoutModal
          isOpen={isOpen}
          close={close}
          onConfirm={async () => {
            close();
            mutate(
              {
                projectId,
                prNumber,
                body: { force: true, origin },
              },
              {
                onSuccess: () => {
                  executeAction(actionId, customPrompt, target);
                },
                onError: (error) => {
                  console.error('Checkout failed:', error);
                },
              }
            );
          }}
          isPending={isPending}
        />
      ),
      'checkout-modal'
    );
  };

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
      if (actionId === 'fix') {
        handleFixAction(actionId, customPrompt, target);
      } else {
        executeAction(actionId, customPrompt, target);
      }
    });

    openActionSelector(target.type, target.id);
  };

  return { handleOpenChat, messages };
}
