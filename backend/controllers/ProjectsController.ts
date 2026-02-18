import {
  Controller,
  Route,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Path,
  Response,
  Tags,
  SuccessResponse,
} from 'tsoa';
import * as projectsService from '../services/projects.js';
import type {
  Project,
  ProjectDetail,
  CreateProjectBody,
  UpdateProjectBody,
  ErrorResponse,
} from '../types/projects.js';

export type {
  Project,
  ProjectDetail,
  CreateProjectBody,
  UpdateProjectBody,
  ErrorResponse,
};

@Route('api/projects')
@Tags('Projects')
export class ProjectsController extends Controller {
  /**
   * Get all projects
   */
  @Get('/')
  public async listProjects(): Promise<Project[]> {
    return projectsService.findAll();
  }

  /**
   * Get a project by ID
   * @param id Project UUID
   */
  @Get('{id}')
  @Response<ErrorResponse>(404, 'Project not found')
  public async getProject(@Path() id: string): Promise<ProjectDetail> {
    return projectsService.findById(id);
  }

  /**
   * Create a new project
   */
  @Post('/')
  @SuccessResponse(201, 'Created')
  @Response<ErrorResponse>(400, 'Validation error')
  @Response<ErrorResponse>(422, 'Working directory does not exist')
  public async createProject(
    @Body() body: CreateProjectBody
  ): Promise<Project> {
    this.setStatus(201);
    return projectsService.create(body);
  }

  /**
   * Update a project by ID
   * @param id Project UUID
   */
  @Patch('{id}')
  @Response<ErrorResponse>(400, 'Validation error')
  @Response<ErrorResponse>(404, 'Project not found')
  @Response<ErrorResponse>(422, 'Working directory does not exist')
  public async updateProject(
    @Path() id: string,
    @Body() body: UpdateProjectBody
  ): Promise<Project> {
    return projectsService.update(id, body);
  }

  /**
   * Delete a project by ID
   * @param id Project UUID
   */
  @Delete('{id}')
  @SuccessResponse(204, 'No Content')
  @Response<ErrorResponse>(404, 'Project not found')
  public async deleteProject(@Path() id: string): Promise<void> {
    this.setStatus(204);
    await projectsService.remove(id);
  }
}
