import { queryOptions } from '@tanstack/react-query';
import { getBrowseFs } from '../apis';

export const getBrowseFsQueryOptions = (path?: string) =>
  queryOptions({
    queryKey: ['fs', 'browse', path],
    queryFn: () => getBrowseFs(path),
  });
