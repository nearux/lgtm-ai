import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PRMeta, ClaudeChatContext } from '@lgtmai/backend/types';
import { useChatPanel } from '../contexts';
import { useChatPanelParams } from './useChatPanelParams';
import { useSessionResume } from './useSessionResume';
import type { UseClaudeWebSocketReturn } from './useClaudeWebSocket';
import { ACTION_LABELS } from '../utils/reviewPrompts';
import {
  postCheckoutPrMutationOptions,
  getProjectDetailQueryOptions,
} from '@/queries';
import { useOverlay } from '@/shared/hooks';
import { CheckoutModal } from '../components/ReviewList/components/CheckoutModal/CheckoutModal';

interface UsePRChatOptions {
  projectId: string;
  prNumber: number;
  prMeta: PRMeta;
  prAuthor: string;
  prBody: string;
  workingDir: string;
  prState: string;
  currentBranch: string | null;
  prHeadBranch: string;
  origin?: string;
  ws: UseClaudeWebSocketReturn;
}

export function usePRChat({
  projectId,
  prNumber,
  prMeta,
  prAuthor,
  prBody,
  workingDir,
  prState,
  currentBranch,
  prHeadBranch,
  origin,
  ws,
}: UsePRChatOptions) {
  const { setTargetContext, setPRContext, setOnExecuteAction } = useChatPanel();
  const { openActionSelector, openChat } = useChatPanelParams();
  const { registerResumeSession } = useSessionResume({
    projectId,
    prNumber,
    workingDir,
    ws,
  });
  const overlay = useOverlay();
  const queryClient = useQueryClient();
  const { mutateAsync: checkoutPR } = useMutation(
    postCheckoutPrMutationOptions()
  );

  const executeAction = (actionId: string, customPrompt?: string) => {
    const label = ACTION_LABELS[actionId] || customPrompt || actionId;
    ws.addUserMessage(label);

    const chatContext: ClaudeChatContext = {
      projectId,
      targetType: 'PR',
      targetNumber: prNumber,
      scopeType: 'PR',
      scopeTargetId: '',
      title: label,
    };

    openChat();
    ws.execute(
      {
        type: 'command',
        command: actionId as 'review' | 'explain' | 'custom',
        context: { type: 'pr', prMeta },
        ...(customPrompt ? { customPrompt } : {}),
      },
      workingDir,
      { executionMode: 'bypassPermissions' },
      chatContext
    );
  };

  const handleActionWithCheckout = (
    actionId: string,
    customPrompt?: string
  ) => {
    if (prState !== 'OPEN' || currentBranch === prHeadBranch) {
      executeAction(actionId, customPrompt);
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
            executeAction(actionId, customPrompt);
          }}
        />
      ),
      'checkout-modal'
    );
  };

  const openPRChat = () => {
    if (ws.status !== 'connected') ws.connect();
    ws.clearMessages();

    setTargetContext({ type: 'pr', author: prAuthor, body: prBody, prNumber });
    setPRContext({ projectId, prNumber });
    registerResumeSession();

    setOnExecuteAction((actionId: string, customPrompt?: string) => {
      handleActionWithCheckout(actionId, customPrompt);
    });

    openActionSelector('pr', `pr-${prNumber}`);
  };

  return { openPRChat };
}
