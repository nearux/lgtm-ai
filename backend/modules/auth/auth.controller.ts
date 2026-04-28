import {
  Controller,
  Route,
  Get,
  Post,
  Body,
  Response,
  Tags,
} from '@tsoa/runtime';
import HttpStatus from 'http-status';
import { inject, injectable } from 'inversify';
import { AuthService } from './auth.service.js';
import type { GitHubAuthStatus, SwitchAccountBody } from './auth.types.js';
import type { ErrorResponse } from '../../types/common.js';

export type { GitHubAuthStatus, SwitchAccountBody };

@injectable()
@Route('api/auth')
@Tags('Auth')
export class AuthController extends Controller {
  constructor(@inject(AuthService) private readonly authService: AuthService) {
    super();
  }

  /**
   * Get current GitHub CLI authentication status
   */
  @Get('/github/status')
  @Response<ErrorResponse>(
    HttpStatus.SERVICE_UNAVAILABLE,
    'GitHub CLI unavailable'
  )
  public async getGitHubStatus(): Promise<GitHubAuthStatus> {
    return this.authService.getStatus();
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
    return this.authService.switchAccount(body.username);
  }
}
