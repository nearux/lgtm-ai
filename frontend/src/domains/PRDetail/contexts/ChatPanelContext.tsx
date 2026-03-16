import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ClaudeMessage, ConnectionStatus } from '../hooks';

export type ChatPanelMode = 'action-selection' | 'chat';

export interface TargetContext {
  type: 'review' | 'inline';
  author: string;
  body: string;
  path?: string;
  prNumber: number;
}

interface ChatPanelState {
  isOpen: boolean;
  title: string;
  messages: ClaudeMessage[];
  status: ConnectionStatus;
  sessionId: string | null;
  onSendFollowUp: ((message: string) => void) | null;
  mode: ChatPanelMode;
  targetContext: TargetContext | null;
  onExecuteAction: ((actionId: string, customPrompt?: string) => void) | null;
}

interface ChatPanelContextValue {
  state: ChatPanelState;
  openPanel: (title: string) => void;
  closePanel: () => void;
  setMessages: (messages: ClaudeMessage[]) => void;
  setStatus: (status: ConnectionStatus) => void;
  setSessionId: (sessionId: string | null) => void;
  setOnSendFollowUp: (callback: ((message: string) => void) | null) => void;
  setMode: (mode: ChatPanelMode) => void;
  setTargetContext: (context: TargetContext | null) => void;
  setOnExecuteAction: (
    callback: ((actionId: string, customPrompt?: string) => void) | null
  ) => void;
}

const ChatPanelContext = createContext<ChatPanelContextValue | null>(null);

export const ChatPanelProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<ChatPanelState>({
    isOpen: false,
    title: 'Claude',
    messages: [],
    status: 'disconnected',
    sessionId: null,
    onSendFollowUp: null,
    mode: 'action-selection',
    targetContext: null,
    onExecuteAction: null,
  });

  const openPanel = (title: string) => {
    setState((prev) => ({ ...prev, isOpen: true, title }));
  };

  const closePanel = () => {
    setState((prev) => ({ ...prev, isOpen: false }));
  };

  const setMessages = (messages: ClaudeMessage[]) => {
    setState((prev) => ({ ...prev, messages }));
  };

  const setStatus = (status: ConnectionStatus) => {
    setState((prev) => ({ ...prev, status }));
  };

  const setSessionId = (sessionId: string | null) => {
    setState((prev) => ({ ...prev, sessionId }));
  };

  const setOnSendFollowUp = (callback: ((message: string) => void) | null) => {
    setState((prev) => ({ ...prev, onSendFollowUp: callback }));
  };

  const setMode = (mode: ChatPanelMode) => {
    setState((prev) => ({ ...prev, mode }));
  };

  const setTargetContext = (targetContext: TargetContext | null) => {
    setState((prev) => ({ ...prev, targetContext }));
  };

  const setOnExecuteAction = (
    callback: ((actionId: string, customPrompt?: string) => void) | null
  ) => {
    setState((prev) => ({ ...prev, onExecuteAction: callback }));
  };

  return (
    <ChatPanelContext.Provider
      value={{
        state,
        openPanel,
        closePanel,
        setMessages,
        setStatus,
        setSessionId,
        setOnSendFollowUp,
        setMode,
        setTargetContext,
        setOnExecuteAction,
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
