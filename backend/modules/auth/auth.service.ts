import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import HttpStatus from 'http-status';
import { injectable } from 'inversify';
import { AppError } from '../../errors/AppError.js';
import type { GitHubAuthStatus, GitHubAccount } from '../../types/auth.js';

const execFileAsync = promisify(execFile);

/**
 * Parse `gh auth status` output to extract account info.
 *
 * Output format (gh 2.x):
 *   github.com
 *     ✓ Logged in to github.com account user1 (keyring)
 *     - Active account: true
 */
function parseAuthStatus(output: string): GitHubAccount[] {
  const accounts: GitHubAccount[] = [];
  const lines = output.split('\n');

  let currentUsername: string | null = null;

  for (const line of lines) {
    const accountMatch = line.match(/Logged in to \S+ account (\S+)/);
    if (accountMatch) {
      currentUsername = accountMatch[1];
    }

    const activeMatch = line.match(/Active account:\s*(true|false)/);
    if (activeMatch && currentUsername) {
      accounts.push({
        username: currentUsername,
        active: activeMatch[1] === 'true',
      });
      currentUsername = null;
    }
  }

  return accounts;
}

const GITHUB_USERNAME_RE =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

@injectable()
export class AuthService {
  async getStatus(): Promise<GitHubAuthStatus> {
    let output: string;

    try {
      const result = await execFileAsync('gh', ['auth', 'status']);
      output = result.stderr || result.stdout;
    } catch (error) {
      if (error && typeof error === 'object' && 'stderr' in error) {
        output = (error as { stderr: string }).stderr;
      } else {
        throw new AppError(
          'GitHub CLI is not available',
          HttpStatus.SERVICE_UNAVAILABLE,
          error
        );
      }
    }

    const accounts = parseAuthStatus(output);

    if (accounts.length === 0) {
      throw new AppError(
        'No GitHub accounts found. Run "gh auth login" in your terminal.',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    const active = accounts.find((a) => a.active);
    return {
      activeAccount: active?.username ?? accounts[0].username,
      accounts,
    };
  }

  async switchAccount(username: string): Promise<GitHubAuthStatus> {
    if (!GITHUB_USERNAME_RE.test(username)) {
      throw new AppError('Invalid GitHub username', HttpStatus.BAD_REQUEST);
    }

    try {
      await execFileAsync('gh', ['auth', 'switch', '--user', username]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new AppError(
        `Failed to switch GitHub account to "${username}": ${errorMessage}`,
        HttpStatus.BAD_REQUEST,
        error
      );
    }

    return this.getStatus();
  }
}
