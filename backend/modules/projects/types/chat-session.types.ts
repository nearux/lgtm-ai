export type ChatSessionScopeType = 'REVIEW' | 'COMMENT' | 'PR' | 'ISSUE';
export type ChatSessionTargetType = 'PR' | 'ISSUE';

export interface ClaudeChatContext {
  projectId: string;
  targetType: ChatSessionTargetType;
  targetNumber: number;
  scopeType: ChatSessionScopeType;
  scopeTargetId: string;
  title?: string;
}

export interface ChatSessionSummary {
  id: string;
  projectId: string;
  targetType: ChatSessionTargetType;
  targetNumber: number;
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
