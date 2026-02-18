import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import HttpStatus from 'http-status';
import { AppError } from '../errors/AppError.js';
import type { PRListItem, PRDetail } from '../types/pullRequests.js';

const execFileAsync = promisify(execFile);

// Validates "owner/repo" format (e.g. "octocat/hello-world")
const REPO_NAME_RE = /^[\w.-]+\/[\w.-]+$/;

function validateRepoOwnerName(repoOwnerName: string): void {
  if (!REPO_NAME_RE.test(repoOwnerName)) {
    throw new AppError('Invalid repository name', HttpStatus.BAD_REQUEST);
  }
}

/**
 * Fetch PR list using gh pr list
 */
export async function fetchPRList(
  repoOwnerName: string
): Promise<PRListItem[]> {
  validateRepoOwnerName(repoOwnerName);

  let stdout: string;

  try {
    ({ stdout } = await execFileAsync('gh', [
      'pr',
      'list',
      '--repo',
      repoOwnerName,
      '--json',
      'number,title,body,assignees,author,createdAt,updatedAt,state',
      '--limit',
      '100',
    ]));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.toLowerCase().includes('authentication')) {
      throw new AppError(
        'GitHub CLI is not available or authenticated',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    throw new AppError(
      'Failed to fetch PR data from GitHub',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  const prs = JSON.parse(stdout) as PRListItem[];
  return prs;
}

/**
 * Fetch PR detail with comments using gh pr view
 */
export async function fetchPRDetail(
  repoOwnerName: string,
  prNumber: number
): Promise<PRDetail> {
  validateRepoOwnerName(repoOwnerName);

  let stdout: string;

  try {
    ({ stdout } = await execFileAsync('gh', [
      'pr',
      'view',
      String(prNumber),
      '--repo',
      repoOwnerName,
      '--json',
      'number,title,body,assignees,author,createdAt,updatedAt,state,comments,reviews,commits',
    ]));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.toLowerCase().includes('could not resolve')) {
      throw new AppError('Pull request not found', HttpStatus.NOT_FOUND);
    }

    if (errorMessage.toLowerCase().includes('authentication')) {
      throw new AppError(
        'GitHub CLI is not available or authenticated',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    throw new AppError(
      'Failed to fetch PR data from GitHub',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  const pr = JSON.parse(stdout) as PRDetail;
  return pr;
}
