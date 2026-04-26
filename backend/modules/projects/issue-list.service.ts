import { readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { clamp } from 'remeda';
import { injectable } from 'inversify';
import type { PaginatedIssueList, IssueState } from '../../types/issues.js';
import type {
  IssueListQuery,
  IssueCursorQuery,
} from '../../graphql/generated/graphql.js';
import { IssueListItemDto } from './dto/issue-list.dto.js';
import { validateRepoOwnerName, mapGhError } from './gh.util.js';

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUERIES_DIR = join(__dirname, '../../graphql/queries');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;
const MAX_GRAPHQL_FIRST = 100;

const VALID_ISSUE_STATES: IssueState[] = ['open', 'closed'];

const GRAPHQL_ISSUE_STATES: Record<IssueState, string[]> = {
  open: ['OPEN'],
  closed: ['CLOSED'],
};

@injectable()
export class IssueListService {
  private readonly issueListQuery = readFileSync(
    join(QUERIES_DIR, 'issue-list.gql'),
    'utf-8'
  );
  private readonly issueCursorQuery = readFileSync(
    join(QUERIES_DIR, 'issue-cursor.gql'),
    'utf-8'
  );

  async fetchIssueList(
    repoOwnerName: string,
    options: { page?: number; limit?: number; state?: IssueState } = {}
  ): Promise<PaginatedIssueList> {
    validateRepoOwnerName(repoOwnerName);

    const page = this.normalizePositiveInt(options.page, DEFAULT_PAGE);
    const limit = clamp(
      this.normalizePositiveInt(options.limit, DEFAULT_LIMIT),
      { max: MAX_LIMIT }
    );
    const state = this.normalizeIssueState(options.state);

    let totalCount: number;
    let nodes: NonNullable<IssueListQuery['repository']>['issues']['nodes'];

    try {
      let cursor: string | null = null;
      if (page > 1) {
        const skip = (page - 1) * limit;
        cursor = await this.resolvePageCursor(repoOwnerName, state, skip);
        if (cursor === null) {
          return { items: [], lastPage: 1 };
        }
      }

      ({ totalCount, nodes } = await this.fetchIssueListGraphQL(
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
      items: (nodes ?? []).map((node) => IssueListItemDto.fromGraphQL(node)),
      lastPage,
    };
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
      `query=${this.issueCursorQuery}`,
      '-f',
      `owner=${owner}`,
      '-f',
      `name=${name}`,
      '-F',
      `skip=${hop}`,
      ...this.statesArgs(state),
      ...(after ? ['-f', `after=${after}`] : []),
    ]);
    const result = JSON.parse(stdout) as IssueCursorQuery & {
      errors?: { message: string }[];
    };

    if ('errors' in result && result.errors) {
      const message = result.errors[0]?.message ?? 'Unknown GraphQL error';
      throw new Error(`GraphQL query failed: ${message}`);
    }

    return result.repository?.issues.pageInfo.endCursor ?? null;
  }

  private async fetchIssueListGraphQL(
    repoOwnerName: string,
    state: IssueState,
    limit: number,
    cursor: string | null
  ): Promise<{
    totalCount: number;
    nodes: NonNullable<IssueListQuery['repository']>['issues']['nodes'];
  }> {
    const [owner, name] = repoOwnerName.split('/');

    const { stdout } = await execFileAsync('gh', [
      'api',
      'graphql',
      '-f',
      `query=${this.issueListQuery}`,
      '-f',
      `owner=${owner}`,
      '-f',
      `name=${name}`,
      '-F',
      `limit=${limit}`,
      ...this.statesArgs(state),
      ...(cursor ? ['-f', `after=${cursor}`] : []),
    ]);
    const result = JSON.parse(stdout) as IssueListQuery & {
      errors?: { message: string }[];
    };

    if ('errors' in result && result.errors) {
      const message = result.errors[0]?.message ?? 'Unknown GraphQL error';
      throw new Error(`GraphQL query failed: ${message}`);
    }

    const issues = result.repository?.issues;
    if (!issues) throw new Error('GraphQL query failed: no data');

    return { totalCount: issues.totalCount, nodes: issues.nodes };
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

  private normalizeIssueState(state: string | undefined): IssueState {
    if (state && VALID_ISSUE_STATES.includes(state as IssueState)) {
      return state as IssueState;
    }
    return 'open';
  }

  private statesArgs(state: IssueState): string[] {
    return GRAPHQL_ISSUE_STATES[state].flatMap((s) => ['-f', `states[]=${s}`]);
  }
}
