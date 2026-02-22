import {
  Controller,
  Route,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Path,
  Query,
  Response,
  Tags,
  SuccessResponse,
} from 'tsoa';
import { z } from 'zod';
import HttpStatus from 'http-status';
import { AppError } from '../errors/AppError.js';

const uuidSchema = z.uuid();

function parseUUID(id: string): string {
  if (!uuidSchema.safeParse(id).success) {
    throw new AppError('Invalid project id format', HttpStatus.BAD_REQUEST);
  }
  return id;
}
import * as projectsService from '../services/projects.js';
import * as pullRequestsService from '../services/pullRequests.js';
import * as gitUtils from '../utils/git.js';
import type {
  Project,
  ProjectDetail,
  CreateProjectBody,
  UpdateProjectBody,
  ErrorResponse,
} from '../types/projects.js';
import type { PRListItem, PRDetail, PRState } from '../types/pullRequests.js';

export type {
  Project,
  ProjectDetail,
  CreateProjectBody,
  UpdateProjectBody,
  ErrorResponse,
  PRListItem,
  PRDetail,
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
  @Response<ErrorResponse>(HttpStatus.NOT_FOUND, 'Project not found')
  public async getProject(@Path() id: string): Promise<ProjectDetail> {
    return projectsService.findById(parseUUID(id));
  }

  /**
   * Create a new project
   */
  @Post('/')
  @SuccessResponse(HttpStatus.CREATED, 'Created')
  @Response<ErrorResponse>(HttpStatus.BAD_REQUEST, 'Validation error')
  @Response<ErrorResponse>(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'Working directory does not exist'
  )
  public async createProject(
    @Body() body: CreateProjectBody
  ): Promise<Project> {
    this.setStatus(HttpStatus.CREATED);
    return projectsService.create(body);
  }

  /**
   * Update a project by ID
   * @param id Project UUID
   */
  @Patch('{id}')
  @Response<ErrorResponse>(HttpStatus.BAD_REQUEST, 'Validation error')
  @Response<ErrorResponse>(HttpStatus.NOT_FOUND, 'Project not found')
  @Response<ErrorResponse>(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'Working directory does not exist'
  )
  public async updateProject(
    @Path() id: string,
    @Body() body: UpdateProjectBody
  ): Promise<Project> {
    return projectsService.update(parseUUID(id), body);
  }

  /**
   * Delete a project by ID
   * @param id Project UUID
   */
  @Delete('{id}')
  @SuccessResponse(HttpStatus.NO_CONTENT, 'No Content')
  @Response<ErrorResponse>(HttpStatus.NOT_FOUND, 'Project not found')
  public async deleteProject(@Path() id: string): Promise<void> {
    this.setStatus(HttpStatus.NO_CONTENT);
    await projectsService.remove(parseUUID(id));
  }

  /**
   * Get list of pull requests for a project
   * @param projectId Project UUID
   * @param page Page number (1-based)
   * @param limit Results per page (max 100)
   * @param state PR state filter: open, closed, or all (default: open)
   */
  @Get('{projectId}/prs')
  @Response<ErrorResponse>(HttpStatus.BAD_REQUEST, 'Invalid remote URL')
  @Response<ErrorResponse>(HttpStatus.NOT_FOUND, 'Project not found')
  @Response<ErrorResponse>(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'Project does not have a configured Git remote'
  )
  @Response<ErrorResponse>(
    HttpStatus.SERVICE_UNAVAILABLE,
    'GitHub CLI unavailable'
  )
  public async listProjectPRs(
    @Path() projectId: string,
    @Query() page?: number,
    @Query() limit?: number,
    @Query() state?: PRState
  ): Promise<PRListItem[]> {
    const project = await projectsService.findById(parseUUID(projectId));

    if (!project.gitInfo.remoteUrl) {
      throw new AppError(
        'Project does not have a configured Git remote',
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }

    const repoOwnerName = gitUtils.parseGitHubRepo(project.gitInfo.remoteUrl);
    return pullRequestsService.fetchPRList(repoOwnerName, {
      page,
      limit,
      state,
    });
  }

  /**
   * Get detailed information for a specific pull request
   * @param projectId Project UUID
   * @param prNumber Pull request number
   */
  @Get('{projectId}/prs/{prNumber}')
  @Response<ErrorResponse>(HttpStatus.BAD_REQUEST, 'Invalid remote URL')
  @Response<ErrorResponse>(
    HttpStatus.NOT_FOUND,
    'Project or pull request not found'
  )
  @Response<ErrorResponse>(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'Project does not have a configured Git remote'
  )
  @Response<ErrorResponse>(
    HttpStatus.SERVICE_UNAVAILABLE,
    'GitHub CLI unavailable'
  )
  public async getProjectPR(
    @Path() projectId: string,
    @Path() prNumber: number
  ): Promise<PRDetail> {
    const project = await projectsService.findById(parseUUID(projectId));

    if (!project.gitInfo.remoteUrl) {
      throw new AppError(
        'Project does not have a configured Git remote',
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }

    const repoOwnerName = gitUtils.parseGitHubRepo(project.gitInfo.remoteUrl);
    return pullRequestsService.fetchPRDetail(repoOwnerName, prNumber);
  }
}
