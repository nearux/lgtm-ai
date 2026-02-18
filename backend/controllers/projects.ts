import { Request, Response } from 'express';
import { wrapAsync } from '../middlewares/wrapAsync.js';
import * as projectsService from '../services/projects.js';
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectIdSchema,
  ProjectDetailSchema,
  ProjectListSchema,
} from '../schemas/projects.js';
import { parseSchema } from '../utils/parseSchema.js';

export const createProject = wrapAsync(async (req: Request, res: Response) => {
  const { name, description, working_dir } = parseSchema(
    CreateProjectSchema,
    req.body
  );
  const project = await projectsService.create({
    name,
    description,
    working_dir,
  });
  res.status(201).json(project);
});

export const listProjects = wrapAsync(async (_req: Request, res: Response) => {
  const projects = await projectsService.findAll();
  res.json(parseSchema(ProjectListSchema, projects));
});

export const getProject = wrapAsync(async (req: Request, res: Response) => {
  const { id } = parseSchema(ProjectIdSchema, req.params);
  const project = await projectsService.findById(id);
  res.json(parseSchema(ProjectDetailSchema, project));
});

export const updateProject = wrapAsync(async (req: Request, res: Response) => {
  const { id } = parseSchema(ProjectIdSchema, req.params);
  const { name, description, working_dir } = parseSchema(
    UpdateProjectSchema,
    req.body
  );
  const project = await projectsService.update(id, {
    name,
    description,
    working_dir,
  });
  res.json(project);
});

export const deleteProject = wrapAsync(async (req: Request, res: Response) => {
  const { id } = parseSchema(ProjectIdSchema, req.params);
  await projectsService.remove(id);
  res.status(204).send();
});
