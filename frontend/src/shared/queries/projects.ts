import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '../apis/client';
import type {
  Project,
  ProjectDetail,
  CreateProjectBody,
  UpdateProjectBody,
} from '@lgtmai/backend/types';

export const getProjectListQueryOptions = () =>
  queryOptions({
    queryKey: ['projects', 'list'],
    queryFn: () => apiGet<Project[]>('/api/projects'),
  });

export const getProjectDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['projects', 'detail', id],
    queryFn: () => apiGet<ProjectDetail>(`/api/projects/${id}`),
  });

export const createProjectMutationOptions = () =>
  mutationOptions({
    mutationFn: (data: CreateProjectBody) =>
      apiPost<Project, CreateProjectBody>('/api/projects', data),
  });

export const updateProjectMutationOptions = () =>
  mutationOptions({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectBody }) =>
      apiPatch<Project, UpdateProjectBody>(`/api/projects/${id}`, data),
  });

export const deleteProjectMutationOptions = () =>
  mutationOptions({
    mutationFn: (id: string) => apiDelete(`/api/projects/${id}`),
  });
