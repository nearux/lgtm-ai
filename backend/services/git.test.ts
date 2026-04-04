import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecFileAsync = vi.hoisted(() => vi.fn());

vi.mock('node:util', () => ({
  promisify: () => mockExecFileAsync,
}));

const { getFileChanges, generateCommitMessage, commitAndPush } =
  await import('./git.js');

// ── Helpers ─────────────────────────────────────────────────────────

/** Build a mock that resolves differently per call based on git args. */
function mockGitCommands(commands: Record<string, string | Error>): void {
  mockExecFileAsync.mockImplementation((cmd: string, args: string[]) => {
    const key = cmd === 'git' ? args.join(' ') : cmd;
    for (const [pattern, value] of Object.entries(commands)) {
      if (key.includes(pattern)) {
        if (value instanceof Error) return Promise.reject(value);
        return Promise.resolve({ stdout: value, stderr: '' });
      }
    }
    return Promise.resolve({ stdout: '', stderr: '' });
  });
}

describe('git service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getFileChanges ──────────────────────────────────────────────

  describe('getFileChanges', () => {
    it('should return empty result when no changes', async () => {
      mockGitCommands({
        'add -N': '',
        'status --porcelain': '',
        '--numstat': '',
        diff: '',
      });

      const result = await getFileChanges('/workspace');

      expect(result.files).toEqual([]);
      expect(result.summary).toEqual({
        totalFiles: 0,
        totalAdditions: 0,
        totalDeletions: 0,
      });
    });

    it('should parse modified file changes', async () => {
      const statusOutput = ' M src/index.ts\n';
      const numstatOutput = '10\t3\tsrc/index.ts\n';
      const diffOutput = `diff --git a/src/index.ts b/src/index.ts
index abc1234..def5678 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,10 @@
+added line
`;

      mockGitCommands({
        'add -N': '',
        'status --porcelain': statusOutput,
        '--numstat': numstatOutput,
      });
      // diff (without --numstat) needs separate handling
      mockExecFileAsync.mockImplementation((cmd: string, args: string[]) => {
        const joined = args.join(' ');
        if (joined === 'add -N .')
          return Promise.resolve({ stdout: '', stderr: '' });
        if (joined === 'status --porcelain')
          return Promise.resolve({ stdout: statusOutput, stderr: '' });
        if (joined === 'diff --numstat')
          return Promise.resolve({ stdout: numstatOutput, stderr: '' });
        if (joined === 'diff')
          return Promise.resolve({ stdout: diffOutput, stderr: '' });
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await getFileChanges('/workspace');

      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toEqual({
        path: 'src/index.ts',
        status: 'modified',
        additions: 10,
        deletions: 3,
        diff: diffOutput,
      });
      expect(result.summary).toEqual({
        totalFiles: 1,
        totalAdditions: 10,
        totalDeletions: 3,
      });
    });

    it('should parse untracked (added) files', async () => {
      const statusOutput = '?? newfile.ts\n';
      const numstatOutput = '5\t0\tnewfile.ts\n';
      const diffOutput = `diff --git a/newfile.ts b/newfile.ts
new file mode 100644
--- /dev/null
+++ b/newfile.ts
@@ -0,0 +1,5 @@
+content
`;

      mockExecFileAsync.mockImplementation((_cmd: string, args: string[]) => {
        const joined = args.join(' ');
        if (joined === 'add -N .')
          return Promise.resolve({ stdout: '', stderr: '' });
        if (joined === 'status --porcelain')
          return Promise.resolve({ stdout: statusOutput, stderr: '' });
        if (joined === 'diff --numstat')
          return Promise.resolve({ stdout: numstatOutput, stderr: '' });
        if (joined === 'diff')
          return Promise.resolve({ stdout: diffOutput, stderr: '' });
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await getFileChanges('/workspace');

      expect(result.files[0].status).toBe('added');
      expect(result.files[0].additions).toBe(5);
    });

    it('should parse deleted files', async () => {
      const statusOutput = ' D old.ts\n';

      mockExecFileAsync.mockImplementation((_cmd: string, args: string[]) => {
        const joined = args.join(' ');
        if (joined === 'add -N .')
          return Promise.resolve({ stdout: '', stderr: '' });
        if (joined === 'status --porcelain')
          return Promise.resolve({ stdout: statusOutput, stderr: '' });
        if (joined === 'diff --numstat')
          return Promise.resolve({ stdout: '0\t15\told.ts\n', stderr: '' });
        if (joined === 'diff')
          return Promise.resolve({ stdout: '', stderr: '' });
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await getFileChanges('/workspace');

      expect(result.files[0].status).toBe('deleted');
      expect(result.files[0].deletions).toBe(15);
    });

    it('should handle multiple file changes', async () => {
      const statusOutput = ' M a.ts\n?? b.ts\n D c.ts\n';
      const numstatOutput = '2\t1\ta.ts\n5\t0\tb.ts\n0\t10\tc.ts\n';

      mockExecFileAsync.mockImplementation((_cmd: string, args: string[]) => {
        const joined = args.join(' ');
        if (joined === 'add -N .')
          return Promise.resolve({ stdout: '', stderr: '' });
        if (joined === 'status --porcelain')
          return Promise.resolve({ stdout: statusOutput, stderr: '' });
        if (joined === 'diff --numstat')
          return Promise.resolve({ stdout: numstatOutput, stderr: '' });
        if (joined === 'diff')
          return Promise.resolve({ stdout: '', stderr: '' });
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await getFileChanges('/workspace');

      expect(result.files).toHaveLength(3);
      expect(result.summary).toEqual({
        totalFiles: 3,
        totalAdditions: 7,
        totalDeletions: 11,
      });
    });

    it('should handle binary files in numstat (- - notation)', async () => {
      const statusOutput = ' M image.png\n';
      const numstatOutput = '-\t-\timage.png\n';

      mockExecFileAsync.mockImplementation((_cmd: string, args: string[]) => {
        const joined = args.join(' ');
        if (joined === 'add -N .')
          return Promise.resolve({ stdout: '', stderr: '' });
        if (joined === 'status --porcelain')
          return Promise.resolve({ stdout: statusOutput, stderr: '' });
        if (joined === 'diff --numstat')
          return Promise.resolve({ stdout: numstatOutput, stderr: '' });
        if (joined === 'diff')
          return Promise.resolve({ stdout: '', stderr: '' });
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await getFileChanges('/workspace');

      expect(result.files[0].additions).toBe(0);
      expect(result.files[0].deletions).toBe(0);
    });
  });

  // ── generateCommitMessage ───────────────────────────────────────

  describe('generateCommitMessage', () => {
    it('should generate commit message from diff', async () => {
      mockExecFileAsync.mockImplementation((cmd: string, args: string[]) => {
        if (cmd === 'git' && args.join(' ') === 'add -N .')
          return Promise.resolve({ stdout: '', stderr: '' });
        if (cmd === 'git' && args.join(' ') === 'diff')
          return Promise.resolve({ stdout: '+new line\n', stderr: '' });
        if (cmd === 'claude')
          return Promise.resolve({ stdout: 'fix: update logic\n', stderr: '' });
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await generateCommitMessage('/workspace');

      expect(result).toBe('fix: update logic');
    });

    it('should include PR context in prompt when provided', async () => {
      let capturedArgs: string[] = [];

      mockExecFileAsync.mockImplementation((cmd: string, args: string[]) => {
        if (cmd === 'git' && args.join(' ') === 'add -N .')
          return Promise.resolve({ stdout: '', stderr: '' });
        if (cmd === 'git' && args.join(' ') === 'diff')
          return Promise.resolve({ stdout: '+change\n', stderr: '' });
        if (cmd === 'claude') {
          capturedArgs = args;
          return Promise.resolve({
            stdout: 'fix: address review\n',
            stderr: '',
          });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      await generateCommitMessage('/workspace', {
        title: 'PR title',
        body: 'PR body',
        reviewComment: 'Fix this issue',
      });

      const prompt = capturedArgs[capturedArgs.indexOf('-p') + 1];
      expect(prompt).toContain('PR: PR title');
      expect(prompt).toContain('Review comment: Fix this issue');
    });

    it('should throw when no changes exist', async () => {
      mockExecFileAsync.mockImplementation((cmd: string, args: string[]) => {
        if (cmd === 'git' && args.join(' ') === 'add -N .')
          return Promise.resolve({ stdout: '', stderr: '' });
        if (cmd === 'git' && args.join(' ') === 'diff')
          return Promise.resolve({ stdout: '', stderr: '' });
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      await expect(generateCommitMessage('/workspace')).rejects.toThrow(
        'No changes to generate a commit message for'
      );
    });

    it('should wrap Claude CLI errors', async () => {
      mockExecFileAsync.mockImplementation((cmd: string, args: string[]) => {
        if (cmd === 'git' && args.join(' ') === 'add -N .')
          return Promise.resolve({ stdout: '', stderr: '' });
        if (cmd === 'git' && args.join(' ') === 'diff')
          return Promise.resolve({ stdout: '+change\n', stderr: '' });
        if (cmd === 'claude') return Promise.reject(new Error('CLI not found'));
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      await expect(generateCommitMessage('/workspace')).rejects.toThrow(
        'Failed to generate commit message: CLI not found'
      );
    });
  });

  // ── commitAndPush ───────────────────────────────────────────────

  describe('commitAndPush', () => {
    it('should execute add, commit, push and return commit hash', async () => {
      const calls: string[] = [];

      mockExecFileAsync.mockImplementation((_cmd: string, args: string[]) => {
        const joined = args.join(' ');
        calls.push(joined);
        if (joined.includes('rev-parse'))
          return Promise.resolve({ stdout: 'abc1234\n', stderr: '' });
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await commitAndPush('/workspace', 'fix: test');

      expect(result).toEqual({ success: true, commitHash: 'abc1234' });
      expect(calls).toEqual([
        'add -A',
        'commit -m fix: test',
        'push',
        'rev-parse --short HEAD',
      ]);
    });

    it('should return error when git add fails', async () => {
      mockExecFileAsync.mockRejectedValue(new Error('add failed'));

      const result = await commitAndPush('/workspace', 'fix: test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('git add:');
    });

    it('should return error when git commit fails', async () => {
      mockExecFileAsync.mockImplementation((_cmd: string, args: string[]) => {
        if (args[0] === 'commit')
          return Promise.reject(new Error('nothing to commit'));
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await commitAndPush('/workspace', 'fix: test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('git commit:');
    });

    it('should return error when git push fails', async () => {
      mockExecFileAsync.mockImplementation((_cmd: string, args: string[]) => {
        if (args[0] === 'push')
          return Promise.reject(new Error('remote rejected'));
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await commitAndPush('/workspace', 'fix: test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('git push:');
    });

    it('should return success even if rev-parse fails', async () => {
      mockExecFileAsync.mockImplementation((_cmd: string, args: string[]) => {
        if (args.includes('rev-parse'))
          return Promise.reject(new Error('not a git repo'));
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await commitAndPush('/workspace', 'fix: test');

      expect(result).toEqual({ success: true });
    });
  });
});
