import type { PRMeta, ClaudeChatContext } from '@lgtmai/backend/types';
import { useChatPanel } from '../contexts';
import { useChatPanelParams } from './useChatPanelParams';
import { useSessionResume } from './useSessionResume';
import type { UseClaudeWebSocketReturn } from './useClaudeWebSocket';
import { ACTION_LABELS } from '../utils/reviewPrompts';

interface UsePRChatOptions {
  projectId: string;
  prNumber: number;
  prMeta: PRMeta;
  prAuthor: string;
  prBody: string;
  workingDir: string;
  ws: UseClaudeWebSocketReturn;
}

export function usePRChat({
  projectId,
  prNumber,
  prMeta,
  prAuthor,
  prBody,
  workingDir,
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

  // --- Public API ---
  const openPRChat = () => {
    if (ws.status !== 'connected') ws.connect();
    ws.clearMessages();

    setTargetContext({ type: 'pr', author: prAuthor, body: prBody, prNumber });
    setPRContext({ projectId, prNumber });
    registerResumeSession();

    setOnExecuteAction((actionId: string, customPrompt?: string) => {
      const label = ACTION_LABELS[actionId] || customPrompt || actionId;
      ws.addUserMessage(label);

      const chatContext: ClaudeChatContext = {
        projectId,
        prNumber,
        scopeType: 'REVIEW',
        scopeTargetId: '',
        title: label,
      };

      openChat();
      ws.execute(
        {
          type: 'command',
          command: actionId as 'validate' | 'fix' | 'explain' | 'custom',
          context: { type: 'review', author: prAuthor, body: prBody, prMeta },
          ...(customPrompt ? { customPrompt } : {}),
        },
        workingDir,
        { executionMode: 'bypassPermissions' },
        chatContext
      );
    });

    openActionSelector('pr', `pr-${prNumber}`);
  };

  return { openPRChat };
}
