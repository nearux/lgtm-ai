import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type {
  Project,
  ProjectDetail,
  CreateProjectBody,
  UpdateProjectBody,
} from '../types/api';

export const getProjects = async (): Promise<Project[]> => {
  return apiGet<Project[]>('/api/projects');
};

export const getProject = async (id: string): Promise<ProjectDetail> => {
  return apiGet<ProjectDetail>(`/api/projects/${id}`);
};

export const createProject = async (
  data: CreateProjectBody
): Promise<Project> => {
  return apiPost<Project, CreateProjectBody>('/api/projects', data);
};

export const updateProject = async (
  id: string,
  data: UpdateProjectBody
): Promise<Project> => {
  return apiPatch<Project, UpdateProjectBody>(`/api/projects/${id}`, data);
};

export const deleteProject = async (id: string): Promise<void> => {
  return apiDelete(`/api/projects/${id}`);
};
