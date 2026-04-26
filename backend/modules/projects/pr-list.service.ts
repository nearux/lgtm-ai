import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { clamp } from 'remeda';
import { injectable } from 'inversify';
import type {
  PaginatedPRList,
  PRState,
  GraphQLPRListResponse,
  GraphQLCursorResponse,
  GraphQLPRNode,
} from '../../types/pullRequests.js';
import { PRListItemDto } from './dto/pull-requests.dto.js';
import { validateRepoOwnerName, mapGhError } from './gh.util.js';

const execFileAsync = promisify(execFile);

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;
const MAX_GRAPHQL_FIRST = 100;

const VALID_PR_STATES: PRState[] = ['open', 'closed', 'all'];

const GRAPHQL_PR_STATES: Record<PRState, string[]> = {
  open: ['OPEN'],
  closed: ['CLOSED', 'MERGED'],
  all: ['OPEN', 'CLOSED', 'MERGED'],
};

@injectable()
export class PRListService {
  async fetchPRList(
    repoOwnerName: string,
    options: { page?: number; limit?: number; state?: PRState } = {}
  ): Promise<PaginatedPRList> {
    validateRepoOwnerName(repoOwnerName);

    const page = this.normalizePositiveInt(options.page, DEFAULT_PAGE);
    const limit = clamp(
      this.normalizePositiveInt(options.limit, DEFAULT_LIMIT),
      {
        max: MAX_LIMIT,
      }
    );
    const state = this.normalizePRState(options.state);

    let totalCount: number;
    let nodes: GraphQLPRNode[];

    try {
      let cursor: string | null = null;
      if (page > 1) {
        const skip = (page - 1) * limit;
        cursor = await this.resolvePageCursor(repoOwnerName, state, skip);
        if (cursor === null) {
          return { items: [], lastPage: 1 };
        }
      }

      ({ totalCount, nodes } = await this.fetchPRListGraphQL(
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

  private async resolvePageCursor(
    repoOwnerName: string,
    state: PRState,
    skip: number
  ): Promise<string | null> {
    const [owner, name] = repoOwnerName.split('/');

    let remaining = skip;
    let cursor: string | null = null;

    while (remaining > 0) {
      const hop = Math.min(remaining, MAX_GRAPHQL_FIRST);
      cursor = await this.fetchCursorHop(owner, name, state, hop, cursor);
      if (cursor === null) return null;
      remaining -= hop;
    }

    return cursor;
  }

  private async fetchCursorHop(
    owner: string,
    name: string,
    state: PRState,
    hop: number,
    after: string | null
  ): Promise<string | null> {
    const query = `query($owner: String!, $name: String!, $skip: Int!, $states: [PullRequestState!]!, $after: String) { repository(owner: $owner, name: $name) { pullRequests(first: $skip, after: $after, states: $states, orderBy: {field: CREATED_AT, direction: DESC}) { pageInfo { endCursor } } } }`;

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
      `skip=${hop}`,
      ...this.statesArgs(state),
      ...(after ? ['-f', `after=${after}`] : []),
    ]);
    const result = JSON.parse(stdout) as GraphQLCursorResponse;

    if (result.errors || !result.data) {
      const message = result.errors?.[0]?.message ?? 'Unknown GraphQL error';
      throw new Error(`GraphQL query failed: ${message}`);
    }

    return result.data.repository.pullRequests.pageInfo.endCursor;
  }

  private async fetchPRListGraphQL(
    repoOwnerName: string,
    state: PRState,
    limit: number,
    cursor: string | null
  ): Promise<{ totalCount: number; nodes: GraphQLPRNode[] }> {
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
        totalCommentsCount
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
      ...this.statesArgs(state),
      ...(cursor ? ['-f', `after=${cursor}`] : []),
    ]);
    const result = JSON.parse(stdout) as GraphQLPRListResponse;

    if (result.errors || !result.data) {
      const message = result.errors?.[0]?.message ?? 'Unknown GraphQL error';
      throw new Error(`GraphQL query failed: ${message}`);
    }

    return result.data.repository.pullRequests;
  }

  private normalizePositiveInt(
    value: number | undefined,
    fallback: number
  ): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fallback;
    }
    return clamp(Math.trunc(value), { min: 1 });
  }

  private normalizePRState(state: string | undefined): PRState {
    if (state && VALID_PR_STATES.includes(state as PRState)) {
      return state as PRState;
    }
    return 'open';
  }

  private statesArgs(state: PRState): string[] {
    return GRAPHQL_PR_STATES[state].flatMap((s) => ['-f', `states[]=${s}`]);
  }
}
