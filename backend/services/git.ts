import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import HttpStatus from 'http-status';
import type {
  FileChange,
  FileChangeStatus,
  FileChangesSummary,
} from '../types/claude.js';
import { AppError } from '../errors/AppError.js';
import { git } from '../utils/git.js';

const execFileAsync = promisify(execFile);

export interface FileChangesResult {
  files: FileChange[];
  summary: FileChangesSummary;
}

export interface CommitAndPushResult {
  success: boolean;
  commitHash?: string;
  error?: string;
}

export async function getFileChanges(
  workingDir: string
): Promise<FileChangesResult> {
  // Stage untracked files as intent-to-add so they appear in git diff
  await git(workingDir, ['add', '-N', '.']).catch((err) => {
    console.warn('[getFileChanges] git add -N failed:', err);
  });

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

export async function generateCommitMessage(
  workingDir: string,
  prContext?: { title: string; body: string; reviewComment: string }
): Promise<string> {
  await git(workingDir, ['add', '-N', '.']).catch((err) => {
    console.warn('[generateCommitMessage] git add -N failed:', err);
  });
  const diff = await git(workingDir, ['diff', 'HEAD']);

  if (!diff.trim()) {
    throw new AppError(
      'No changes to generate a commit message for',
      HttpStatus.UNPROCESSABLE_ENTITY
    );
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

    return cleanCommitMessage(stdout);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new AppError(
      `Failed to generate commit message: ${message}`,
      HttpStatus.BAD_GATEWAY
    );
  }
}

export async function commitAndPush(
  workingDir: string,
  commitMessage: string
): Promise<CommitAndPushResult> {
  try {
    await git(workingDir, ['add', '-A']);
  } catch (err) {
    console.error('[commitAndPush] git add failed:', err);
    return {
      success: false,
      error: `git add: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  try {
    await git(workingDir, ['commit', '-m', commitMessage]);
  } catch (err) {
    console.error('[commitAndPush] git commit failed:', err);
    return {
      success: false,
      error: `git commit: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  try {
    await git(workingDir, ['push']);
  } catch (err) {
    console.error('[commitAndPush] git push failed:', err);
    return {
      success: false,
      error: `git push: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  try {
    const hash = await git(workingDir, ['rev-parse', '--short', 'HEAD']);
    return { success: true, commitHash: hash.trim() };
  } catch (err) {
    console.warn(
      '[commitAndPush] git rev-parse failed, but commit and push succeeded',
      err
    );
    return { success: true };
  }
}

const CLAUDE_TIMEOUT_MS = 60_000;

const CONVENTIONAL_COMMIT_RE =
  /^(?:feat|fix|refactor|chore|docs|style|test|perf|ci|build|revert)(?:\(.+?\))?[!]?:/m;

function parseStatus(code: string): FileChangeStatus {
  if (code === 'A' || code === '?' || code === '??') return 'added';
  if (code === 'D') return 'deleted';
  return 'modified';
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

function cleanCommitMessage(raw: string): string {
  let msg = raw.trim();

  // Strip markdown code fences (```commit\n...\n```)
  msg = msg.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
  msg = msg.trim();

  // If the message doesn't start with a conventional commit prefix,
  // find where it begins and discard everything before it.
  if (!CONVENTIONAL_COMMIT_RE.test(msg.split('\n')[0])) {
    const match = CONVENTIONAL_COMMIT_RE.exec(msg);
    if (match) {
      msg = msg.slice(match.index);
    }
  }

  return msg.trim();
}
