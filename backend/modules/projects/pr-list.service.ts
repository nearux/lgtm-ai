import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { clamp } from 'remeda';
import { injectable } from 'inversify';
import type { PaginatedPRList, PRState } from '../../types/pullRequests.js';
import type {
  PrListQuery,
  PrCursorQuery,
} from '../../graphql/generated/graphql.js';
import prListGql from '../../graphql/queries/pr-list.gql';
import prCursorGql from '../../graphql/queries/pr-cursor.gql';
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

type GhGraphQLResponse<T> = { data?: T; errors?: { message: string }[] };

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
      { max: MAX_LIMIT }
    );
    const state = this.normalizePRState(options.state);

    let totalCount: number;
    let nodes: NonNullable<PrListQuery['repository']>['pullRequests']['nodes'];

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
      items: (nodes ?? []).map((node) => PRListItemDto.fromGraphQL(node)),
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
      ...this.statesArgs(state),
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
  ): Promise<{
    totalCount: number;
    nodes: NonNullable<PrListQuery['repository']>['pullRequests']['nodes'];
  }> {
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
      ...this.statesArgs(state),
      ...(cursor ? ['-f', `after=${cursor}`] : []),
    ]);
    const result = JSON.parse(stdout) as GhGraphQLResponse<PrListQuery>;

    if (result.errors || !result.data) {
      const message = result.errors?.[0]?.message ?? 'Unknown GraphQL error';
      throw new Error(`GraphQL query failed: ${message}`);
    }

    const prs = result.data.repository?.pullRequests;
    if (!prs) throw new Error('GraphQL query failed: no data');

    return { totalCount: prs.totalCount, nodes: prs.nodes };
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
