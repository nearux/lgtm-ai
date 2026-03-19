export type ChatSessionScopeType = 'REVIEW' | 'COMMENT';

export interface ClaudeChatContext {
  projectId: string;
  prNumber: number;
  scopeType: ChatSessionScopeType;
  scopeTargetId: string;
  title?: string;
}

export interface ChatSessionSummary {
  id: string;
  projectId: string;
  prNumber: number;
  scopeType: ChatSessionScopeType;
  scopeTargetId: string;
  claudeSessionId: string;
  title?: string;
  command?: string;
  customPrompt?: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
}

export interface ListChatSessionsFilters {
  scopeType?: ChatSessionScopeType;
  scopeTargetId?: string;
}

export interface ChatSessionHistoryEntry {
  role: string;
  content: string;
  timestamp?: string;
}

export interface ChatSessionHistoryResponse {
  sessionId: string;
  claudeSessionId: string;
  entries: ChatSessionHistoryEntry[];
}
