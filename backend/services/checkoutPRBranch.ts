import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import HttpStatus from 'http-status';
import type { CheckoutPRBranchResult } from '../types/pullRequests.js';
import { AppError } from '../errors/AppError.js';
import { validateRepoOwnerName, mapGhError } from './ghUtils.js';

const execFileAsync = promisify(execFile);

export async function checkoutPRBranch(
  repoOwnerName: string,
  prNumber: number,
  workingDir: string,
  options: { force?: boolean } = {}
): Promise<CheckoutPRBranchResult> {
  validateRepoOwnerName(repoOwnerName);

  const force = options.force === true;

  const { stdout: gitStatusStdout } = await execFileAsync(
    'git',
    ['status', '--porcelain', '--untracked-files=normal'],
    { cwd: workingDir }
  );

  const isDirty = gitStatusStdout.trim().length > 0;
  let stashed = false;

  if (isDirty && !force) {
    throw new AppError(
      'Cannot checkout PR branch because local changes exist. Retry with force=true to auto-stash.',
      HttpStatus.CONFLICT
    );
  }

  if (isDirty && force) {
    try {
      await execFileAsync(
        'git',
        [
          'stash',
          'push',
          '--include-untracked',
          '-m',
          `lgtmai: auto-stash before PR #${prNumber} checkout`,
        ],
        { cwd: workingDir }
      );
      stashed = true;
    } catch (error) {
      throw new AppError(
        'Failed to stash local changes before checkout',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }

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
