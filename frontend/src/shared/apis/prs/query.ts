import { queryOptions } from '@tanstack/react-query';
import { apiGet } from '../client';
import { prsQueryKey } from './queryKey';
import type { PaginatedPRList, PRDetail, PRState } from '@lgtmai/backend/types';

export const prsQuery = {
  list: (
    projectId: string,
    params?: {
      state: PRState;
      page: number;
      limit: number;
      origin?: string;
    }
  ) =>
    queryOptions<PaginatedPRList>({
      queryKey: prsQueryKey.all(projectId, params),
      queryFn: () => {
        const searchParams = new URLSearchParams();
        if (params?.state) searchParams.set('state', params.state);
        if (params?.page) searchParams.set('page', String(params.page));
        if (params?.limit) searchParams.set('limit', String(params.limit));
        if (params?.origin) searchParams.set('origin', params.origin);
        const query = searchParams.toString();
        return apiGet<PaginatedPRList>(
          `/api/projects/${projectId}/prs${query ? `?${query}` : ''}`
        );
      },
    }),

  detail: (projectId: string, prNumber: number, origin?: string) =>
    queryOptions<PRDetail>({
      queryKey: prsQueryKey.detail(projectId, prNumber, origin),
      queryFn: () => {
        const params = origin ? `?origin=${encodeURIComponent(origin)}` : '';
        return apiGet<PRDetail>(
          `/api/projects/${projectId}/prs/${prNumber}${params}`
        );
      },
    }),
};
