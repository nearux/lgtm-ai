import { apiGet } from './client';
import type { BrowseResponse } from '@lgtmai/backend/types';

export type { BrowseResponse };

export const browseFs = (path?: string) => {
  const params = path ? `?path=${encodeURIComponent(path)}` : '';
  return apiGet<BrowseResponse>(`/api/fs/browse${params}`);
};
