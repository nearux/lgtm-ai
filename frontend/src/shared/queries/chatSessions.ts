import { queryOptions } from '@tanstack/react-query';
import { apiGet } from '../apis/client';
import type {
  ChatSessionSummary,
  ChatSessionHistoryResponse,
} from '@lgtmai/backend/types';

export const getChatSessionListQueryOptions = (
  projectId: string,
  prNumber: number
) =>
  queryOptions({
    queryKey: ['chatSessions', 'list', projectId, prNumber],
    queryFn: () =>
      apiGet<ChatSessionSummary[]>(
        `/api/projects/${projectId}/prs/${prNumber}/chat-sessions`
      ),
  });

export const getChatSessionHistoryQueryOptions = (
  projectId: string,
  prNumber: number,
  sessionId: string
) =>
  queryOptions({
    queryKey: ['chatSessions', 'history', projectId, prNumber, sessionId],
    queryFn: () =>
      apiGet<ChatSessionHistoryResponse>(
        `/api/projects/${projectId}/prs/${prNumber}/chat-sessions/${sessionId}/history`
      ),
  });
