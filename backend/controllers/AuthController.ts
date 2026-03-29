// backend/controllers/AuthController.ts
import { Controller, Route, Get, Post, Body, Response, Tags } from 'tsoa';
import HttpStatus from 'http-status';
import * as authService from '../services/auth.js';
import type {
  GitHubAuthStatus,
  SwitchAccountBody,
  ErrorResponse,
} from '../types/index.js';

export type { GitHubAuthStatus, SwitchAccountBody };

@Route('api/auth')
@Tags('Auth')
export class AuthController extends Controller {
  /**
   * Get current GitHub CLI authentication status
   */
  @Get('/github/status')
  @Response<ErrorResponse>(
    HttpStatus.SERVICE_UNAVAILABLE,
    'GitHub CLI unavailable'
  )
  public async getGitHubStatus(): Promise<GitHubAuthStatus> {
    return authService.getStatus();
  }

  /**
   * Switch the active GitHub CLI account
   */
  @Post('/github/switch')
  @Response<ErrorResponse>(HttpStatus.BAD_REQUEST, 'Switch failed')
  @Response<ErrorResponse>(
    HttpStatus.SERVICE_UNAVAILABLE,
    'GitHub CLI unavailable'
  )
  public async switchGitHubAccount(
    @Body() body: SwitchAccountBody
  ): Promise<GitHubAuthStatus> {
    return authService.switchAccount(body.username);
  }
}
