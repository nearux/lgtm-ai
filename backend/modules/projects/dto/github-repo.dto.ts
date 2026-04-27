import HttpStatus from 'http-status';
import { AppError } from '../../../errors/AppError.js';
import type { GitHubRepo } from '../types.js';

export class GitHubRepoDto implements GitHubRepo {
  owner: string;
  repo: string;

  constructor(data: GitHubRepo) {
    this.owner = data.owner;
    this.repo = data.repo;
  }

  toString(): string {
    return `${this.owner}/${this.repo}`;
  }

  /**
   * Parse owner/repo from a git remote URL.
   * Handles:
   *   - SSH:   git@github.com:owner/repo.git
   *   - HTTPS: https://github.com/owner/repo.git
   *   - Short: github.com:owner/repo or github.com/owner/repo
   */
  static fromRemoteUrl(remoteUrl: string): GitHubRepoDto {
    const cleanUrl = remoteUrl.replace(/\.git$/, '');

    const patterns = [
      /git@github\.com:(.+)/,
      /https?:\/\/(?:[^@]+@)?github\.com\/(.+)/,
      /github\.com[:/](.+)/,
    ];

    for (const pattern of patterns) {
      const match = cleanUrl.match(pattern);
      if (match) {
        const [owner, repo] = match[1].split('/');
        return new GitHubRepoDto({ owner, repo });
      }
    }

    throw new AppError(
      `Unable to parse GitHub repository from remote URL: ${remoteUrl}`,
      HttpStatus.BAD_REQUEST
    );
  }
}
