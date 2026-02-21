import { apiGet } from './client';
import type { PRListItem, PRDetail } from '../types/api';

export const getPRs = async (
  projectId: string,
  options?: { page?: number; limit?: number }
): Promise<PRListItem[]> => {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));

  const query = params.toString();
  const path = `/api/projects/${projectId}/prs${query ? `?${query}` : ''}`;
  return apiGet<PRListItem[]>(path);
};

export const getPRDetail = async (
  projectId: string,
  prNumber: number
): Promise<PRDetail> => {
  return apiGet<PRDetail>(`/api/projects/${projectId}/prs/${prNumber}`);
};
