import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { injectable } from 'inversify';
import { normalizePage, normalizeLimit } from './pagination.util.js';
import type {
  PaginatedIssueList,
  IssueListItem,
  IssueState,
} from '../../types/issues.js';
import type {
  IssueListQuery,
  IssueCursorQuery,
} from '../../graphql/generated/graphql.js';
import issueListGql from '../../graphql/queries/issue-list.gql';
import issueCursorGql from '../../graphql/queries/issue-cursor.gql';
import { IssueListItemDto } from './dto/issue-list.dto.js';
import { validateRepoOwnerName, mapGhError } from './gh.util.js';
import { AppError } from '../../errors/AppError.js';
import HttpStatus from 'http-status';

const execFileAsync = promisify(execFile);

const MAX_GRAPHQL_FIRST = 100;

const VALID_ISSUE_STATES: IssueState[] = ['open', 'closed'];

const GRAPHQL_ISSUE_STATES: Record<IssueState, string[]> = {
  open: ['OPEN'],
  closed: ['CLOSED'],
};

type GhGraphQLResponse<T> = { data?: T; errors?: { message: string }[] };

@injectable()
export class IssueListService {
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
    const { stdout } = await execFileAsync('gh', [
      'api',
      'graphql',
      '-f',
      `query=${issueCursorGql}`,
      '-f',
      `owner=${owner}`,
      '-f',
      `name=${name}`,
      '-F',
      `skip=${hop}`,
      ...this.buildStatesFilterArgs(state),
      ...(after ? ['-f', `after=${after}`] : []),
    ]).catch((error) => {
      throw mapGhError(error, 'fetch');
    });
    const result = JSON.parse(stdout) as GhGraphQLResponse<IssueCursorQuery>;

    if (result.errors || !result.data) {
      const message = result.errors?.[0]?.message ?? 'Unknown GraphQL error';
      throw new AppError(
        `GraphQL cursor query failed for ${owner}/${name}: ${message}`,
        HttpStatus.BAD_GATEWAY
      );
    }

    return result.data.repository?.issues.pageInfo.endCursor ?? null;
  }

  private async fetchIssueListGraphQL(
    repoOwnerName: string,
    state: IssueState,
    limit: number,
    cursor: string | null
  ): Promise<{ totalCount: number; items: IssueListItem[] }> {
    const [owner, name] = repoOwnerName.split('/');

    const { stdout } = await execFileAsync('gh', [
      'api',
      'graphql',
      '-f',
      `query=${issueListGql}`,
      '-f',
      `owner=${owner}`,
      '-f',
      `name=${name}`,
      '-F',
      `limit=${limit}`,
      ...this.buildStatesFilterArgs(state),
      ...(cursor ? ['-f', `after=${cursor}`] : []),
    ]).catch((error) => {
      throw mapGhError(error, 'fetch');
    });
    const result = JSON.parse(stdout) as GhGraphQLResponse<IssueListQuery>;

    if (result.errors || !result.data) {
      const message = result.errors?.[0]?.message ?? 'Unknown GraphQL error';
      throw new AppError(
        `GraphQL issue list query failed for ${repoOwnerName}: ${message}`,
        HttpStatus.BAD_GATEWAY
      );
    }

    const issues = result.data.repository?.issues;
    if (!issues)
      throw new AppError(
        `GraphQL query failed: repository ${repoOwnerName} not found or issues inaccessible`,
        HttpStatus.BAD_GATEWAY
      );

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

  private buildStatesFilterArgs(state: IssueState): string[] {
    return GRAPHQL_ISSUE_STATES[state].flatMap((s) => ['-f', `states[]=${s}`]);
  }
}
