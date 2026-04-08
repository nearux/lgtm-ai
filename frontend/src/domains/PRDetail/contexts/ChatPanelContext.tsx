import { createContext, useContext, useState, type ReactNode } from 'react';
import type {
  ClaudeMessage,
  ConnectionStatus,
  FileChangesData,
} from '../hooks';
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
  isOpen: boolean;
  title: string;
  messages: ClaudeMessage[];
  status: ConnectionStatus;
  sessionId: string | null;
  claudeSessionId: string | null;
  onSendFollowUp: ((message: string) => void) | null;
  clearMessages: (() => void) | null;
  mode: ChatPanelMode;
  targetContext: TargetContext | null;
  prContext: PRContext | null;
  onExecuteAction:
    | ((command: ClaudeCommand, customPrompt?: string) => void)
    | null;
  onResumeSession: ((session: ChatSessionSummary) => void) | null;
  isResumedSession: boolean;
  fileChanges: FileChangesData | null;
}

interface ChatPanelContextValue {
  state: ChatPanelState;
  openPanel: (title: string) => void;
  closePanel: () => void;
  setTitle: (title: string) => void;
  setMessages: (messages: ClaudeMessage[]) => void;
  setStatus: (status: ConnectionStatus) => void;
  setSessionId: (sessionId: string | null) => void;
  setClaudeSessionId: (claudeSessionId: string | null) => void;
  setOnSendFollowUp: (callback: ((message: string) => void) | null) => void;
  setClearMessages: (callback: (() => void) | null) => void;
  setMode: (mode: ChatPanelMode) => void;
  setTargetContext: (context: TargetContext | null) => void;
  setPRContext: (context: PRContext | null) => void;
  setOnExecuteAction: (
    callback: ((command: ClaudeCommand, customPrompt?: string) => void) | null
  ) => void;
  setOnResumeSession: (
    callback: ((session: ChatSessionSummary) => void) | null
  ) => void;
  setIsResumedSession: (isResumed: boolean) => void;
  setFileChanges: (fileChanges: FileChangesData | null) => void;
}

const ChatPanelContext = createContext<ChatPanelContextValue | null>(null);

export const ChatPanelProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<ChatPanelState>({
    isOpen: false,
    title: 'Claude',
    messages: [],
    status: 'disconnected',
    sessionId: null,
    claudeSessionId: null,
    onSendFollowUp: null,
    clearMessages: null,
    mode: 'action-selection',
    targetContext: null,
    prContext: null,
    onExecuteAction: null,
    onResumeSession: null,
    isResumedSession: false,
    fileChanges: null,
  });

  const openPanel = (title: string) => {
    setState((prev) => ({ ...prev, isOpen: true, title }));
  };

  const closePanel = () => {
    setState((prev) => ({ ...prev, isOpen: false }));
  };

  const setTitle = (title: string) => {
    setState((prev) => ({ ...prev, title }));
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

  const setClaudeSessionId = (claudeSessionId: string | null) => {
    setState((prev) => ({ ...prev, claudeSessionId }));
  };

  const setOnSendFollowUp = (callback: ((message: string) => void) | null) => {
    setState((prev) => ({ ...prev, onSendFollowUp: callback }));
  };

  const setClearMessages = (callback: (() => void) | null) => {
    setState((prev) => ({ ...prev, clearMessages: callback }));
  };

  const setMode = (mode: ChatPanelMode) => {
    setState((prev) => ({ ...prev, mode }));
  };

  const setTargetContext = (targetContext: TargetContext | null) => {
    setState((prev) => ({ ...prev, targetContext }));
  };

  const setPRContext = (prContext: PRContext | null) => {
    setState((prev) => ({ ...prev, prContext }));
  };

  const setOnExecuteAction = (
    callback: ((command: ClaudeCommand, customPrompt?: string) => void) | null
  ) => {
    setState((prev) => ({ ...prev, onExecuteAction: callback }));
  };

  const setOnResumeSession = (
    callback: ((session: ChatSessionSummary) => void) | null
  ) => {
    setState((prev) => ({ ...prev, onResumeSession: callback }));
  };

  const setIsResumedSession = (isResumedSession: boolean) => {
    setState((prev) => ({ ...prev, isResumedSession }));
  };

  const setFileChanges = (fileChanges: FileChangesData | null) => {
    setState((prev) => ({ ...prev, fileChanges }));
  };

  return (
    <ChatPanelContext.Provider
      value={{
        state,
        openPanel,
        closePanel,
        setTitle,
        setMessages,
        setStatus,
        setSessionId,
        setClaudeSessionId,
        setOnSendFollowUp,
        setClearMessages,
        setMode,
        setTargetContext,
        setPRContext,
        setOnExecuteAction,
        setOnResumeSession,
        setIsResumedSession,
        setFileChanges,
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
