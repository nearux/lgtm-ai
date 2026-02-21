import { queryOptions } from '@tanstack/react-query';
import { apiGet } from '../client';
import { prsQueryKey } from './queryKey';
import type { PRListItem, PRDetail } from '@/shared/types';

export const prsQuery = {
  list: (projectId: string) =>
    queryOptions<PRListItem[]>({
      queryKey: prsQueryKey.all(projectId),
      queryFn: () => apiGet<PRListItem[]>(`/api/projects/${projectId}/prs`),
    }),

  detail: (projectId: string, prNumber: number) =>
    queryOptions<PRDetail>({
      queryKey: prsQueryKey.detail(projectId, prNumber),
      queryFn: () =>
        apiGet<PRDetail>(`/api/projects/${projectId}/prs/${prNumber}`),
    }),
};
