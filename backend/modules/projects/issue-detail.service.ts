import { injectable, inject } from 'inversify';
import HttpStatus from 'http-status';
import type { IssueDetail } from './types/issue.types.js';
import type { IssueDetailQuery } from '../../graphql/generated/graphql.js';
import issueDetailGql from '../../graphql/queries/issue-detail.gql';
import { IssueDetailDto } from './dto/issue-detail.dto.js';
import { validateRepoOwnerName } from './gh.util.js';
import { AppError } from '../../errors/AppError.js';
import { GhGraphQLClient } from './gh-graphql.client.js';

@injectable()
export class IssueDetailService {
  constructor(
    @inject(GhGraphQLClient) private readonly client: GhGraphQLClient
  ) {}

  async fetchIssueDetail(
    repoOwnerName: string,
    issueNumber: number
  ): Promise<IssueDetail> {
    validateRepoOwnerName(repoOwnerName);

    const [owner, name] = repoOwnerName.split('/');

    const data = await this.client.request<IssueDetailQuery>(issueDetailGql, {
      owner,
      name,
      number: issueNumber,
    });

    const issue = data.repository?.issue;
    if (!issue) {
      throw new AppError('Issue not found', HttpStatus.NOT_FOUND);
    }

    return IssueDetailDto.fromGraphQL(issue);
  }
}
