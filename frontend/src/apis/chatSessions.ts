import { apiGet } from './client';
import type {
  ChatSessionSummary,
  ChatSessionHistoryResponse,
} from '@lgtmai/backend/types';

export const getChatSessionList = (projectId: string, prNumber: number) =>
  apiGet<ChatSessionSummary[]>(
    `/api/projects/${projectId}/prs/${prNumber}/chat-sessions`
  );

export const getChatSessionHistory = (
  projectId: string,
  prNumber: number,
  sessionId: string
) =>
  apiGet<ChatSessionHistoryResponse>(
    `/api/projects/${projectId}/prs/${prNumber}/chat-sessions/${sessionId}/history`
  );
