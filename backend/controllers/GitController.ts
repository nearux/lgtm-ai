import { Controller, Route, Post, Body, Response, Tags } from '@tsoa/runtime';
import HttpStatus from 'http-status';
import * as gitService from '../services/git.js';
import type { ErrorResponse } from '../types/index.js';

interface CommitMessageRequest {
  workingDir: string;
  prContext?: {
    title: string;
    body: string;
    reviewComment: string;
  };
}

interface CommitMessageResponse {
  message: string;
}

interface CommitAndPushRequest {
  workingDir: string;
  commitMessage: string;
}

interface CommitAndPushResponse {
  success: boolean;
  commitHash?: string;
  error?: string;
}

export type {
  CommitMessageRequest,
  CommitMessageResponse,
  CommitAndPushRequest,
  CommitAndPushResponse,
};

@Route('api/git')
@Tags('Git')
export class GitController extends Controller {
  /**
   * Generate a commit message based on current changes using Claude
   */
  @Post('/commit-message')
  @Response<ErrorResponse>(
    HttpStatus.INTERNAL_SERVER_ERROR,
    'Failed to generate commit message'
  )
  public async generateCommitMessage(
    @Body() body: CommitMessageRequest
  ): Promise<CommitMessageResponse> {
    gitService.validateWorkingDir(body.workingDir);
    const message = await gitService.generateCommitMessage(
      body.workingDir,
      body.prContext
    );
    return { message };
  }

  /**
   * Stage all changes, commit, and push to remote
   */
  @Post('/commit-and-push')
  @Response<ErrorResponse>(
    HttpStatus.INTERNAL_SERVER_ERROR,
    'Git operation failed'
  )
  public async commitAndPush(
    @Body() body: CommitAndPushRequest
  ): Promise<CommitAndPushResponse> {
    gitService.validateWorkingDir(body.workingDir);
    return gitService.commitAndPush(body.workingDir, body.commitMessage);
  }
}
