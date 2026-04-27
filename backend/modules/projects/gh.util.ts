import HttpStatus from 'http-status';
import { AppError } from '../../errors/AppError.js';

const REPO_NAME_RE = /^[\w.-]+\/[\w.-]+$/;

export function validateRepoOwnerName(repoOwnerName: string): void {
  if (!REPO_NAME_RE.test(repoOwnerName)) {
    throw new AppError('Invalid repository name', HttpStatus.BAD_REQUEST);
  }
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type GhErrorContext = 'fetch' | 'checkout';

export function mapGhError(error: unknown, context: GhErrorContext): AppError {
  const msg = getErrorMessage(error).toLowerCase();

  if (msg.includes('authentication')) {
    return new AppError(
      'GitHub CLI is not authenticated. Please check your account in the header.',
      HttpStatus.SERVICE_UNAVAILABLE,
      error
    );
  }

  if (context === 'fetch') {
    if (msg.includes('not found') || msg.includes('could not resolve')) {
      return new AppError(
        'Cannot access this repository. Try switching your GitHub account in the header.',
        HttpStatus.FORBIDDEN,
        error
      );
    }
    return new AppError(
      'Failed to fetch data from GitHub',
      HttpStatus.INTERNAL_SERVER_ERROR,
      error
    );
  }

  if (msg.includes('could not resolve')) {
    return new AppError('Pull request not found', HttpStatus.NOT_FOUND, error);
  }
  return new AppError(
    'Failed to checkout PR branch',
    HttpStatus.INTERNAL_SERVER_ERROR,
    error
  );
}
