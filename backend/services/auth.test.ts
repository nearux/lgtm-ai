import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecFileAsync = vi.hoisted(() => vi.fn());

vi.mock('node:util', () => ({
  promisify: () => mockExecFileAsync,
}));

const { getStatus, switchAccount } = await import('./auth.js');

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStatus', () => {
    const singleAccountOutput = [
      'github.com',
      '  ✓ Logged in to github.com account octocat (keyring)',
      '  - Active account: true',
    ].join('\n');

    const multiAccountOutput = [
      'github.com',
      '  ✓ Logged in to github.com account octocat (keyring)',
      '  - Active account: true',
      'github.com',
      '  ✓ Logged in to github.com account monalisa (keyring)',
      '  - Active account: false',
    ].join('\n');

    it('should parse single account from stderr', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: '',
        stderr: singleAccountOutput,
      });

      const result = await getStatus();

      expect(result).toEqual({
        activeAccount: 'octocat',
        accounts: [{ username: 'octocat', active: true }],
      });
    });

    it('should parse multiple accounts', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: '',
        stderr: multiAccountOutput,
      });

      const result = await getStatus();

      expect(result).toEqual({
        activeAccount: 'octocat',
        accounts: [
          { username: 'octocat', active: true },
          { username: 'monalisa', active: false },
        ],
      });
    });

    it('should fallback to stdout when stderr is empty', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: singleAccountOutput,
        stderr: '',
      });

      const result = await getStatus();

      expect(result).toEqual({
        activeAccount: 'octocat',
        accounts: [{ username: 'octocat', active: true }],
      });
    });

    it('should parse from stderr on non-zero exit (not logged in)', async () => {
      mockExecFileAsync.mockRejectedValue({
        stderr: singleAccountOutput,
      });

      const result = await getStatus();

      expect(result).toEqual({
        activeAccount: 'octocat',
        accounts: [{ username: 'octocat', active: true }],
      });
    });

    it('should throw SERVICE_UNAVAILABLE when gh CLI is not available', async () => {
      mockExecFileAsync.mockRejectedValue(new Error('ENOENT'));

      await expect(getStatus()).rejects.toMatchObject({
        message: 'GitHub CLI is not available',
        statusCode: 503,
      });
    });

    it('should throw SERVICE_UNAVAILABLE when no accounts are found', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: '',
        stderr: 'some unrecognized output',
      });

      await expect(getStatus()).rejects.toMatchObject({
        message:
          'No GitHub accounts found. Run "gh auth login" in your terminal.',
        statusCode: 503,
      });
    });

    it('should use first account as active when none is marked active', async () => {
      const noActiveOutput = [
        'github.com',
        '  ✓ Logged in to github.com account octocat (keyring)',
        '  - Active account: false',
        'github.com',
        '  ✓ Logged in to github.com account monalisa (keyring)',
        '  - Active account: false',
      ].join('\n');

      mockExecFileAsync.mockResolvedValue({
        stdout: '',
        stderr: noActiveOutput,
      });

      const result = await getStatus();

      expect(result.activeAccount).toBe('octocat');
    });
  });

  describe('switchAccount', () => {
    const statusAfterSwitch = [
      'github.com',
      '  ✓ Logged in to github.com account monalisa (keyring)',
      '  - Active account: true',
    ].join('\n');

    it('should switch account and return new status', async () => {
      mockExecFileAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // switch command
        .mockResolvedValueOnce({ stdout: '', stderr: statusAfterSwitch }); // getStatus call

      const result = await switchAccount('monalisa');

      expect(mockExecFileAsync).toHaveBeenNthCalledWith(1, 'gh', [
        'auth',
        'switch',
        '--user',
        'monalisa',
      ]);
      expect(result).toEqual({
        activeAccount: 'monalisa',
        accounts: [{ username: 'monalisa', active: true }],
      });
    });

    it.each(['', '-invalid', 'user--name', 'a'.repeat(40)])(
      'should reject invalid username: %s',
      async (name) => {
        await expect(switchAccount(name)).rejects.toMatchObject({
          message: 'Invalid GitHub username',
          statusCode: 400,
        });
      }
    );

    it('should throw BAD_REQUEST when switch command fails', async () => {
      mockExecFileAsync.mockRejectedValue(
        new Error('account "unknown" not found')
      );

      const result = switchAccount('unknown');
      await expect(result).rejects.toThrow(
        'Failed to switch GitHub account to "unknown"'
      );
      await expect(result).rejects.toMatchObject({ statusCode: 400 });
    });
  });
});
