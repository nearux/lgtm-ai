import { useEffect } from 'react';
import { useChatPanel } from '../contexts';
import { useChatPanelParams } from './useChatPanelParams';

/**
 * Combines URL params and context state for ChatPanel control.
 * Handles title sync and navigation callbacks.
 */
export function useChatPanelController() {
  const { state, setTitle, clearMessages } = useChatPanel();
  const { mode, isOpen, panelMode, goBack, closePanel, openHistory } =
    useChatPanelParams();

  // Sync title based on panelMode
  useEffect(() => {
    if (panelMode === 'history') {
      setTitle('Chat History');
    } else if (panelMode === 'action' && state.targetContext) {
      const t = state.targetContext;
      setTitle(
        t.type === 'pr'
          ? 'Chat: Pull Request'
          : t.type === 'review'
            ? `Chat: ${t.author}'s review`
            : `Chat: ${t.author}'s comment on ${t.path}`
      );
    }
    // chat mode title is set by ReviewList when action is executed or session is resumed
  }, [panelMode, state.targetContext, setTitle]);

  const handleBackFromChat = () => {
    clearMessages();
    goBack();
  };

  return {
    state,
    mode,
    isOpen,
    onClose: closePanel,
    onShowHistory: openHistory,
    onHideHistory: goBack,
    onBackToChat: handleBackFromChat,
  };
}
