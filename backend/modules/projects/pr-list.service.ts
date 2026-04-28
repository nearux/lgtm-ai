import { injectable, inject } from 'inversify';
import { normalizePage, normalizeLimit } from './pagination.util.js';
import type {
  PaginatedPRList,
  PRListItem,
  PRState,
} from './types/pull-request.types.js';
import type {
  PrCursorQuery,
  PrListQuery,
} from '../../graphql/generated/graphql.js';
import prListGql from '../../graphql/queries/pr-list.gql';
import prCursorGql from '../../graphql/queries/pr-cursor.gql';
import { PRListItemDto } from './dto/pr-list.dto.js';
import { validateRepoOwnerName } from './gh.util.js';
import { AppError } from '../../errors/AppError.js';
import { GhGraphQLClient } from './gh-graphql.client.js';
import HttpStatus from 'http-status';

const MAX_GRAPHQL_FIRST = 100;

const VALID_PR_STATES: PRState[] = ['open', 'closed', 'all'];

const GRAPHQL_PR_STATES: Record<PRState, string[]> = {
  open: ['OPEN'],
  closed: ['CLOSED', 'MERGED'],
  all: ['OPEN', 'CLOSED', 'MERGED'],
};

@injectable()
export class PRListService {
  constructor(
    @inject(GhGraphQLClient) private readonly client: GhGraphQLClient
  ) {}

  async fetchPRList(
    repoOwnerName: string,
    options: { page?: number; limit?: number; state?: PRState } = {}
  ): Promise<PaginatedPRList> {
    validateRepoOwnerName(repoOwnerName);

    const page = normalizePage(options.page);
    const limit = normalizeLimit(options.limit);
    const state = this.normalizePRState(options.state);

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
    const data = await this.client.request<PrCursorQuery>(prCursorGql, {
      owner,
      name,
      skip: hop,
      states: GRAPHQL_PR_STATES[state],
      after: after ?? undefined,
    });

    return data.repository?.pullRequests.pageInfo.endCursor ?? null;
  }

  private async fetchPRListGraphQL(
    repoOwnerName: string,
    state: PRState,
    limit: number,
    cursor: string | null
  ): Promise<{ totalCount: number; items: PRListItem[] }> {
    const [owner, name] = repoOwnerName.split('/');

    const data = await this.client.request<PrListQuery>(prListGql, {
      owner,
      name,
      limit,
      states: GRAPHQL_PR_STATES[state],
      after: cursor ?? undefined,
    });

    const prs = data.repository?.pullRequests;
    if (!prs) {
      throw new AppError(
        'GraphQL query failed: no data',
        HttpStatus.BAD_GATEWAY
      );
    }

    return {
      totalCount: prs.totalCount,
      items: (prs.nodes ?? []).flatMap((node) =>
        node ? [PRListItemDto.fromGraphQL(node)] : []
      ),
    };
  }

  private normalizePRState(state: string | undefined): PRState {
    if (state && VALID_PR_STATES.includes(state as PRState)) {
      return state as PRState;
    }
    return 'open';
  }
}
