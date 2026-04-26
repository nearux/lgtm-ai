import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { injectable } from 'inversify';
import HttpStatus from 'http-status';
import type { IssueDetail } from '../../types/issues.js';
import type { IssueDetailQuery } from '../../graphql/generated/graphql.js';
import issueDetailGql from '../../graphql/queries/issue-detail.gql';
import { IssueDetailDto } from './dto/issue-detail.dto.js';
import { validateRepoOwnerName, mapGhError } from './gh.util.js';
import { AppError } from '../../errors/AppError.js';

const execFileAsync = promisify(execFile);

type GhGraphQLResponse<T> = { data?: T; errors?: { message: string }[] };

@injectable()
export class IssueDetailService {
  async fetchIssueDetail(
    repoOwnerName: string,
    issueNumber: number
  ): Promise<IssueDetail> {
    validateRepoOwnerName(repoOwnerName);

    const [owner, name] = repoOwnerName.split('/');
    const result = await this.queryIssueDetail(owner, name, issueNumber);

    if (result.errors || !result.data) {
      const message = result.errors?.[0]?.message ?? 'Unknown GraphQL error';
      throw new Error(`GraphQL query failed: ${message}`);
    }

    const issue = result.data.repository?.issue;
    if (!issue) {
      throw new AppError('Issue not found', HttpStatus.NOT_FOUND);
    }

    return IssueDetailDto.fromGraphQL(issue);
  }

  private async queryIssueDetail(
    owner: string,
    name: string,
    issueNumber: number
  ): Promise<GhGraphQLResponse<IssueDetailQuery>> {
    try {
      const { stdout } = await execFileAsync('gh', [
        'api',
        'graphql',
        '-f',
        `query=${issueDetailGql}`,
        '-f',
        `owner=${owner}`,
        '-f',
        `name=${name}`,
        '-F',
        `number=${issueNumber}`,
      ]);
      return JSON.parse(stdout) as GhGraphQLResponse<IssueDetailQuery>;
    } catch (error) {
      throw mapGhError(error, 'fetch');
    }
  }
}
