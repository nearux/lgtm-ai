import { z } from 'zod';

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  working_dir: z.string().min(1, 'working_dir is required'),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1, 'name is required').optional(),
  description: z.string().optional(),
  working_dir: z.string().min(1, 'working_dir is required').optional(),
});

export const ProjectIdSchema = z.object({
  id: z.string().check(z.uuid({ error: 'id must be a valid UUID' })),
});

const ProjectSchema = z.object({
  id: z.string().check(z.uuid()),
  name: z.string(),
  description: z.string().nullable(),
  working_dir: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

const ProjectGitInfoSchema = z.object({
  remoteUrl: z.string().nullable(),
  currentBranch: z.string().nullable(),
  branches: z.array(z.string()),
});

export const ProjectDetailSchema = ProjectSchema.extend({
  gitInfo: ProjectGitInfoSchema,
});

export const ProjectListSchema = z.array(ProjectSchema);

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
