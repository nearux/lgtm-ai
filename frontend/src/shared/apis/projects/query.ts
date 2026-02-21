import { queryOptions } from '@tanstack/react-query';
import { apiGet } from '../client';
import { projectsQueryKey } from './queryKey';
import type { Project, ProjectDetail } from '@lgtmai/backend/types';

export const projectsQuery = {
  list: () =>
    queryOptions<Project[]>({
      queryKey: projectsQueryKey.all,
      queryFn: () => apiGet<Project[]>('/api/projects'),
    }),

  detail: (id: string) =>
    queryOptions<ProjectDetail>({
      queryKey: projectsQueryKey.detail(id),
      queryFn: () => apiGet<ProjectDetail>(`/api/projects/${id}`),
    }),
};
