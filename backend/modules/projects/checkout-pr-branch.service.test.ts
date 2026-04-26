import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecAsync = vi.hoisted(() => vi.fn());

vi.mock('util', () => ({
  promisify: () => mockExecAsync,
}));

const { CheckoutService } = await import('./checkout-pr-branch.service.js');

let service: InstanceType<typeof CheckoutService>;

beforeEach(() => {
  vi.clearAllMocks();
  service = new CheckoutService();
});

describe('CheckoutService.checkoutPRBranch', () => {
  it('checks out PR branch when working tree is clean', async () => {
    // given
    mockExecAsync
      .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git status (clean)
      .mockResolvedValueOnce({ stdout: '', stderr: '' }) // gh pr checkout
      .mockResolvedValueOnce({
        stdout: 'feature/awesome-change\n',
        stderr: '',
      }); // git branch --show-current

    // when
    const result = await service.checkoutPRBranch('owner/repo', 23, '/repo', {
      force: false,
    });

    // then
    expect(result).toEqual({
      success: true,
      message: 'Checked out PR branch successfully',
      targetBranch: 'feature/awesome-change',
      stashed: false,
    });
    expect(mockExecAsync).toHaveBeenNthCalledWith(
      1,
      'git',
      ['status', '--porcelain', '--untracked-files=normal'],
      { cwd: '/repo' }
    );
    expect(mockExecAsync).toHaveBeenNthCalledWith(
      2,
      'gh',
      ['pr', 'checkout', '23', '--repo', 'owner/repo'],
      { cwd: '/repo' }
    );
    expect(mockExecAsync).toHaveBeenNthCalledWith(
      3,
      'git',
      ['branch', '--show-current'],
      { cwd: '/repo' }
    );
  });

  it('throws 409 when working tree is dirty and force is false', async () => {
    // given
    mockExecAsync.mockResolvedValueOnce({
      stdout: ' M backend/services/pullRequests.ts',
      stderr: '',
    }); // git status (dirty)

    // when / then
    await expect(
      service.checkoutPRBranch('owner/repo', 23, '/repo', { force: false })
    ).rejects.toMatchObject({
      message:
        'Cannot checkout PR branch because local changes exist. Retry with force=true to auto-stash.',
      statusCode: 409,
    });

    expect(mockExecAsync).toHaveBeenCalledTimes(1);
  });

  it('stashes untracked files and checks out when force is true', async () => {
    // given
    mockExecAsync
      .mockResolvedValueOnce({
        stdout: ' M backend/services/pullRequests.ts\n?? new-file.txt',
        stderr: '',
      }) // git status (dirty)
      .mockResolvedValueOnce({
        stdout: 'Saved working directory...',
        stderr: '',
      }) // git stash push
      .mockResolvedValueOnce({ stdout: '', stderr: '' }) // gh pr checkout
      .mockResolvedValueOnce({
        stdout: 'feature/awesome-change\n',
        stderr: '',
      }); // git branch --show-current

    // when
    const result = await service.checkoutPRBranch('owner/repo', 23, '/repo', {
      force: true,
    });

    // then
    expect(result).toEqual({
      success: true,
      message: 'Checked out PR branch successfully',
      targetBranch: 'feature/awesome-change',
      stashed: true,
    });
    expect(mockExecAsync).toHaveBeenNthCalledWith(
      2,
      'git',
      [
        'stash',
        'push',
        '--include-untracked',
        '-m',
        'lgtmai: auto-stash before PR #23 checkout',
      ],
      { cwd: '/repo' }
    );
    expect(mockExecAsync).toHaveBeenNthCalledWith(
      3,
      'gh',
      ['pr', 'checkout', '23', '--repo', 'owner/repo'],
      { cwd: '/repo' }
    );
  });

  it('throws 500 when stash fails', async () => {
    // given
    mockExecAsync
      .mockResolvedValueOnce({ stdout: ' M file.ts', stderr: '' }) // git status (dirty)
      .mockRejectedValueOnce(new Error('stash failed')); // git stash push

    // when / then
    await expect(
      service.checkoutPRBranch('owner/repo', 23, '/repo', { force: true })
    ).rejects.toMatchObject({
      message: 'Failed to stash local changes before checkout',
      statusCode: 500,
    });
  });

  it('throws 404 when PR does not exist', async () => {
    // given
    mockExecAsync
      .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git status (clean)
      .mockRejectedValueOnce(new Error('could not resolve to a PullRequest')); // gh pr checkout

    // when / then
    await expect(
      service.checkoutPRBranch('owner/repo', 999, '/repo', { force: false })
    ).rejects.toMatchObject({
      message: 'Pull request not found',
      statusCode: 404,
    });
  });

  it('throws 503 when gh CLI is not authenticated', async () => {
    // given
    mockExecAsync
      .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git status (clean)
      .mockRejectedValueOnce(
        new Error('authentication required: gh auth login')
      ); // gh pr checkout

    // when / then
    await expect(
      service.checkoutPRBranch('owner/repo', 23, '/repo', { force: false })
    ).rejects.toMatchObject({
      message:
        'GitHub CLI is not authenticated. Please check your account in the header.',
      statusCode: 503,
    });
  });

  it('throws 500 for unexpected checkout failure', async () => {
    // given
    mockExecAsync
      .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git status (clean)
      .mockRejectedValueOnce(new Error('unexpected error')); // gh pr checkout

    // when / then
    await expect(
      service.checkoutPRBranch('owner/repo', 23, '/repo', { force: false })
    ).rejects.toMatchObject({
      message: 'Failed to checkout PR branch',
      statusCode: 500,
    });
  });

  it('throws 400 for invalid repository name', async () => {
    // given / when / then
    await expect(
      service.checkoutPRBranch('bad repo!', 23, '/repo', { force: false })
    ).rejects.toMatchObject({
      message: 'Invalid repository name',
      statusCode: 400,
    });
  });
});

describe('CheckoutService.checkoutDefaultBranch', () => {
  it('checks out the default branch when working tree is clean', async () => {
    // given
    mockExecAsync
      .mockResolvedValueOnce({
        stdout: 'refs/remotes/origin/main\n',
        stderr: '',
      }) // git symbolic-ref
      .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git status (clean)
      .mockResolvedValueOnce({ stdout: '', stderr: '' }); // git checkout

    // when
    const result = await service.checkoutDefaultBranch('/repo');

    // then
    expect(result).toEqual({
      success: true,
      targetBranch: 'main',
      stashed: false,
    });
    expect(mockExecAsync).toHaveBeenNthCalledWith(
      1,
      'git',
      ['symbolic-ref', 'refs/remotes/origin/HEAD'],
      { cwd: '/repo' }
    );
    expect(mockExecAsync).toHaveBeenNthCalledWith(
      3,
      'git',
      ['checkout', 'main'],
      { cwd: '/repo' }
    );
  });

  it('resolves default branch from custom origin', async () => {
    // given
    mockExecAsync
      .mockResolvedValueOnce({
        stdout: 'refs/remotes/upstream/develop\n',
        stderr: '',
      })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' });

    // when
    const result = await service.checkoutDefaultBranch('/repo', {
      origin: 'upstream',
    });

    // then
    expect(result.targetBranch).toBe('develop');
    expect(mockExecAsync).toHaveBeenNthCalledWith(
      1,
      'git',
      ['symbolic-ref', 'refs/remotes/upstream/HEAD'],
      { cwd: '/repo' }
    );
  });

  it('throws 422 when symbolic-ref is not set', async () => {
    // given
    mockExecAsync.mockRejectedValueOnce(
      new Error('fatal: ref HEAD is not a symbolic ref')
    );

    // when, then
    await expect(service.checkoutDefaultBranch('/repo')).rejects.toMatchObject({
      message:
        "Cannot determine default branch: refs/remotes/origin/HEAD is not set. Run 'git remote set-head origin --auto' to fix this.",
      statusCode: 422,
    });
    expect(mockExecAsync).toHaveBeenCalledTimes(1);
  });

  it('throws 409 when working tree is dirty and force is false', async () => {
    // given
    mockExecAsync
      .mockResolvedValueOnce({
        stdout: 'refs/remotes/origin/main\n',
        stderr: '',
      })
      .mockResolvedValueOnce({ stdout: ' M src/index.ts', stderr: '' });

    // when, then
    await expect(service.checkoutDefaultBranch('/repo')).rejects.toMatchObject({
      message:
        'Cannot checkout default branch because local changes exist. Retry with force=true to auto-stash.',
      statusCode: 409,
    });
    expect(mockExecAsync).toHaveBeenCalledTimes(2);
  });

  it('stashes and checks out when working tree is dirty and force is true', async () => {
    // given
    mockExecAsync
      .mockResolvedValueOnce({
        stdout: 'refs/remotes/origin/main\n',
        stderr: '',
      })
      .mockResolvedValueOnce({
        stdout: ' M src/index.ts\n?? new.ts',
        stderr: '',
      })
      .mockResolvedValueOnce({
        stdout: 'Saved working directory...',
        stderr: '',
      })
      .mockResolvedValueOnce({ stdout: '', stderr: '' });

    // when
    const result = await service.checkoutDefaultBranch('/repo', {
      force: true,
    });

    // then
    expect(result).toEqual({
      success: true,
      targetBranch: 'main',
      stashed: true,
    });
    expect(mockExecAsync).toHaveBeenNthCalledWith(
      3,
      'git',
      [
        'stash',
        'push',
        '--include-untracked',
        '-m',
        'lgtmai: auto-stash before default branch checkout',
      ],
      { cwd: '/repo' }
    );
  });

  it('throws 500 when stash fails', async () => {
    // given
    mockExecAsync
      .mockResolvedValueOnce({
        stdout: 'refs/remotes/origin/main\n',
        stderr: '',
      })
      .mockResolvedValueOnce({ stdout: ' M src/index.ts', stderr: '' })
      .mockRejectedValueOnce(new Error('stash failed'));

    // when, then
    await expect(
      service.checkoutDefaultBranch('/repo', { force: true })
    ).rejects.toMatchObject({
      message: 'Failed to stash local changes before checkout',
      statusCode: 500,
    });
  });

  it('throws 500 when git checkout fails', async () => {
    // given
    mockExecAsync
      .mockResolvedValueOnce({
        stdout: 'refs/remotes/origin/main\n',
        stderr: '',
      })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
      .mockRejectedValueOnce(new Error('pathspec did not match any file'));

    // when, then
    await expect(service.checkoutDefaultBranch('/repo')).rejects.toMatchObject({
      message: "Failed to checkout default branch 'main'",
      statusCode: 500,
    });
  });
});
