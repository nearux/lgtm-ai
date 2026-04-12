import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { apiGet, apiPost } from '../apis/client';
import type {
  PaginatedPRList,
  PRDetail,
  PRState,
  CheckoutPRBranchBody,
  CheckoutPRBranchResult,
} from '@lgtmai/backend/types';

export const getPrListQueryOptions = (
  projectId: string,
  params?: { state: PRState; page: number; limit: number; origin?: string }
) =>
  queryOptions({
    queryKey: ['prs', 'list', projectId, params ?? {}],
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
  });

export const getPrDetailQueryOptions = (
  projectId: string,
  prNumber: number,
  origin?: string
) =>
  queryOptions({
    queryKey: [
      'prs',
      'detail',
      projectId,
      prNumber,
      ...(origin ? [origin] : []),
    ],
    queryFn: () => {
      const params = origin ? `?origin=${encodeURIComponent(origin)}` : '';
      return apiGet<PRDetail>(
        `/api/projects/${projectId}/prs/${prNumber}${params}`
      );
    },
  });

export const checkoutPrMutationOptions = () =>
  mutationOptions({
    mutationFn: ({
      projectId,
      prNumber,
      body,
    }: {
      projectId: string;
      prNumber: number;
      body?: CheckoutPRBranchBody;
    }) =>
      apiPost<CheckoutPRBranchResult, CheckoutPRBranchBody | undefined>(
        `/api/projects/${projectId}/prs/${prNumber}/checkout`,
        body
      ),
  });
