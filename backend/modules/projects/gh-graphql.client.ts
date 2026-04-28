import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { injectable } from 'inversify';
import HttpStatus from 'http-status';
import { AppError } from '../../errors/AppError.js';
import { mapGhError } from './gh.util.js';

const execFileAsync = promisify(execFile);

type GhGraphQLResponse<T> = { data?: T; errors?: { message: string }[] };

type Variables = Record<string, string | number | string[] | undefined>;

@injectable()
export class GhGraphQLClient {
  async request<T>(query: string, variables: Variables = {}): Promise<T> {
    const args = [
      'api',
      'graphql',
      '-f',
      `query=${query}`,
      ...this.buildVariableArgs(variables),
    ];

    const { stdout } = await execFileAsync('gh', args).catch((error) => {
      throw mapGhError(error, 'fetch');
    });

    const result = JSON.parse(stdout) as GhGraphQLResponse<T>;

    if (result.errors || !result.data) {
      const message = result.errors?.[0]?.message ?? 'Unknown GraphQL error';
      throw new AppError(
        `GraphQL query failed: ${message}`,
        HttpStatus.BAD_GATEWAY
      );
    }

    return result.data;
  }

  private buildVariableArgs(variables: Variables): string[] {
    return Object.entries(variables).flatMap(([key, value]) => {
      if (value === undefined) return [];
      if (Array.isArray(value))
        return value.flatMap((v) => ['-f', `${key}[]=${v}`]);
      if (typeof value === 'number') return ['-F', `${key}=${value}`];
      return ['-f', `${key}=${value}`];
    });
  }
}
