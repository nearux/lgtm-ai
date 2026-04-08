import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import HttpStatus from 'http-status';
import { clamp } from 'remeda';
import { AppError } from '../errors/AppError.js';
import { batchAsync } from '../utils/batchAsync.js';
import type {
  PaginatedPRList,
  PRDetail,
  PRState,
  CheckoutPRBranchResult,
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const GRAPHQL_PR_STATES: Record<PRState, string> = {
  open: 'OPEN',
  closed: 'CLOSED, MERGED',
  all: 'OPEN, CLOSED, MERGED',
};

async function fetchPRTotalCount(
  repoOwnerName: string,
  state: PRState
): Promise<number> {
  const [owner, name] = repoOwnerName.split('/');
  const query = `query { repository(owner: "${owner}", name: "${name}") { pullRequests(states: [${GRAPHQL_PR_STATES[state]}]) { totalCount } } }`;

  const { stdout } = await execFileAsync('gh', [
    'api',
    'graphql',
    '-f',
    `query=${query}`,
  ]);
  const result = JSON.parse(stdout) as {
    data?: { repository: { pullRequests: { totalCount: number } } };
    errors?: { message: string }[];
  };

  if (result.errors || !result.data) {
    const message = result.errors?.[0]?.message ?? 'Unknown GraphQL error';
    throw new Error(`GraphQL query failed: ${message}`);
  }

  return result.data.repository.pullRequests.totalCount;
}

/**
 * Fetch PR list using GitHub API via gh
 */
export async function fetchPRList(
  repoOwnerName: string,
  options: { page?: number; limit?: number; state?: PRState } = {}
): Promise<PaginatedPRList> {
  validateRepoOwnerName(repoOwnerName);

  const page = normalizePositiveInt(options.page, DEFAULT_PAGE);
  const limit = clamp(normalizePositiveInt(options.limit, DEFAULT_LIMIT), {
    max: MAX_LIMIT,
  });
  const state = normalizePRState(options.state);
  const apiPath = `repos/${repoOwnerName}/pulls?per_page=${limit}&page=${page}&state=${state}`;

  let prsStdout: string;
  let totalCount: number;

  try {
    [{ stdout: prsStdout }, totalCount] = await Promise.all([
      execFileAsync('gh', ['api', apiPath]),
      fetchPRTotalCount(repoOwnerName, state),
    ]);
  } catch (error) {
    const errorMessage = getErrorMessage(error).toLowerCase();
    if (errorMessage.includes('authentication')) {
      throw new AppError(
        'GitHub CLI is not authenticated. Please check your account in the header.',
        HttpStatus.SERVICE_UNAVAILABLE,
        error
      );
    }

    if (errorMessage.includes('not found')) {
      throw new AppError(
        'Cannot access this repository. Try switching your GitHub account in the header.',
        HttpStatus.FORBIDDEN,
        error
      );
    }

    throw new AppError(
      'Failed to fetch PR data from GitHub',
      HttpStatus.INTERNAL_SERVER_ERROR,
      error
    );
  }

  const prs = JSON.parse(prsStdout) as GitHubPullRequest[];
  const prsWithCounts = await enrichMissingConversationCounts(
    repoOwnerName,
    prs
  );
  const lastPage = Math.max(1, Math.ceil(totalCount / limit));

  return {
    items: prsWithCounts.map((pr) => PRListItemDto.fromGitHub(pr)),
    lastPage,
  };
}

const ENRICH_BATCH_SIZE = 10;

async function enrichMissingConversationCounts(
  repoOwnerName: string,
  prs: GitHubPullRequest[]
): Promise<GitHubPullRequest[]> {
  return batchAsync(prs, ENRICH_BATCH_SIZE, async (pr) => {
    const hasCommentsCount = typeof pr.comments === 'number';
    const hasReviewCommentsCount = typeof pr.review_comments === 'number';

    if (hasCommentsCount && hasReviewCommentsCount) {
      return pr;
    }

    try {
      const { stdout } = await execFileAsync('gh', [
        'api',
        `repos/${repoOwnerName}/pulls/${pr.number}`,
      ]);
      const prDetail = JSON.parse(stdout) as {
        comments?: number | null;
        review_comments?: number | null;
      };

      return {
        ...pr,
        comments: pr.comments ?? prDetail.comments ?? 0,
        review_comments: pr.review_comments ?? prDetail.review_comments ?? 0,
      };
    } catch (err) {
      console.error(
        `[fetchPRList] Failed to fetch conversation counts for PR #${pr.number}:`,
        err
      );

      return {
        ...pr,
        comments: pr.comments ?? 0,
        review_comments: pr.review_comments ?? 0,
      };
    }
  });
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
      'number,title,body,baseRefName,headRefName,assignees,author,createdAt,updatedAt,state,comments,reviews,commits',
    ]));
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    const msg = errorMessage.toLowerCase();

    if (msg.includes('authentication')) {
      throw new AppError(
        'GitHub CLI is not authenticated. Please check your account in the header.',
        HttpStatus.SERVICE_UNAVAILABLE,
        error
      );
    }

    if (msg.includes('could not resolve') || msg.includes('not found')) {
      throw new AppError(
        'Cannot access this repository. Try switching your GitHub account in the header.',
        HttpStatus.FORBIDDEN,
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

export async function checkoutPRBranch(
  repoOwnerName: string,
  prNumber: number,
  workingDir: string,
  options: { force?: boolean } = {}
): Promise<CheckoutPRBranchResult> {
  validateRepoOwnerName(repoOwnerName);

  const force = options.force === true;

  const { stdout: gitStatusStdout } = await execFileAsync(
    'git',
    ['status', '--porcelain', '--untracked-files=normal'],
    { cwd: workingDir }
  );

  const isDirty = gitStatusStdout.trim().length > 0;
  let stashed = false;

  if (isDirty && !force) {
    throw new AppError(
      'Cannot checkout PR branch because local changes exist. Retry with force=true to auto-stash.',
      HttpStatus.CONFLICT
    );
  }

  if (isDirty && force) {
    try {
      await execFileAsync(
        'git',
        [
          'stash',
          'push',
          '--include-untracked',
          '-m',
          `lgtmai: auto-stash before PR #${prNumber} checkout`,
        ],
        { cwd: workingDir }
      );
      stashed = true;
    } catch (error) {
      throw new AppError(
        'Failed to stash local changes before checkout',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }

  try {
    await execFileAsync(
      'gh',
      ['pr', 'checkout', String(prNumber), '--repo', repoOwnerName],
      { cwd: workingDir }
    );
  } catch (error) {
    const errorMessage = getErrorMessage(error).toLowerCase();

    if (errorMessage.includes('could not resolve')) {
      throw new AppError('Pull request not found', HttpStatus.NOT_FOUND, error);
    }

    if (errorMessage.includes('authentication')) {
      throw new AppError(
        'GitHub CLI is not available or authenticated',
        HttpStatus.SERVICE_UNAVAILABLE,
        error
      );
    }

    throw new AppError(
      'Failed to checkout PR branch',
      HttpStatus.INTERNAL_SERVER_ERROR,
      error
    );
  }

  const { stdout: currentBranch } = await execFileAsync(
    'git',
    ['branch', '--show-current'],
    { cwd: workingDir }
  );
  const targetBranch = currentBranch.trim();

  return {
    success: true,
    message: 'Checked out PR branch successfully',
    targetBranch,
    stashed,
  };
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
