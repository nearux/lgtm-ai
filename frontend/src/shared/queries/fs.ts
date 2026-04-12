import { queryOptions } from '@tanstack/react-query';
import { apiGet } from '../apis/client';
import type { BrowseResponse } from '@lgtmai/backend/types';

export const browseFsQueryOptions = (path?: string) =>
  queryOptions({
    queryKey: ['fs', 'browse', path],
    queryFn: () => {
      const params = path ? `?path=${encodeURIComponent(path)}` : '';
      return apiGet<BrowseResponse>(`/api/fs/browse${params}`);
    },
  });
