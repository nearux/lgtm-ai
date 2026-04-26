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
} from '@tsoa/runtime';
import { z } from 'zod';
import HttpStatus from 'http-status';
import { inject, injectable } from 'inversify';
import { AppError } from '../../errors/AppError.js';
import { ProjectsService } from './projects.service.js';
import { PRListService } from './pr-list.service.js';
import { PRDetailService } from './pr-detail.service.js';
import { IssueListService } from './issue-list.service.js';
import { IssueDetailService } from './issue-detail.service.js';
import { CheckoutService } from './checkout-pr-branch.service.js';
import { ChatSessionsService } from './chat-sessions.service.js';
import { GitService } from './git.service.js';
import type {
  Project,
  ProjectDetail,
  CreateProjectBody,
  UpdateProjectBody,
  ErrorResponse,
  GenerateCommitMessageBody,
  CommitMessageResponse,
  CommitAndPushBody,
  CommitAndPushResponse,
} from '../../types/projects.js';
import type {
  PRListItem,
  PaginatedPRList,
  PRDetail,
  PRState,
  CheckoutPRBranchBody,
  CheckoutPRBranchResult,
} from '../../types/pullRequests.js';
import type {
  ChatSessionHistoryResponse,
  ChatSessionScopeType,
  ChatSessionSummary,
} from '../../types/chatSessions.js';
import type {
  IssueListItem,
  IssueDetail,
  IssueState,
  PaginatedIssueList,
} from '../../types/issues.js';

export type {
  Project,
  ProjectDetail,
  CreateProjectBody,
  UpdateProjectBody,
  ErrorResponse,
  PRListItem,
  PaginatedPRList,
  PRDetail,
  ChatSessionSummary,
  ChatSessionHistoryResponse,
  CheckoutPRBranchResult,
  CommitMessageResponse,
  CommitAndPushResponse,
  IssueListItem,
  PaginatedIssueList,
  IssueDetail,
};

const uuidSchema = z.uuid();

@injectable()
@Route('api/projects')
@Tags('Projects')
export class ProjectsController extends Controller {
  constructor(
    @inject(ProjectsService) private readonly projectsService: ProjectsService,
    @inject(PRListService) private readonly prListService: PRListService,
    @inject(PRDetailService) private readonly prDetailService: PRDetailService,
    @inject(IssueListService)
    private readonly issueListService: IssueListService,
    @inject(IssueDetailService)
    private readonly issueDetailService: IssueDetailService,
    @inject(CheckoutService) private readonly checkoutService: CheckoutService,
    @inject(ChatSessionsService)
    private readonly chatSessionsService: ChatSessionsService,
    @inject(GitService) private readonly gitService: GitService
  ) {
    super();
  }

  /**
   * Get all projects
   */
  @Get('/')
  public async listProjects(): Promise<Project[]> {
    return this.projectsService.findAll();
  }

  /**
   * Get a project by ID
   * @param id Project UUID
   */
  @Get('{id}')
  @Response<ErrorResponse>(HttpStatus.NOT_FOUND, 'Project not found')
  public async getProject(@Path() id: string): Promise<ProjectDetail> {
    return this.projectsService.findById(this.parseUUID(id));
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
    return this.projectsService.create(body);
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
    return this.projectsService.update(this.parseUUID(id), body);
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
    await this.projectsService.remove(this.parseUUID(id));
  }

  /**
   * Get list of pull requests for a project
   * @param projectId Project UUID
   * @param page Page number (1-based)
   * @param limit Results per page (max 100)
   * @param state PR state filter: open, closed, or all (default: open)
   * @param origin Git remote name to use (default: origin)
   */
  @Get('{projectId}/prs')
  @Response<ErrorResponse>(HttpStatus.BAD_REQUEST, 'Invalid remote URL')
  @Response<ErrorResponse>(HttpStatus.BAD_REQUEST, 'Invalid remote name')
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
    @Query() state?: PRState,
    @Query() origin?: string
  ): Promise<PaginatedPRList> {
    const repoOwnerName = await this.projectsService.resolveGitHubRepo(
      this.parseUUID(projectId),
      origin ?? 'origin'
    );
    return this.prListService.fetchPRList(repoOwnerName, {
      page,
      limit,
      state,
    });
  }

  /**
   * Get detailed information for a specific pull request
   * @param projectId Project UUID
   * @param prNumber Pull request number
   * @param origin Git remote name to use (default: origin)
   */
  @Get('{projectId}/prs/{prNumber}')
  @Response<ErrorResponse>(HttpStatus.BAD_REQUEST, 'Invalid remote URL')
  @Response<ErrorResponse>(HttpStatus.BAD_REQUEST, 'Invalid remote name')
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
    @Path() prNumber: number,
    @Query() origin?: string
  ): Promise<PRDetail> {
    const repoOwnerName = await this.projectsService.resolveGitHubRepo(
      this.parseUUID(projectId),
      origin ?? 'origin'
    );
    return this.prDetailService.fetchPRDetail(repoOwnerName, prNumber);
  }

  /**
   * Get saved chat sessions for a specific pull request
   * @param projectId Project UUID
   * @param prNumber Pull request number
   * @param scopeType Optional chat target type filter
   * @param scopeTargetId Optional chat target id filter
   */
  @Get('{projectId}/prs/{prNumber}/chat-sessions')
  @Response<ErrorResponse>(HttpStatus.BAD_REQUEST, 'Invalid request')
  @Response<ErrorResponse>(HttpStatus.NOT_FOUND, 'Project not found')
  public async listChatSessions(
    @Path() projectId: string,
    @Path() prNumber: number,
    @Query() scopeType?: ChatSessionScopeType,
    @Query() scopeTargetId?: string
  ): Promise<ChatSessionSummary[]> {
    const parsedProjectId = this.parseUUID(projectId);
    await this.projectsService.findById(parsedProjectId);

    if ((scopeType && !scopeTargetId) || (!scopeType && scopeTargetId)) {
      throw new AppError(
        'scopeType and scopeTargetId must be provided together',
        HttpStatus.BAD_REQUEST
      );
    }

    return this.chatSessionsService.listChatSessions(
      parsedProjectId,
      prNumber,
      {
        scopeType,
        scopeTargetId,
      }
    );
  }

  /**
   * Get saved chat history for a specific pull request session
   * @param projectId Project UUID
   * @param prNumber Pull request number
   * @param sessionId Saved chat session id
   */
  @Get('{projectId}/prs/{prNumber}/chat-sessions/{sessionId}/history')
  @Response<ErrorResponse>(
    HttpStatus.NOT_FOUND,
    'Project or chat session not found'
  )
  public async getChatSessionHistory(
    @Path() projectId: string,
    @Path() prNumber: number,
    @Path() sessionId: string
  ): Promise<ChatSessionHistoryResponse> {
    return this.chatSessionsService.getChatSessionHistory(
      this.parseUUID(projectId),
      prNumber,
      sessionId
    );
  }

  /**
   * Get list of issues for a project
   * @param projectId Project UUID
   * @param page Page number (1-based)
   * @param limit Results per page (max 100)
   * @param state Issue state filter: open or closed (default: open)
   * @param origin Git remote name to use (default: origin)
   */
  @Get('{projectId}/issues')
  @Response<ErrorResponse>(HttpStatus.BAD_REQUEST, 'Invalid remote URL')
  @Response<ErrorResponse>(HttpStatus.BAD_REQUEST, 'Invalid remote name')
  @Response<ErrorResponse>(HttpStatus.NOT_FOUND, 'Project not found')
  @Response<ErrorResponse>(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'Project does not have a configured Git remote'
  )
  @Response<ErrorResponse>(
    HttpStatus.SERVICE_UNAVAILABLE,
    'GitHub CLI unavailable'
  )
  public async listProjectIssues(
    @Path() projectId: string,
    @Query() page?: number,
    @Query() limit?: number,
    @Query() state?: IssueState,
    @Query() origin?: string
  ): Promise<PaginatedIssueList> {
    const repoOwnerName = await this.projectsService.resolveGitHubRepo(
      this.parseUUID(projectId),
      origin ?? 'origin'
    );
    return this.issueListService.fetchIssueList(repoOwnerName, {
      page,
      limit,
      state,
    });
  }

  /**
   * Get detailed information for a specific issue
   * @param projectId Project UUID
   * @param issueNumber Issue number
   * @param origin Git remote name to use (default: origin)
   */
  @Get('{projectId}/issues/{issueNumber}')
  @Response<ErrorResponse>(HttpStatus.BAD_REQUEST, 'Invalid remote URL')
  @Response<ErrorResponse>(HttpStatus.BAD_REQUEST, 'Invalid remote name')
  @Response<ErrorResponse>(HttpStatus.NOT_FOUND, 'Project or issue not found')
  @Response<ErrorResponse>(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'Project does not have a configured Git remote'
  )
  @Response<ErrorResponse>(
    HttpStatus.SERVICE_UNAVAILABLE,
    'GitHub CLI unavailable'
  )
  public async getProjectIssue(
    @Path() projectId: string,
    @Path() issueNumber: number,
    @Query() origin?: string
  ): Promise<IssueDetail> {
    const repoOwnerName = await this.projectsService.resolveGitHubRepo(
      this.parseUUID(projectId),
      origin ?? 'origin'
    );
    return this.issueDetailService.fetchIssueDetail(repoOwnerName, issueNumber);
  }

  /**
   * Checkout the branch associated with a pull request
   * @param projectId Project UUID
   * @param prNumber Pull request number
   * @param body Checkout options (`force` stashes local changes including untracked files, `origin` selects git remote name)
   */
  @Post('{projectId}/prs/{prNumber}/checkout')
  @Response<ErrorResponse>(HttpStatus.BAD_REQUEST, 'Invalid remote URL')
  @Response<ErrorResponse>(HttpStatus.BAD_REQUEST, 'Invalid remote name')
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
  @Response<ErrorResponse>(HttpStatus.CONFLICT, 'Local changes exist')
  public async checkoutProjectPRBranch(
    @Path() projectId: string,
    @Path() prNumber: number,
    @Body() body?: CheckoutPRBranchBody
  ): Promise<CheckoutPRBranchResult> {
    const normalizedProjectId = this.parseUUID(projectId);
    const project = await this.projectsService.findById(normalizedProjectId);
    const repoOwnerName = await this.projectsService.resolveGitHubRepo(
      normalizedProjectId,
      body?.origin ?? 'origin'
    );
    return this.checkoutService.checkoutPRBranch(
      repoOwnerName,
      prNumber,
      project.working_dir,
      { force: body?.force }
    );
  }

  /**
   * Generate a commit message based on current changes using Claude
   * @param projectId Project UUID
   */
  @Post('{projectId}/commit-message')
  @Response<ErrorResponse>(HttpStatus.NOT_FOUND, 'Project not found')
  @Response<ErrorResponse>(
    HttpStatus.INTERNAL_SERVER_ERROR,
    'Failed to generate commit message'
  )
  public async generateCommitMessage(
    @Path() projectId: string,
    @Body() body: GenerateCommitMessageBody
  ): Promise<CommitMessageResponse> {
    const project = await this.projectsService.findById(
      this.parseUUID(projectId)
    );
    const message = await this.gitService.generateCommitMessage(
      project.working_dir,
      body.prContext
    );
    return { message };
  }

  /**
   * Stage all changes, commit, and push to remote
   * @param projectId Project UUID
   */
  @Post('{projectId}/commit-and-push')
  @Response<ErrorResponse>(HttpStatus.NOT_FOUND, 'Project not found')
  @Response<ErrorResponse>(
    HttpStatus.INTERNAL_SERVER_ERROR,
    'Git operation failed'
  )
  public async commitAndPush(
    @Path() projectId: string,
    @Body() body: CommitAndPushBody
  ): Promise<CommitAndPushResponse> {
    const project = await this.projectsService.findById(
      this.parseUUID(projectId)
    );
    return this.gitService.commitAndPush(
      project.working_dir,
      body.commitMessage,
      body.push ?? true
    );
  }

  private parseUUID(id: string): string {
    if (!uuidSchema.safeParse(id).success) {
      throw new AppError('Invalid project id format', HttpStatus.BAD_REQUEST);
    }
    return id;
  }
}
