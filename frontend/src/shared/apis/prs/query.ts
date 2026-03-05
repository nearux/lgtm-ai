import { queryOptions } from '@tanstack/react-query';
import { apiGet } from '../client';
import { prsQueryKey } from './queryKey';
import type { PRListItem, PRDetail, PRState } from '@lgtmai/backend/types';

export const prsQuery = {
  list: (
    projectId: string,
    params?: {
      state: PRState;
      page: number;
      limit: number;
    }
  ) =>
    queryOptions<PRListItem[]>({
      queryKey: prsQueryKey.all(projectId, params),
      queryFn: () => {
        const searchParams = new URLSearchParams();
        if (params?.state) searchParams.set('state', params.state);
        if (params?.page) searchParams.set('page', String(params.page));
        if (params?.limit) searchParams.set('limit', String(params.limit));
        const query = searchParams.toString();
        return apiGet<PRListItem[]>(
          `/api/projects/${projectId}/prs${query ? `?${query}` : ''}`
        );
      },
    }),

  detail: (projectId: string, prNumber: number) =>
    queryOptions<PRDetail>({
      queryKey: prsQueryKey.detail(projectId, prNumber),
      queryFn: () =>
        apiGet<PRDetail>(`/api/projects/${projectId}/prs/${prNumber}`),
    }),
};
