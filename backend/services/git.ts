import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import HttpStatus from 'http-status';
import { AppError } from '../errors/AppError.js';
import type {
  FileChange,
  FileChangeStatus,
  FileChangesSummary,
} from '../types/claude.js';

const execFileAsync = promisify(execFile);

const BLOCKED_PATHS = [
  '/etc',
  '/bin',
  '/sbin',
  '/dev',
  '/sys',
  '/proc',
  '/root',
  '/boot',
];

export function validateWorkingDir(workingDir: string): void {
  const absPath = path.resolve(workingDir);

  if (!existsSync(absPath)) {
    throw new AppError('Directory not found', HttpStatus.NOT_FOUND);
  }

  if (!statSync(absPath).isDirectory()) {
    throw new AppError('Path is not a directory', HttpStatus.BAD_REQUEST);
  }

  if (
    BLOCKED_PATHS.some(
      (blocked) =>
        absPath === blocked || absPath.startsWith(path.join(blocked, path.sep))
    )
  ) {
    throw new AppError(
      'Access to this path is not allowed',
      HttpStatus.FORBIDDEN
    );
  }
}

async function git(workingDir: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd: workingDir });
  return stdout;
}

// ── File changes collection ─────────────────────────────────────────

export interface FileChangesResult {
  files: FileChange[];
  summary: FileChangesSummary;
}

function parseStatus(code: string): FileChangeStatus {
  if (code === 'A' || code === '?' || code === '??') return 'added';
  if (code === 'D') return 'deleted';
  return 'modified';
}

export async function getFileChanges(
  workingDir: string
): Promise<FileChangesResult> {
  // Stage untracked files as intent-to-add so they appear in git diff
  await git(workingDir, ['add', '-N', '.']).catch(() => {});

  const [statusOutput, numstatOutput, diffOutput] = await Promise.all([
    git(workingDir, ['status', '--porcelain']),
    git(workingDir, ['diff', '--numstat']),
    git(workingDir, ['diff']),
  ]);

  if (!statusOutput.trim()) {
    return {
      files: [],
      summary: { totalFiles: 0, totalAdditions: 0, totalDeletions: 0 },
    };
  }

  // Parse numstat for additions/deletions per file
  const numstatMap = new Map<
    string,
    { additions: number; deletions: number }
  >();
  for (const line of numstatOutput.trim().split('\n')) {
    if (!line) continue;
    const [add, del, path] = line.split('\t');
    numstatMap.set(path, {
      additions: add === '-' ? 0 : Number(add),
      deletions: del === '-' ? 0 : Number(del),
    });
  }

  // Parse per-file diffs
  const fileDiffs = parsePerFileDiffs(diffOutput);

  // Parse status for file list (trimEnd to preserve leading status codes like ' M')
  const files: FileChange[] = [];
  for (const line of statusOutput.trimEnd().split('\n')) {
    if (!line) continue;
    const statusCode = line.slice(0, 2).trim();
    const path = line.slice(3);
    const stats = numstatMap.get(path) ?? { additions: 0, deletions: 0 };

    files.push({
      path,
      status: parseStatus(statusCode),
      additions: stats.additions,
      deletions: stats.deletions,
      diff: fileDiffs.get(path) ?? '',
    });
  }

  const summary: FileChangesSummary = {
    totalFiles: files.length,
    totalAdditions: files.reduce((sum, f) => sum + f.additions, 0),
    totalDeletions: files.reduce((sum, f) => sum + f.deletions, 0),
  };

  return { files, summary };
}

function parsePerFileDiffs(diffOutput: string): Map<string, string> {
  const result = new Map<string, string>();
  if (!diffOutput.trim()) return result;

  const parts = diffOutput.split(/^(?=diff --git )/m);
  for (const part of parts) {
    if (!part.trim()) continue;
    // Extract b/path from "diff --git a/... b/..."
    const headerMatch = part.match(/^diff --git a\/.+ b\/(.+)$/m);
    if (headerMatch) {
      result.set(headerMatch[1], part);
    }
  }
  return result;
}

// ── Commit message generation ───────────────────────────────────────

const CLAUDE_TIMEOUT_MS = 60_000;

export async function generateCommitMessage(
  workingDir: string,
  prContext?: { title: string; body: string; reviewComment: string }
): Promise<string> {
  await git(workingDir, ['add', '-N', '.']).catch(() => {});
  const diff = await git(workingDir, ['diff']);

  if (!diff.trim()) {
    throw new Error('No changes to generate a commit message for');
  }

  let prompt = `Generate a concise git commit message for the following changes. Use conventional commit format (e.g., fix:, feat:, refactor:). Return ONLY the commit message, nothing else.\n\n`;

  if (prContext) {
    prompt += `## Context\nPR: ${prContext.title}\nReview comment: ${prContext.reviewComment}\n\n`;
  }

  prompt += `## Diff\n${diff}`;

  try {
    const { stdout } = await execFileAsync(
      'claude',
      ['--print', '--output-format', 'text', '-p', prompt],
      { cwd: workingDir, timeout: CLAUDE_TIMEOUT_MS }
    );

    return stdout.trim();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to generate commit message: ${message}`);
  }
}

// ── Commit and push ─────────────────────────────────────────────────

export interface CommitAndPushResult {
  success: boolean;
  commitHash?: string;
  error?: string;
}

export async function commitAndPush(
  workingDir: string,
  commitMessage: string
): Promise<CommitAndPushResult> {
  try {
    await git(workingDir, ['add', '-A']);
  } catch (err) {
    return {
      success: false,
      error: `git add: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  try {
    await git(workingDir, ['commit', '-m', commitMessage]);
  } catch (err) {
    return {
      success: false,
      error: `git commit: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  try {
    await git(workingDir, ['push']);
  } catch (err) {
    return {
      success: false,
      error: `git push: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  try {
    const hash = await git(workingDir, ['rev-parse', '--short', 'HEAD']);
    return { success: true, commitHash: hash.trim() };
  } catch {
    return { success: true };
  }
}
