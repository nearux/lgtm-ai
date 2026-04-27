import { apiGet } from './client';
import type {
  PaginatedIssueList,
  IssueDetail,
  IssueState,
} from '@lgtmai/backend/types';

export const getIssueList = (
  projectId: string,
  params?: { state: IssueState; page: number; limit: number; origin?: string }
) => {
  const searchParams = new URLSearchParams();
  if (params?.state) searchParams.set('state', params.state);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.origin) searchParams.set('origin', params.origin);
  const query = searchParams.toString();
  return apiGet<PaginatedIssueList>(
    `/api/projects/${projectId}/issues${query ? `?${query}` : ''}`
  );
};

export const getIssueDetail = (
  projectId: string,
  issueNumber: number,
  origin?: string
) => {
  const params = origin ? `?origin=${encodeURIComponent(origin)}` : '';
  return apiGet<IssueDetail>(
    `/api/projects/${projectId}/issues/${issueNumber}${params}`
  );
};
