import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import HttpStatus from 'http-status';
import { clamp } from 'remeda';
import { AppError } from '../errors/AppError.js';
import type {
  PaginatedPRList,
  PRDetail,
  PRState,
  CheckoutPRBranchResult,
  GhPRDetail,
  GhReviewInlineComment,
  GraphQLPRListResponse,
  GraphQLCursorResponse,
  GraphQLPRNode,
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
      'Failed to fetch PR data from GitHub',
      HttpStatus.INTERNAL_SERVER_ERROR,
      error
    );
  }

  // context === 'checkout'
  if (msg.includes('could not resolve')) {
    return new AppError('Pull request not found', HttpStatus.NOT_FOUND, error);
  }
  return new AppError(
    'Failed to checkout PR branch',
    HttpStatus.INTERNAL_SERVER_ERROR,
    error
  );
}

const GRAPHQL_PR_STATES: Record<PRState, string[]> = {
  open: ['OPEN'],
  closed: ['CLOSED', 'MERGED'],
  all: ['OPEN', 'CLOSED', 'MERGED'],
};

function statesArgs(state: PRState): string[] {
  return GRAPHQL_PR_STATES[state].flatMap((s) => ['-f', `states[]=${s}`]);
}

// Assumes repoOwnerName has been validated by validateRepoOwnerName() before calling.
async function resolvePageCursor(
  repoOwnerName: string,
  state: PRState,
  skip: number
): Promise<string | null> {
  const [owner, name] = repoOwnerName.split('/');
  const query = `query($owner: String!, $name: String!, $skip: Int!, $states: [PullRequestState!]!) { repository(owner: $owner, name: $name) { pullRequests(first: $skip, states: $states, orderBy: {field: CREATED_AT, direction: DESC}) { pageInfo { endCursor } } } }`;

  const { stdout } = await execFileAsync('gh', [
    'api',
    'graphql',
    '-f',
    `query=${query}`,
    '-f',
    `owner=${owner}`,
    '-f',
    `name=${name}`,
    '-F',
    `skip=${skip}`,
    ...statesArgs(state),
  ]);
  const result = JSON.parse(stdout) as GraphQLCursorResponse;

  if (result.errors || !result.data) {
    const message = result.errors?.[0]?.message ?? 'Unknown GraphQL error';
    throw new Error(`GraphQL query failed: ${message}`);
  }

  return result.data.repository.pullRequests.pageInfo.endCursor;
}

async function fetchPRListGraphQL(
  repoOwnerName: string,
  state: PRState,
  limit: number,
  cursor: string | null
) {
  const [owner, name] = repoOwnerName.split('/');
  const query = `query($owner: String!, $name: String!, $limit: Int!, $states: [PullRequestState!]!, $after: String) {
  repository(owner: $owner, name: $name) {
    pullRequests(first: $limit, states: $states, after: $after, orderBy: {field: CREATED_AT, direction: DESC}) {
      totalCount
      nodes {
        number
        title
        body
        state
        createdAt
        updatedAt
        comments { totalCount }
        reviewThreads { totalCount }
        assignees(first: 20) {
          nodes { id login name }
        }
        author {
          login
          avatarUrl
          ... on User { id name }
          ... on Bot { id }
        }
      }
    }
  }
}`;

  const { stdout } = await execFileAsync('gh', [
    'api',
    'graphql',
    '-f',
    `query=${query}`,
    '-f',
    `owner=${owner}`,
    '-f',
    `name=${name}`,
    '-F',
    `limit=${limit}`,
    ...statesArgs(state),
    ...(cursor ? ['-f', `after=${cursor}`] : []),
  ]);
  const result = JSON.parse(stdout) as GraphQLPRListResponse;

  if (result.errors || !result.data) {
    const message = result.errors?.[0]?.message ?? 'Unknown GraphQL error';
    throw new Error(`GraphQL query failed: ${message}`);
  }

  return result.data.repository.pullRequests;
}

/**
 * Fetch PR list using GitHub GraphQL API via gh
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

  let totalCount: number;
  let nodes: GraphQLPRNode[];

  try {
    let cursor: string | null = null;
    if (page > 1) {
      const skip = (page - 1) * limit;
      cursor = await resolvePageCursor(repoOwnerName, state, skip);
      if (cursor === null) {
        return { items: [], lastPage: 1 };
      }
    }

    ({ totalCount, nodes } = await fetchPRListGraphQL(
      repoOwnerName,
      state,
      limit,
      cursor
    ));
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

  const lastPage = Math.max(1, Math.ceil(totalCount / limit));

  return {
    items: nodes.map((node) => PRListItemDto.fromGraphQL(node)),
    lastPage,
  };
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
  const reviewIds = raw.reviews.map((r) => r.id);

  const inlineCommentsByReview = await fetchReviewInlineComments(
    repoOwnerName,
    prNumber,
    reviewIds
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

async function fetchRawPRInlineComments(
  repoOwnerName: string,
  prNumber: number
): Promise<GhReviewInlineComment[]> {
  const { stdout } = await execFileAsync('gh', [
    'api',
    '--method',
    'GET',
    `repos/${repoOwnerName}/pulls/${prNumber}/comments`,
  ]);
  return JSON.parse(stdout) as GhReviewInlineComment[];
}

async function resolveNodeIdToNumericId(
  repoOwnerName: string,
  prNumber: number,
  reviewIds: string[]
): Promise<Map<string, number>> {
  const nodeIds = reviewIds.filter((id) => id.startsWith('PRR_'));
  if (nodeIds.length === 0) return new Map();

  try {
    const { stdout } = await execFileAsync('gh', [
      'api',
      `repos/${repoOwnerName}/pulls/${prNumber}/reviews`,
    ]);
    const reviewsList = JSON.parse(stdout) as Array<{
      id: number;
      node_id: string;
    }>;
    return new Map(
      reviewsList
        .filter((r) => nodeIds.includes(r.node_id))
        .map((r) => [r.node_id, r.id])
    );
  } catch (err) {
    console.error(
      `[fetchReviewInlineComments] Failed to fetch reviews list for PR #${prNumber}:`,
      err
    );
    return new Map();
  }
}

/**
 * Builds a map from numeric review ID → original review ID string.
 * Handles both plain numeric IDs ("123") and GitHub node IDs ("PRR_xxx").
 */
export function buildReviewIdMap(
  reviewIds: string[],
  nodeIdToNumericId: Map<string, number>
): Map<number, string> {
  const toNumericId = (reviewId: string): number | null => {
    if (reviewId.startsWith('PRR_')) {
      return nodeIdToNumericId.get(reviewId) ?? null;
    }
    const parsed = parseInt(reviewId, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  return new Map(
    reviewIds.flatMap((reviewId) => {
      const numericId = toNumericId(reviewId);
      return numericId !== null ? [[numericId, reviewId]] : [];
    })
  );
}

async function fetchReviewInlineComments(
  repoOwnerName: string,
  prNumber: number,
  reviewIds: string[]
): Promise<Map<string, GhReviewInlineComment[]>> {
  const [allComments, nodeIdToNumericId] = await Promise.all([
    fetchRawPRInlineComments(repoOwnerName, prNumber),
    resolveNodeIdToNumericId(repoOwnerName, prNumber, reviewIds),
  ]);

  const numericIdToReviewId = buildReviewIdMap(reviewIds, nodeIdToNumericId);

  const grouped = new Map<string, GhReviewInlineComment[]>(
    reviewIds.map((id) => [id, []])
  );
  for (const comment of allComments) {
    const reviewId = numericIdToReviewId.get(comment.pull_request_review_id);
    if (reviewId !== undefined) {
      grouped.get(reviewId)!.push(comment);
    }
  }

  return grouped;
}
