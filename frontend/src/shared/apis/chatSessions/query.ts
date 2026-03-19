import { queryOptions } from '@tanstack/react-query';
import { apiGet } from '../client';
import { chatSessionsQueryKey } from './queryKey';
import type {
  ChatSessionSummary,
  ChatSessionHistoryResponse,
} from '@lgtmai/backend/types';

export const chatSessionsQuery = {
  list: (projectId: string, prNumber: number) =>
    queryOptions<ChatSessionSummary[]>({
      queryKey: chatSessionsQueryKey.list(projectId, prNumber),
      queryFn: () =>
        apiGet<ChatSessionSummary[]>(
          `/api/projects/${projectId}/prs/${prNumber}/chat-sessions`
        ),
    }),

  history: (projectId: string, prNumber: number, sessionId: string) =>
    queryOptions<ChatSessionHistoryResponse>({
      queryKey: chatSessionsQueryKey.history(projectId, prNumber, sessionId),
      queryFn: () =>
        apiGet<ChatSessionHistoryResponse>(
          `/api/projects/${projectId}/prs/${prNumber}/chat-sessions/${sessionId}/history`
        ),
    }),
};
