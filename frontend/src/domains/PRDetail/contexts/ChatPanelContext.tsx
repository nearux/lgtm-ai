import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useClaudeWebSocket } from '../hooks/useClaudeWebSocket';
import { chatSessionsQueryKey } from '@/shared/apis';
import type {
  ClaudeMessage,
  ConnectionStatus,
  FileChangesData,
  CommandPayload,
  FollowUpPayload,
  ClaudeExecuteOptions,
} from '../hooks/useClaudeWebSocket';
import type {
  ClaudeCommand,
  ChatSessionSummary,
  ClaudeChatContext,
} from '@lgtmai/backend/types';

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
  messages: ClaudeMessage[];
  status: ConnectionStatus;
  sessionId: string | null;
  claudeSessionId: string | null;
  onSendFollowUp: ((message: string) => void) | null;
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
  setTitle: (title: string) => void;
  setClaudeSessionId: (claudeSessionId: string | null) => void;
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
  setWorkingDir: (workingDir: string) => void;

  // WebSocket methods
  connect: () => void;
  execute: (
    payload: CommandPayload | FollowUpPayload,
    workingDir: string,
    options?: ClaudeExecuteOptions,
    chatContext?: ClaudeChatContext
  ) => string;
  clearMessages: () => void;
  addUserMessage: (content: string) => void;
  loadHistoryMessages: (msgs: ClaudeMessage[]) => void;
}

const ChatPanelContext = createContext<ChatPanelContextValue | null>(null);

interface UIState {
  title: string;
  claudeSessionId: string | null;
  mode: ChatPanelMode;
  targetContext: TargetContext | null;
  prContext: PRContext | null;
  onExecuteAction:
    | ((command: ClaudeCommand, customPrompt?: string) => void)
    | null;
  onResumeSession: ((session: ChatSessionSummary) => void) | null;
  isResumedSession: boolean;
}

export const ChatPanelProvider = ({ children }: { children: ReactNode }) => {
  const ws = useClaudeWebSocket();
  const queryClient = useQueryClient();

  const [ui, setUI] = useState<UIState>({
    title: 'Claude',
    claudeSessionId: null,
    mode: 'action-selection',
    targetContext: null,
    prContext: null,
    onExecuteAction: null,
    onResumeSession: null,
    isResumedSession: false,
  });

  // Refs for latest values in callbacks
  const workingDirRef = useRef<string | null>(null);
  const claudeSessionIdRef = useRef<string | null>(null);

  // Keep ref in sync
  useEffect(() => {
    claudeSessionIdRef.current = ui.claudeSessionId;
  }, [ui.claudeSessionId]);

  // Update claudeSessionId when ws.sessionId changes (new session created)
  useEffect(() => {
    if (ws.sessionId) {
      setUI((prev) => ({ ...prev, claudeSessionId: ws.sessionId }));
    }
  }, [ws.sessionId]);

  // Invalidate chat sessions query when a chat completes
  const prevDoneCountRef = useRef(0);
  useEffect(() => {
    const doneCount = ws.messages.filter((m) => m.type === 'done').length;
    if (doneCount > prevDoneCountRef.current && ui.prContext) {
      queryClient.invalidateQueries({
        queryKey: chatSessionsQueryKey.list(
          ui.prContext.projectId,
          ui.prContext.prNumber
        ),
      });
    }
    prevDoneCountRef.current = doneCount;
  }, [ws.messages, ui.prContext, queryClient]);

  // Follow-up handler
  const sendFollowUp = useCallback(
    (message: string) => {
      const sessionIdToUse = claudeSessionIdRef.current || ws.sessionId;
      if (sessionIdToUse && workingDirRef.current) {
        ws.execute({ type: 'followUp', message }, workingDirRef.current, {
          executionMode: 'bypassPermissions',
          sessionId: sessionIdToUse,
        });
      }
    },
    [ws.sessionId, ws.execute]
  );

  // UI setters
  const setTitle = useCallback(
    (title: string) => setUI((prev) => ({ ...prev, title })),
    []
  );
  const setClaudeSessionId = useCallback(
    (claudeSessionId: string | null) =>
      setUI((prev) => ({ ...prev, claudeSessionId })),
    []
  );
  const setMode = useCallback(
    (mode: ChatPanelMode) => setUI((prev) => ({ ...prev, mode })),
    []
  );
  const setTargetContext = useCallback(
    (targetContext: TargetContext | null) =>
      setUI((prev) => ({ ...prev, targetContext })),
    []
  );
  const setPRContext = useCallback(
    (prContext: PRContext | null) => setUI((prev) => ({ ...prev, prContext })),
    []
  );
  const setOnExecuteAction = useCallback(
    (
      callback: ((command: ClaudeCommand, customPrompt?: string) => void) | null
    ) => setUI((prev) => ({ ...prev, onExecuteAction: callback })),
    []
  );
  const setOnResumeSession = useCallback(
    (callback: ((session: ChatSessionSummary) => void) | null) =>
      setUI((prev) => ({ ...prev, onResumeSession: callback })),
    []
  );
  const setIsResumedSession = useCallback(
    (isResumedSession: boolean) =>
      setUI((prev) => ({ ...prev, isResumedSession })),
    []
  );
  const setWorkingDir = useCallback((workingDir: string) => {
    workingDirRef.current = workingDir;
  }, []);

  // Combined state for ChatPanel rendering
  const state: ChatPanelState = useMemo(
    () => ({
      title: ui.title,
      messages: ws.messages,
      status: ws.status,
      sessionId: ws.sessionId,
      claudeSessionId: ui.claudeSessionId,
      onSendFollowUp: sendFollowUp,
      mode: ui.mode,
      targetContext: ui.targetContext,
      prContext: ui.prContext,
      onExecuteAction: ui.onExecuteAction,
      onResumeSession: ui.onResumeSession,
      isResumedSession: ui.isResumedSession,
      fileChanges: ws.fileChanges,
    }),
    [ui, ws.messages, ws.status, ws.sessionId, ws.fileChanges, sendFollowUp]
  );

  const value: ChatPanelContextValue = useMemo(
    () => ({
      state,
      setTitle,
      setClaudeSessionId,
      setMode,
      setTargetContext,
      setPRContext,
      setOnExecuteAction,
      setOnResumeSession,
      setIsResumedSession,
      setWorkingDir,
      connect: ws.connect,
      execute: ws.execute,
      clearMessages: ws.clearMessages,
      addUserMessage: ws.addUserMessage,
      loadHistoryMessages: ws.loadHistoryMessages,
    }),
    [
      state,
      setTitle,
      setClaudeSessionId,
      setMode,
      setTargetContext,
      setPRContext,
      setOnExecuteAction,
      setOnResumeSession,
      setIsResumedSession,
      setWorkingDir,
      ws.connect,
      ws.execute,
      ws.clearMessages,
      ws.addUserMessage,
      ws.loadHistoryMessages,
    ]
  );

  return (
    <ChatPanelContext.Provider value={value}>
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
