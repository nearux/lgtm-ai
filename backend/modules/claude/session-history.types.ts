export interface ChatSessionHistoryEntry {
  role: string;
  messageType: 'text' | 'tool' | 'tool_result' | 'user';
  content: string;
  toolName?: string;
  toolId?: string;
  isError?: boolean;
  timestamp?: string;
}

export interface ChatSessionHistoryResponse {
  sessionId: string;
  claudeSessionId: string;
  entries: ChatSessionHistoryEntry[];
}
