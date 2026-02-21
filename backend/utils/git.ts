import HttpStatus from 'http-status';
import { AppError } from '../errors/AppError.js';

/**
 * Parse "owner/repo" from git remote URL
 * Handles: https://github.com/owner/repo.git, git@github.com:owner/repo.git
 */
export function parseGitHubRepo(remoteUrl: string): string {
  // Remove trailing .git if present
  const cleanUrl = remoteUrl.replace(/\.git$/, '');

  // Try SSH format: git@github.com:owner/repo
  const sshMatch = cleanUrl.match(/git@github\.com:(.+)/);
  if (sshMatch) {
    return sshMatch[1];
  }

  // Try HTTPS format: https://github.com/owner/repo
  const httpsMatch = cleanUrl.match(/https:\/\/github\.com\/(.+)/);
  if (httpsMatch) {
    return httpsMatch[1];
  }

  // Try short format: github.com:owner/repo or github.com/owner/repo
  const shortMatch = cleanUrl.match(/github\.com[:/](.+)/);
  if (shortMatch) {
    return shortMatch[1];
  }

  throw new AppError(
    `Unable to parse GitHub repository from remote URL: ${remoteUrl}`,
    HttpStatus.BAD_REQUEST
  );
}
