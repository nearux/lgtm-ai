import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecAsync = vi.hoisted(() => vi.fn());

vi.mock('util', () => ({
  promisify: () => mockExecAsync,
}));

const { CheckoutService } = await import('./checkout-pr-branch.service.js');

describe('CheckoutService.checkoutPRBranch', () => {
  let service: InstanceType<typeof CheckoutService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CheckoutService();
  });

  it('should checkout PR branch when working tree is clean', async () => {
    mockExecAsync
      .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git status (clean)
      .mockResolvedValueOnce({ stdout: '', stderr: '' }) // gh pr checkout
      .mockResolvedValueOnce({
        stdout: 'feature/awesome-change\n',
        stderr: '',
      }); // git branch --show-current

    const result = await service.checkoutPRBranch('owner/repo', 23, '/repo', {
      force: false,
    });

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

  it('should throw CONFLICT when working tree is dirty and force is false', async () => {
    mockExecAsync.mockResolvedValueOnce({
      stdout: ' M backend/services/pullRequests.ts',
      stderr: '',
    }); // git status (dirty)

    await expect(
      service.checkoutPRBranch('owner/repo', 23, '/repo', { force: false })
    ).rejects.toMatchObject({
      message:
        'Cannot checkout PR branch because local changes exist. Retry with force=true to auto-stash.',
      statusCode: 409,
    });

    expect(mockExecAsync).toHaveBeenCalledTimes(1);
  });

  it('should stash including untracked files when force is true', async () => {
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

    const result = await service.checkoutPRBranch('owner/repo', 23, '/repo', {
      force: true,
    });

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

  it('should throw INTERNAL_SERVER_ERROR when stash fails', async () => {
    mockExecAsync
      .mockResolvedValueOnce({ stdout: ' M file.ts', stderr: '' }) // git status (dirty)
      .mockRejectedValueOnce(new Error('stash failed')); // git stash push

    await expect(
      service.checkoutPRBranch('owner/repo', 23, '/repo', { force: true })
    ).rejects.toMatchObject({
      message: 'Failed to stash local changes before checkout',
      statusCode: 500,
    });
  });

  it('should throw NOT_FOUND when PR does not exist', async () => {
    mockExecAsync
      .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git status (clean)
      .mockRejectedValueOnce(new Error('could not resolve to a PullRequest')); // gh pr checkout

    await expect(
      service.checkoutPRBranch('owner/repo', 999, '/repo', { force: false })
    ).rejects.toMatchObject({
      message: 'Pull request not found',
      statusCode: 404,
    });
  });

  it('should throw SERVICE_UNAVAILABLE for gh authentication failure', async () => {
    mockExecAsync
      .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git status (clean)
      .mockRejectedValueOnce(
        new Error('authentication required: gh auth login')
      ); // gh pr checkout

    await expect(
      service.checkoutPRBranch('owner/repo', 23, '/repo', { force: false })
    ).rejects.toMatchObject({
      message:
        'GitHub CLI is not authenticated. Please check your account in the header.',
      statusCode: 503,
    });
  });

  it('should throw INTERNAL_SERVER_ERROR for general checkout failure', async () => {
    mockExecAsync
      .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git status (clean)
      .mockRejectedValueOnce(new Error('unexpected error')); // gh pr checkout

    await expect(
      service.checkoutPRBranch('owner/repo', 23, '/repo', { force: false })
    ).rejects.toMatchObject({
      message: 'Failed to checkout PR branch',
      statusCode: 500,
    });
  });

  it('should throw BAD_REQUEST for invalid repo name', async () => {
    await expect(
      service.checkoutPRBranch('bad repo!', 23, '/repo', { force: false })
    ).rejects.toMatchObject({
      message: 'Invalid repository name',
      statusCode: 400,
    });
  });
});
