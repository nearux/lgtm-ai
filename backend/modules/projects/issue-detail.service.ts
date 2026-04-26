import { readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { injectable } from 'inversify';
import type { IssueDetail } from '../../types/issues.js';
import type { IssueDetailQuery } from '../../graphql/generated/graphql.js';
import { IssueDetailDto } from './dto/issue-detail.dto.js';
import { validateRepoOwnerName, mapGhError } from './gh.util.js';

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUERIES_DIR = join(__dirname, '../../graphql/queries');

@injectable()
export class IssueDetailService {
  private readonly issueDetailQuery = readFileSync(
    join(QUERIES_DIR, 'issue-detail.gql'),
    'utf-8'
  );

  async fetchIssueDetail(
    repoOwnerName: string,
    issueNumber: number
  ): Promise<IssueDetail> {
    validateRepoOwnerName(repoOwnerName);

    const [owner, name] = repoOwnerName.split('/');

    let result: IssueDetailQuery & { errors?: { message: string }[] };

    try {
      const { stdout } = await execFileAsync('gh', [
        'api',
        'graphql',
        '-f',
        `query=${this.issueDetailQuery}`,
        '-f',
        `owner=${owner}`,
        '-f',
        `name=${name}`,
        '-F',
        `number=${issueNumber}`,
      ]);
      result = JSON.parse(stdout) as IssueDetailQuery & {
        errors?: { message: string }[];
      };
    } catch (error) {
      throw mapGhError(error, 'fetch');
    }

    if ('errors' in result && result.errors) {
      const message = result.errors[0]?.message ?? 'Unknown GraphQL error';
      throw new Error(`GraphQL query failed: ${message}`);
    }

    const issue = result.repository?.issue;
    if (!issue) {
      throw mapGhError(new Error('Issue not found'), 'fetch');
    }

    return IssueDetailDto.fromGraphQL(issue);
  }
}
