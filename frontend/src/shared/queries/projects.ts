import { queryOptions, mutationOptions } from '@tanstack/react-query';
import {
  getProjectList,
  getProjectDetail,
  createProject,
  updateProject,
  deleteProject,
} from '../apis';
import type { UpdateProjectBody } from '../apis';

export const getProjectListQueryOptions = () =>
  queryOptions({
    queryKey: ['projects', 'list'],
    queryFn: () => getProjectList(),
  });

export const getProjectDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['projects', 'detail', id],
    queryFn: () => getProjectDetail(id),
  });

export const createProjectMutationOptions = () =>
  mutationOptions({
    mutationFn: createProject,
  });

export const updateProjectMutationOptions = () =>
  mutationOptions({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectBody }) =>
      updateProject(id, data),
  });

export const deleteProjectMutationOptions = () =>
  mutationOptions({
    mutationFn: deleteProject,
  });
