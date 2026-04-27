import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import HttpStatus from 'http-status';
import { injectable } from 'inversify';
import type {
  CheckoutPRBranchResult,
  CheckoutDefaultBranchResult,
} from '../../types/pullRequests.js';
import { AppError } from '../../errors/AppError.js';
import { validateRepoOwnerName, mapGhError } from './gh.util.js';

const execFileAsync = promisify(execFile);

@injectable()
export class CheckoutService {
  async checkoutPRBranch(
    repoOwnerName: string,
    prNumber: number,
    workingDir: string,
    options: { force?: boolean } = {}
  ): Promise<CheckoutPRBranchResult> {
    validateRepoOwnerName(repoOwnerName);

    const force = options.force === true;
    const stashed = await this.prepareWorkingDirectory(workingDir, force, {
      conflictMessage:
        'Cannot checkout PR branch because local changes exist. Retry with force=true to auto-stash.',
      stashMessage: `lgtmai: auto-stash before PR #${prNumber} checkout`,
    });

    try {
      await execFileAsync(
        'gh',
        ['pr', 'checkout', String(prNumber), '--repo', repoOwnerName],
        { cwd: workingDir }
      );
    } catch (error) {
      throw mapGhError(error, 'checkout');
    }

    const { stdout: currentBranch } = await execFileAsync(
      'git',
      ['branch', '--show-current'],
      { cwd: workingDir }
    );
    const targetBranch = currentBranch.trim();

    return {
      success: true,
      message: 'Checked out PR branch successfully',
      targetBranch,
      stashed,
    };
  }

  async checkoutDefaultBranch(
    workingDir: string,
    options: { force?: boolean; origin?: string } = {}
  ): Promise<CheckoutDefaultBranchResult> {
    const origin = options.origin ?? 'origin';
    const force = options.force === true;

    const defaultBranch = await this.resolveDefaultBranch(workingDir, origin);
    const stashed = await this.prepareWorkingDirectory(workingDir, force, {
      conflictMessage:
        'Cannot checkout default branch because local changes exist. Retry with force=true to auto-stash.',
      stashMessage: `lgtmai: auto-stash before default branch checkout`,
    });

    try {
      await execFileAsync('git', ['checkout', defaultBranch], {
        cwd: workingDir,
      });
    } catch (error) {
      throw new AppError(
        `Failed to checkout default branch '${defaultBranch}'`,
        HttpStatus.INTERNAL_SERVER_ERROR,
        error
      );
    }

    return {
      success: true,
      targetBranch: defaultBranch,
      stashed,
    };
  }

  private async prepareWorkingDirectory(
    workingDir: string,
    force: boolean,
    messages: { conflictMessage: string; stashMessage: string }
  ): Promise<boolean> {
    const { stdout: gitStatusStdout } = await execFileAsync(
      'git',
      ['status', '--porcelain', '--untracked-files=normal'],
      { cwd: workingDir }
    );

    const isDirty = gitStatusStdout.trim().length > 0;

    if (isDirty && !force) {
      throw new AppError(messages.conflictMessage, HttpStatus.CONFLICT);
    }

    if (isDirty && force) {
      try {
        await execFileAsync(
          'git',
          ['stash', 'push', '--include-untracked', '-m', messages.stashMessage],
          { cwd: workingDir }
        );
        return true;
      } catch (error) {
        throw new AppError(
          'Failed to stash local changes before checkout',
          HttpStatus.INTERNAL_SERVER_ERROR,
          error
        );
      }
    }

    return false;
  }

  private async resolveDefaultBranch(
    workingDir: string,
    origin: string
  ): Promise<string> {
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['symbolic-ref', `refs/remotes/${origin}/HEAD`],
        { cwd: workingDir }
      );
      const ref = stdout.trim();
      const branch = ref.replace(`refs/remotes/${origin}/`, '');
      if (!branch) {
        throw new Error('empty branch name');
      }
      return branch;
    } catch {
      throw new AppError(
        `Cannot determine default branch: refs/remotes/${origin}/HEAD is not set. Run 'git remote set-head ${origin} --auto' to fix this.`,
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }
  }
}
