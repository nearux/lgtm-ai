import { injectable, inject } from 'inversify';
import { normalizePage, normalizeLimit } from './pagination.util.js';
import type {
  PaginatedIssueList,
  IssueListItem,
  IssueState,
} from './types/issue.types.js';
import type {
  IssueListQuery,
  IssueCursorQuery,
} from '../../graphql/generated/graphql.js';
import issueListGql from '../../graphql/queries/issue-list.gql';
import issueCursorGql from '../../graphql/queries/issue-cursor.gql';
import { IssueListItemDto } from './dto/issue-list.dto.js';
import { validateRepoOwnerName } from './gh.util.js';
import { AppError } from '../../errors/AppError.js';
import { GhGraphQLClient } from './gh-graphql.client.js';
import HttpStatus from 'http-status';

const MAX_GRAPHQL_FIRST = 100;

const VALID_ISSUE_STATES: IssueState[] = ['open', 'closed'];

const GRAPHQL_ISSUE_STATES: Record<IssueState, string[]> = {
  open: ['OPEN'],
  closed: ['CLOSED'],
};

@injectable()
export class IssueListService {
  constructor(
    @inject(GhGraphQLClient) private readonly client: GhGraphQLClient
  ) {}

  async fetchIssueList(
    repoOwnerName: string,
    options: { page?: number; limit?: number; state?: IssueState } = {}
  ): Promise<PaginatedIssueList> {
    validateRepoOwnerName(repoOwnerName);

    const page = normalizePage(options.page);
    const limit = normalizeLimit(options.limit);
    const state = this.normalizeIssueState(options.state);

    const cursor =
      page > 1
        ? await this.resolvePageCursor(repoOwnerName, state, (page - 1) * limit)
        : null;
    if (page > 1 && cursor === null) {
      return { items: [], lastPage: 1 };
    }

    const { totalCount, items } = await this.fetchIssueListGraphQL(
      repoOwnerName,
      state,
      limit,
      cursor
    );
    const lastPage = Math.max(1, Math.ceil(totalCount / limit));
    return { items, lastPage };
  }

  private async resolvePageCursor(
    repoOwnerName: string,
    state: IssueState,
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
    state: IssueState,
    hop: number,
    after: string | null
  ): Promise<string | null> {
    const data = await this.client.request<IssueCursorQuery>(issueCursorGql, {
      owner,
      name,
      skip: hop,
      states: GRAPHQL_ISSUE_STATES[state],
      after: after ?? undefined,
    });

    return data.repository?.issues.pageInfo.endCursor ?? null;
  }

  private async fetchIssueListGraphQL(
    repoOwnerName: string,
    state: IssueState,
    limit: number,
    cursor: string | null
  ): Promise<{ totalCount: number; items: IssueListItem[] }> {
    const [owner, name] = repoOwnerName.split('/');

    const data = await this.client.request<IssueListQuery>(issueListGql, {
      owner,
      name,
      limit,
      states: GRAPHQL_ISSUE_STATES[state],
      after: cursor ?? undefined,
    });

    const issues = data.repository?.issues;
    if (!issues) {
      throw new AppError(
        `GraphQL query failed: repository ${repoOwnerName} not found or issues inaccessible`,
        HttpStatus.BAD_GATEWAY
      );
    }

    return {
      totalCount: issues.totalCount,
      items: (issues.nodes ?? []).flatMap((node) =>
        node ? [IssueListItemDto.fromGraphQL(node)] : []
      ),
    };
  }

  private normalizeIssueState(state: string | undefined): IssueState {
    if (state && VALID_ISSUE_STATES.includes(state as IssueState)) {
      return state as IssueState;
    }
    return 'open';
  }
}
