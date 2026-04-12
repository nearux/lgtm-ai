import { queryOptions } from '@tanstack/react-query';
import { browseFs } from '../apis';

export const browseFsQueryOptions = (path?: string) =>
  queryOptions({
    queryKey: ['fs', 'browse', path],
    queryFn: () => browseFs(path),
  });
