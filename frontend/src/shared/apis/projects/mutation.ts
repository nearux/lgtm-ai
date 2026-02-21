import { mutationOptions } from '@tanstack/react-query';
import { apiPost, apiPatch, apiDelete } from '../client';
import type {
  Project,
  CreateProjectBody,
  UpdateProjectBody,
} from '@lgtmai/backend/types';

export const projectsMutation = {
  create: () =>
    mutationOptions<Project, Error, CreateProjectBody>({
      mutationFn: (data) =>
        apiPost<Project, CreateProjectBody>('/api/projects', data),
    }),

  update: () =>
    mutationOptions<Project, Error, { id: string; data: UpdateProjectBody }>({
      mutationFn: ({ id, data }) =>
        apiPatch<Project, UpdateProjectBody>(`/api/projects/${id}`, data),
    }),

  delete: () =>
    mutationOptions<void, Error, string>({
      mutationFn: (id) => apiDelete(`/api/projects/${id}`),
    }),
};
