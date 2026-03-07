import { queryOptions } from '@tanstack/react-query';
import { apiGet } from '../client';
import { prsQueryKey } from './queryKey';
import type { PRListItem, PRDetail } from '@lgtmai/backend/types';

export const prsQuery = {
  list: (projectId: string, origin?: string) =>
    queryOptions<PRListItem[]>({
      queryKey: prsQueryKey.all(projectId, origin),
      queryFn: () => {
        const params = origin ? `?origin=${encodeURIComponent(origin)}` : '';
        return apiGet<PRListItem[]>(`/api/projects/${projectId}/prs${params}`);
      },
    }),

  detail: (projectId: string, prNumber: number) =>
    queryOptions<PRDetail>({
      queryKey: prsQueryKey.detail(projectId, prNumber),
      queryFn: () =>
        apiGet<PRDetail>(`/api/projects/${projectId}/prs/${prNumber}`),
    }),
};
