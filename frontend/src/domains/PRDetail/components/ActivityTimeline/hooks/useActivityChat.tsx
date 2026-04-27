import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useChatPanelParams } from '../../../hooks';
import type { UseClaudeWebSocketReturn } from '../../../hooks';
import { useChatPanel } from '../../../contexts';
import { useSessionResume } from '../../../hooks/useSessionResume';
import { ACTION_LABELS } from '../../../utils/reviewPrompts';
import {
  postCheckoutPrMutationOptions,
  getProjectDetailQueryOptions,
} from '@/queries';
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
  currentBranch: string | null;
  prHeadBranch: string;
  origin?: string;
  prMeta: PRMeta;
  ws: UseClaudeWebSocketReturn;
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
  currentBranch,
  prHeadBranch,
  origin,
  prMeta,
  ws,
  setValidations,
  setActiveTarget,
}: UseActivityChatOptions) {
  const { setTargetContext, setPRContext, setOnExecuteAction } = useChatPanel();
  const { openActionSelector, openChat } = useChatPanelParams();
  const { registerResumeSession } = useSessionResume({
    projectId,
    prNumber,
    workingDir,
    ws,
  });
  const {
    status: wsStatus,
    messages,
    connect,
    execute,
    clearMessages,
    addUserMessage,
  } = ws;
  const overlay = useOverlay();
  const queryClient = useQueryClient();
  const { mutateAsync: checkoutPR } = useMutation(
    postCheckoutPrMutationOptions()
  );

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
      targetType: 'PR',
      targetNumber: prNumber,
      scopeType: target.type === 'review' ? 'REVIEW' : 'COMMENT',
      scopeTargetId: target.id,
      title: userMessage,
    };

    openChat();
    execute(
      {
        type: 'command',
        command: actionId as 'validate' | 'fix' | 'explain' | 'custom',
        context:
          target.type === 'comment'
            ? {
                type: 'comment' as const,
                author: target.author,
                body: target.body,
                path: target.path ?? '',
                diffHunk: target.diffHunk,
                prMeta,
              }
            : {
                type: 'review' as const,
                author: target.author,
                body: target.body,
                prMeta,
              },
        ...(customPrompt ? { customPrompt } : {}),
      },
      workingDir,
      { executionMode: 'bypassPermissions' },
      chatContext
    );
  };

  const handleActionWithCheckout = (
    actionId: string,
    customPrompt: string | undefined,
    target: ValidationTarget
  ) => {
    if (prState !== 'OPEN' || currentBranch === prHeadBranch) {
      executeAction(actionId, customPrompt, target);
      return;
    }

    overlay.open(
      ({ isOpen, close }) => (
        <CheckoutModal
          isOpen={isOpen}
          close={close}
          onConfirm={async () => {
            await checkoutPR({
              projectId,
              prNumber,
              body: { force: true, origin },
            });
            await queryClient.invalidateQueries({
              queryKey: getProjectDetailQueryOptions(projectId).queryKey,
            });
            close();
            executeAction(actionId, customPrompt, target);
          }}
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
    setPRContext({ projectId, prNumber });
    registerResumeSession();

    setOnExecuteAction((actionId: string, customPrompt?: string) => {
      handleActionWithCheckout(actionId, customPrompt, target);
    });

    openActionSelector(target.type, target.id);
  };

  return { handleOpenChat, messages };
}
