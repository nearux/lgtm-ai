import { injectable, inject } from 'inversify';
import HttpStatus from 'http-status';
import type { PRDetail } from '../../types/pullRequests.js';
import type { PrDetailQuery } from '../../graphql/generated/graphql.js';
import prDetailGql from '../../graphql/queries/pr-detail.gql';
import { PRDetailDto } from './dto/pr-detail.dto.js';
import { validateRepoOwnerName } from './gh.util.js';
import { AppError } from '../../errors/AppError.js';
import { GhGraphQLClient } from './gh-graphql.client.js';

@injectable()
export class PRDetailService {
  constructor(
    @inject(GhGraphQLClient) private readonly client: GhGraphQLClient
  ) {}

  async fetchPRDetail(
    repoOwnerName: string,
    prNumber: number
  ): Promise<PRDetail> {
    validateRepoOwnerName(repoOwnerName);

    const [owner, name] = repoOwnerName.split('/');

    const data = await this.client.request<PrDetailQuery>(prDetailGql, {
      owner,
      name,
      number: prNumber,
    });

    const pr = data.repository?.pullRequest;
    if (!pr) {
      throw new AppError('PR not found', HttpStatus.NOT_FOUND);
    }

    return PRDetailDto.fromGraphQL(pr);
  }
}
