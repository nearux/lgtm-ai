import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type {
  Project,
  ProjectDetail,
  CreateProjectBody,
  UpdateProjectBody,
} from '@lgtmai/backend/types';

export type { Project, ProjectDetail, CreateProjectBody, UpdateProjectBody };

export const getProjectList = () => apiGet<Project[]>('/api/projects');

export const getProjectDetail = (id: string) =>
  apiGet<ProjectDetail>(`/api/projects/${id}`);

export const createProject = (data: CreateProjectBody) =>
  apiPost<Project, CreateProjectBody>('/api/projects', data);

export const updateProject = (id: string, data: UpdateProjectBody) =>
  apiPatch<Project, UpdateProjectBody>(`/api/projects/${id}`, data);

export const deleteProject = (id: string) => apiDelete(`/api/projects/${id}`);
