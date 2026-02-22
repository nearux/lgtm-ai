import { queryOptions } from '@tanstack/react-query';
import { apiGet } from '../client';
import { fsQueryKey } from './queryKey';
import type { BrowseResponse } from '@lgtmai/backend/types';

export const fsQuery = {
  browse: (path?: string) =>
    queryOptions<BrowseResponse>({
      queryKey: fsQueryKey.browse(path),
      queryFn: () => {
        const params = path ? `?path=${encodeURIComponent(path)}` : '';
        return apiGet<BrowseResponse>(`/api/fs/browse${params}`);
      },
    }),
};
