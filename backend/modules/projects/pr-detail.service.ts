import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { injectable } from 'inversify';
import HttpStatus from 'http-status';
import type { PRDetail } from './pull-request.types.js';
import type { PrDetailQuery } from '../../graphql/generated/graphql.js';
import prDetailGql from '../../graphql/queries/pr-detail.gql';
import { PRDetailDto } from './dto/pr-detail.dto.js';
import { validateRepoOwnerName, mapGhError } from './gh.util.js';
import { AppError } from '../../errors/AppError.js';

const execFileAsync = promisify(execFile);

type GhGraphQLResponse<T> = { data?: T; errors?: { message: string }[] };

@injectable()
export class PRDetailService {
  async fetchPRDetail(
    repoOwnerName: string,
    prNumber: number
  ): Promise<PRDetail> {
    validateRepoOwnerName(repoOwnerName);

    const [owner, name] = repoOwnerName.split('/');
    const result = await this.queryPRDetail(owner, name, prNumber);

    if (result.errors || !result.data) {
      const message = result.errors?.[0]?.message ?? 'Unknown GraphQL error';
      throw new AppError(
        `GraphQL PR detail query failed for ${owner}/${name}#${prNumber}: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    const pr = result.data.repository?.pullRequest;
    if (!pr) {
      throw new AppError('PR not found', HttpStatus.NOT_FOUND);
    }

    return PRDetailDto.fromGraphQL(pr);
  }

  private async queryPRDetail(
    owner: string,
    name: string,
    prNumber: number
  ): Promise<GhGraphQLResponse<PrDetailQuery>> {
    try {
      const { stdout } = await execFileAsync('gh', [
        'api',
        'graphql',
        '-f',
        `query=${prDetailGql}`,
        '-f',
        `owner=${owner}`,
        '-f',
        `name=${name}`,
        '-F',
        `number=${prNumber}`,
      ]);
      return JSON.parse(stdout) as GhGraphQLResponse<PrDetailQuery>;
    } catch (error) {
      throw mapGhError(error, 'fetch');
    }
  }
}
