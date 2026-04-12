import { queryOptions, mutationOptions } from '@tanstack/react-query';
import {
  getProjectList,
  getProjectDetail,
  postCreateProject,
  patchUpdateProject,
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

export const postCreateProjectMutationOptions = () =>
  mutationOptions({
    mutationFn: postCreateProject,
  });

export const patchUpdateProjectMutationOptions = () =>
  mutationOptions({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectBody }) =>
      patchUpdateProject(id, data),
  });

export const deleteProjectMutationOptions = () =>
  mutationOptions({
    mutationFn: deleteProject,
  });
