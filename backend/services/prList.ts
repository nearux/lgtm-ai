import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { clamp } from 'remeda';
import type {
  PaginatedPRList,
  PRState,
  GraphQLPRListResponse,
  GraphQLCursorResponse,
  GraphQLPRNode,
} from '../types/pullRequests.js';
import { PRListItemDto } from '../dtos/pullRequestsDto.js';
import { validateRepoOwnerName, mapGhError } from './ghUtils.js';

const execFileAsync = promisify(execFile);

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
    throw mapGhError(error, 'fetch');
  }

  const lastPage = Math.max(1, Math.ceil(totalCount / limit));

  return {
    items: nodes.map((node) => PRListItemDto.fromGraphQL(node)),
    lastPage,
  };
}
