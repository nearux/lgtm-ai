import { apiGet, apiPost } from './client';
import type {
  PaginatedPRList,
  PRDetail,
  PRState,
  CheckoutPRBranchBody,
  CheckoutPRBranchResult,
} from '@lgtmai/backend/types';

export type {
  PaginatedPRList,
  PRDetail,
  PRState,
  CheckoutPRBranchBody,
  CheckoutPRBranchResult,
};

export const getPrList = (
  projectId: string,
  params?: { state: PRState; page: number; limit: number; origin?: string }
) => {
  const searchParams = new URLSearchParams();
  if (params?.state) searchParams.set('state', params.state);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.origin) searchParams.set('origin', params.origin);
  const query = searchParams.toString();
  return apiGet<PaginatedPRList>(
    `/api/projects/${projectId}/prs${query ? `?${query}` : ''}`
  );
};

export const getPrDetail = (
  projectId: string,
  prNumber: number,
  origin?: string
) => {
  const params = origin ? `?origin=${encodeURIComponent(origin)}` : '';
  return apiGet<PRDetail>(
    `/api/projects/${projectId}/prs/${prNumber}${params}`
  );
};

export const checkoutPr = (
  projectId: string,
  prNumber: number,
  body?: CheckoutPRBranchBody
) =>
  apiPost<CheckoutPRBranchResult, CheckoutPRBranchBody | undefined>(
    `/api/projects/${projectId}/prs/${prNumber}/checkout`,
    body
  );
