import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

import type { ChatPanelMode } from '../contexts/ChatPanelContext';

export type PanelMode = 'action' | 'chat' | 'history' | null;

const toMode = (panelMode: PanelMode): ChatPanelMode =>
  panelMode === 'action'
    ? 'action-selection'
    : panelMode === 'chat'
      ? 'chat'
      : panelMode === 'history'
        ? 'history'
        : 'action-selection';

export function useChatPanelParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const panelMode = (searchParams.get('panel') as PanelMode) || null;
  const mode = toMode(panelMode);
  const isOpen = panelMode !== null;
  const targetId = searchParams.get('targetId');
  const targetType = searchParams.get('targetType') as
    | 'review'
    | 'comment'
    | null;
  const resumed = searchParams.get('resumed') === '1';

  const openActionSelector = useCallback(
    (targetType: 'review' | 'comment', targetId: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('panel', 'action');
        next.set('targetType', targetType);
        next.set('targetId', targetId);
        next.delete('resumed');
        return next;
      });
    },
    [setSearchParams]
  );

  const openChat = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('panel', 'chat');
      // Keep targetType and targetId
      return next;
    });
  }, [setSearchParams]);

  const openHistory = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('panel', 'history');
      next.delete('targetType');
      next.delete('targetId');
      next.delete('resumed');
      return next;
    });
  }, [setSearchParams]);

  const resumeSession = useCallback(
    (targetType: 'review' | 'comment', targetId: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('panel', 'chat');
        next.set('targetType', targetType);
        next.set('targetId', targetId);
        next.set('resumed', '1');
        return next;
      });
    },
    [setSearchParams]
  );

  const goBack = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const currentPanel = next.get('panel');

        if (currentPanel === 'chat') {
          // chat -> history
          next.set('panel', 'history');
          next.delete('targetType');
          next.delete('targetId');
          next.delete('resumed');
        } else if (currentPanel === 'history') {
          // history -> action
          next.set('panel', 'action');
        }
        // action -> close panel (handled by closePanel)

        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const closePanel = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('panel');
      next.delete('targetType');
      next.delete('targetId');
      next.delete('resumed');
      return next;
    });
  }, [setSearchParams]);

  return {
    panelMode,
    mode,
    isOpen,
    targetId,
    targetType,
    resumed,
    openActionSelector,
    openChat,
    openHistory,
    resumeSession,
    goBack,
    closePanel,
  };
}
