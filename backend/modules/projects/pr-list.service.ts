import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { injectable } from 'inversify';
import { normalizePage, normalizeLimit } from './pagination.util.js';
import type {
  PaginatedPRList,
  PRListItem,
  PRState,
} from '../../types/pullRequests.js';
import type {
  PrCursorQuery,
  PrListQuery,
} from '../../graphql/generated/graphql.js';
import prListGql from '../../graphql/queries/pr-list.gql';
import prCursorGql from '../../graphql/queries/pr-cursor.gql';
import { PRListItemDto } from './dto/pull-requests.dto.js';
import { validateRepoOwnerName, mapGhError } from './gh.util.js';

const execFileAsync = promisify(execFile);

const MAX_GRAPHQL_FIRST = 100;

const VALID_PR_STATES: PRState[] = ['open', 'closed', 'all'];

const GRAPHQL_PR_STATES: Record<PRState, string[]> = {
  open: ['OPEN'],
  closed: ['CLOSED', 'MERGED'],
  all: ['OPEN', 'CLOSED', 'MERGED'],
};

type GhGraphQLResponse<T> = { data?: T; errors?: { message: string }[] };

@injectable()
export class PRListService {
  async fetchPRList(
    repoOwnerName: string,
    options: { page?: number; limit?: number; state?: PRState } = {}
  ): Promise<PaginatedPRList> {
    validateRepoOwnerName(repoOwnerName);

    const page = normalizePage(options.page);
    const limit = normalizeLimit(options.limit);
    const state = this.normalizePRState(options.state);

    try {
      if (page > 1) {
        const cursor = await this.resolvePageCursor(
          repoOwnerName,
          state,
          (page - 1) * limit
        );
        if (cursor === null) {
          return { items: [], lastPage: 1 };
        }
        const { totalCount, items } = await this.fetchPRListGraphQL(
          repoOwnerName,
          state,
          limit,
          cursor
        );
        return { items, lastPage: Math.max(1, Math.ceil(totalCount / limit)) };
      }

      const { totalCount, items } = await this.fetchPRListGraphQL(
        repoOwnerName,
        state,
        limit,
        null
      );
      return { items, lastPage: Math.max(1, Math.ceil(totalCount / limit)) };
    } catch (error) {
      throw mapGhError(error, 'fetch');
    }
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
    const { stdout } = await execFileAsync('gh', [
      'api',
      'graphql',
      '-f',
      `query=${prCursorGql}`,
      '-f',
      `owner=${owner}`,
      '-f',
      `name=${name}`,
      '-F',
      `skip=${hop}`,
      ...this.buildStatesFilterArgs(state),
      ...(after ? ['-f', `after=${after}`] : []),
    ]);
    const result = JSON.parse(stdout) as GhGraphQLResponse<PrCursorQuery>;

    if (result.errors || !result.data) {
      const message = result.errors?.[0]?.message ?? 'Unknown GraphQL error';
      throw new Error(`GraphQL query failed: ${message}`);
    }

    return result.data.repository?.pullRequests.pageInfo.endCursor ?? null;
  }

  private async fetchPRListGraphQL(
    repoOwnerName: string,
    state: PRState,
    limit: number,
    cursor: string | null
  ): Promise<{ totalCount: number; items: PRListItem[] }> {
    const [owner, name] = repoOwnerName.split('/');

    const { stdout } = await execFileAsync('gh', [
      'api',
      'graphql',
      '-f',
      `query=${prListGql}`,
      '-f',
      `owner=${owner}`,
      '-f',
      `name=${name}`,
      '-F',
      `limit=${limit}`,
      ...this.buildStatesFilterArgs(state),
      ...(cursor ? ['-f', `after=${cursor}`] : []),
    ]);
    const result = JSON.parse(stdout) as GhGraphQLResponse<PrListQuery>;

    if (result.errors || !result.data) {
      const message = result.errors?.[0]?.message ?? 'Unknown GraphQL error';
      throw new Error(`GraphQL query failed: ${message}`);
    }

    const prs = result.data.repository?.pullRequests;
    if (!prs) throw new Error('GraphQL query failed: no data');

    return {
      totalCount: prs.totalCount,
      items: (prs.nodes ?? []).map((node) => PRListItemDto.fromGraphQL(node)),
    };
  }

  private normalizePRState(state: string | undefined): PRState {
    if (state && VALID_PR_STATES.includes(state as PRState)) {
      return state as PRState;
    }
    return 'open';
  }

  private buildStatesFilterArgs(state: PRState): string[] {
    return GRAPHQL_PR_STATES[state].flatMap((s) => ['-f', `states[]=${s}`]);
  }
}
