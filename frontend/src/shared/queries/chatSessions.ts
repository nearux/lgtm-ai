import { queryOptions } from '@tanstack/react-query';
import { getChatSessionList, getChatSessionHistory } from '../apis';

export const getChatSessionListQueryOptions = (
  projectId: string,
  prNumber: number
) =>
  queryOptions({
    queryKey: ['chatSessions', 'list', projectId, prNumber],
    queryFn: () => getChatSessionList(projectId, prNumber),
  });

export const getChatSessionHistoryQueryOptions = (
  projectId: string,
  prNumber: number,
  sessionId: string
) =>
  queryOptions({
    queryKey: ['chatSessions', 'history', projectId, prNumber, sessionId],
    queryFn: () => getChatSessionHistory(projectId, prNumber, sessionId),
  });
