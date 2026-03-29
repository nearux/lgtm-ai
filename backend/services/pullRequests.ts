import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import HttpStatus from 'http-status';
import { clamp } from 'remeda';
import { AppError } from '../errors/AppError.js';
import type {
  PRListItem,
  PRDetail,
  PRState,
  GitHubPullRequest,
  GhPRDetail,
  GhReviewInlineComment,
} from '../types/pullRequests.js';
import { PRListItemDto } from '../dtos/pullRequestsDto.js';
import { PRDetailDto } from '../dtos/prDetailDto.js';

const execFileAsync = promisify(execFile);

// Validates "owner/repo" format (e.g. "octocat/hello-world")
const REPO_NAME_RE = /^[\w.-]+\/[\w.-]+$/;

function validateRepoOwnerName(repoOwnerName: string): void {
  if (!REPO_NAME_RE.test(repoOwnerName)) {
    throw new AppError('Invalid repository name', HttpStatus.BAD_REQUEST);
  }
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;

function normalizePositiveInt(
  value: number | undefined,
  fallback: number
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return clamp(Math.trunc(value), { min: 1 });
}

const VALID_PR_STATES: PRState[] = ['open', 'closed', 'all'];

function normalizePRState(state: string | undefined): PRState {
  if (state && VALID_PR_STATES.includes(state as PRState)) {
    return state as PRState;
  }
  return 'open';
}

/**
 * Fetch PR list using GitHub API via gh
 */
export async function fetchPRList(
  repoOwnerName: string,
  options: { page?: number; limit?: number; state?: PRState } = {}
): Promise<PRListItem[]> {
  validateRepoOwnerName(repoOwnerName);

  const page = normalizePositiveInt(options.page, DEFAULT_PAGE);
  const limit = clamp(normalizePositiveInt(options.limit, DEFAULT_LIMIT), {
    max: MAX_LIMIT,
  });
  const state = normalizePRState(options.state);
  const apiPath = `repos/${repoOwnerName}/pulls?per_page=${limit}&page=${page}&state=${state}`;

  let stdout: string;

  try {
    ({ stdout } = await execFileAsync('gh', ['api', apiPath]));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.toLowerCase().includes('authentication')) {
      throw new AppError(
        'GitHub CLI is not authenticated. Please check your account in the header.',
        HttpStatus.SERVICE_UNAVAILABLE,
        error
      );
    }

    throw new AppError(
      'Failed to fetch PR data from GitHub',
      HttpStatus.INTERNAL_SERVER_ERROR,
      error
    );
  }

  const prs = JSON.parse(stdout) as GitHubPullRequest[];

  return prs.map((pr) => PRListItemDto.fromGitHub(pr));
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
      throw new AppError('Pull request not found', HttpStatus.NOT_FOUND, error);
    }

    if (errorMessage.toLowerCase().includes('authentication')) {
      throw new AppError(
        'GitHub CLI is not authenticated. Please check your account in the header.',
        HttpStatus.SERVICE_UNAVAILABLE,
        error
      );
    }

    throw new AppError(
      'Failed to fetch PR data from GitHub',
      HttpStatus.INTERNAL_SERVER_ERROR,
      error
    );
  }

  const raw = JSON.parse(stdout) as GhPRDetail;
  const inlineCommentsByReview = await fetchReviewInlineComments(
    repoOwnerName,
    prNumber,
    raw.reviews.map((r) => r.id)
  );
  return PRDetailDto.fromGh(raw, inlineCommentsByReview);
}

async function fetchReviewInlineComments(
  repoOwnerName: string,
  prNumber: number,
  reviewIds: string[]
): Promise<Map<string, GhReviewInlineComment[]>> {
  const hasNodeIds = reviewIds.some((id) => id.startsWith('PRR_'));
  let reviewsList: Array<{ id: number; node_id: string }> = [];
  if (hasNodeIds) {
    try {
      const { stdout } = await execFileAsync('gh', [
        'api',
        `repos/${repoOwnerName}/pulls/${prNumber}/reviews`,
      ]);
      reviewsList = JSON.parse(stdout);
    } catch (err) {
      console.error(
        `[fetchReviewInlineComments] Failed to fetch reviews list for PR #${prNumber}:`,
        err
      );
    }
  }

  const entries = await Promise.all(
    reviewIds.map(async (reviewId) => {
      let numericId: string | null;
      if (reviewId.startsWith('PRR_')) {
        const match = reviewsList.find((r) => r.node_id === reviewId);
        numericId = match ? String(match.id) : null;
      } else {
        numericId = reviewId;
      }

      if (!numericId) return [reviewId, [] as GhReviewInlineComment[]] as const;

      try {
        const { stdout } = await execFileAsync('gh', [
          'api',
          `repos/${repoOwnerName}/pulls/${prNumber}/reviews/${numericId}/comments`,
        ]);
        return [
          reviewId,
          JSON.parse(stdout) as GhReviewInlineComment[],
        ] as const;
      } catch (err) {
        console.error(
          `[fetchReviewInlineComments] Failed to fetch comments for reviewId "${reviewId}" (numericId: ${numericId}):`,
          err
        );
        return [reviewId, [] as GhReviewInlineComment[]] as const;
      }
    })
  );
  return new Map(entries);
}
