import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { ClaudeCommand, ChatSessionSummary } from '@lgtmai/backend/types';

export type ChatPanelMode = 'action-selection' | 'chat' | 'history';

export interface TargetContext {
  type: 'review' | 'inline' | 'pr';
  author: string;
  body: string;
  path?: string;
  prNumber: number;
}

export interface PRContext {
  projectId: string;
  prNumber: number;
}

export interface ChatPanelState {
  title: string;
  mode: ChatPanelMode;
  targetContext: TargetContext | null;
  prContext: PRContext | null;
  claudeSessionId: string | null;
  isResumedSession: boolean;
  onExecuteAction:
    | ((command: ClaudeCommand, customPrompt?: string) => void)
    | null;
  onResumeSession: ((session: ChatSessionSummary) => void) | null;
  onSendFollowUp: ((message: string) => void) | null;
}

interface ChatPanelContextValue {
  state: ChatPanelState;
  setTitle: (title: string) => void;
  setMode: (mode: ChatPanelMode) => void;
  setTargetContext: (context: TargetContext | null) => void;
  setPRContext: (context: PRContext | null) => void;
  setClaudeSessionId: (claudeSessionId: string | null) => void;
  setIsResumedSession: (isResumed: boolean) => void;
  setOnExecuteAction: (
    callback: ((command: ClaudeCommand, customPrompt?: string) => void) | null
  ) => void;
  setOnResumeSession: (
    callback: ((session: ChatSessionSummary) => void) | null
  ) => void;
  setOnSendFollowUp: (callback: ((message: string) => void) | null) => void;
}

const ChatPanelContext = createContext<ChatPanelContextValue | null>(null);

export const ChatPanelProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<ChatPanelState>({
    title: 'Claude',
    mode: 'action-selection',
    targetContext: null,
    prContext: null,
    claudeSessionId: null,
    isResumedSession: false,
    onExecuteAction: null,
    onResumeSession: null,
    onSendFollowUp: null,
  });

  const setTitle = useCallback((title: string) => {
    setState((prev) => ({ ...prev, title }));
  }, []);

  const setMode = useCallback((mode: ChatPanelMode) => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const setTargetContext = useCallback(
    (targetContext: TargetContext | null) => {
      setState((prev) => ({ ...prev, targetContext }));
    },
    []
  );

  const setPRContext = useCallback((prContext: PRContext | null) => {
    setState((prev) => ({ ...prev, prContext }));
  }, []);

  const setClaudeSessionId = useCallback((claudeSessionId: string | null) => {
    setState((prev) => ({ ...prev, claudeSessionId }));
  }, []);

  const setIsResumedSession = useCallback((isResumedSession: boolean) => {
    setState((prev) => ({ ...prev, isResumedSession }));
  }, []);

  const setOnExecuteAction = useCallback(
    (
      callback: ((command: ClaudeCommand, customPrompt?: string) => void) | null
    ) => {
      setState((prev) => ({ ...prev, onExecuteAction: callback }));
    },
    []
  );

  const setOnResumeSession = useCallback(
    (callback: ((session: ChatSessionSummary) => void) | null) => {
      setState((prev) => ({ ...prev, onResumeSession: callback }));
    },
    []
  );

  const setOnSendFollowUp = useCallback(
    (callback: ((message: string) => void) | null) => {
      setState((prev) => ({ ...prev, onSendFollowUp: callback }));
    },
    []
  );

  return (
    <ChatPanelContext.Provider
      value={{
        state,
        setTitle,
        setMode,
        setTargetContext,
        setPRContext,
        setClaudeSessionId,
        setIsResumedSession,
        setOnExecuteAction,
        setOnResumeSession,
        setOnSendFollowUp,
      }}
    >
      {children}
    </ChatPanelContext.Provider>
  );
};

export const useChatPanel = () => {
  const context = useContext(ChatPanelContext);
  if (!context) {
    throw new Error('useChatPanel must be used within ChatPanelProvider');
  }
  return context;
};
