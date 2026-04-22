import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import HttpStatus from 'http-status';
import { filter, map, pipe, sumBy } from 'remeda';
import { injectable } from 'inversify';
import type {
  FileChange,
  FileChangeStatus,
  FileChangesSummary,
} from '../../types/claude.js';
import { AppError } from '../../errors/AppError.js';
import { git } from './git.util.js';

const execFileAsync = promisify(execFile);

const CLAUDE_TIMEOUT_MS = 60_000;

const CONVENTIONAL_COMMIT_RE =
  /^(?:feat|fix|refactor|chore|docs|style|test|perf|ci|build|revert)(?:\(.+?\))?[!]?:/m;

export interface FileChangesResult {
  files: FileChange[];
  summary: FileChangesSummary;
}

export interface CommitAndPushResult {
  success: boolean;
  commitHash?: string;
  error?: string;
}

@injectable()
export class GitService {
  async getFileChanges(workingDir: string): Promise<FileChangesResult> {
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

    const numstatMap = new Map(
      pipe(
        numstatOutput.trim().split('\n'),
        filter((line) => line.length > 0),
        map((line) => this.toNumstatEntry(line))
      )
    );

    const fileDiffs = this.parsePerFileDiffs(diffOutput);

    const files = pipe(
      statusOutput.trimEnd().split('\n'),
      filter((line) => line.length > 0),
      map((line) => this.toFileChange(line, numstatMap, fileDiffs))
    );

    const summary: FileChangesSummary = {
      totalFiles: files.length,
      totalAdditions: sumBy(files, (f) => f.additions),
      totalDeletions: sumBy(files, (f) => f.deletions),
    };

    return { files, summary };
  }

  async generateCommitMessage(
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

      return this.cleanCommitMessage(stdout);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new AppError(
        `Failed to generate commit message: ${message}`,
        HttpStatus.BAD_GATEWAY
      );
    }
  }

  async commitAndPush(
    workingDir: string,
    commitMessage: string,
    push = true
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

    if (push) {
      try {
        await git(workingDir, ['push', 'origin', 'HEAD']);
      } catch (err) {
        console.error('[commitAndPush] git push failed:', err);
        return {
          success: false,
          error: `git push: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }

    try {
      const hash = await git(workingDir, ['rev-parse', '--short', 'HEAD']);
      return { success: true, commitHash: hash.trim() };
    } catch (err) {
      console.warn(
        '[commitAndPush] git rev-parse failed, but commit succeeded',
        err
      );
      return { success: true };
    }
  }

  private parseStatus(code: string): FileChangeStatus {
    if (code === 'A' || code === '?' || code === '??') return 'added';
    if (code === 'D') return 'deleted';
    return 'modified';
  }

  private toNumstatEntry(
    line: string
  ): [string, { additions: number; deletions: number }] {
    const [add, del, path] = line.split('\t');
    return [
      path,
      {
        additions: add === '-' ? 0 : Number(add),
        deletions: del === '-' ? 0 : Number(del),
      },
    ];
  }

  private toFileChange(
    line: string,
    numstatMap: Map<string, { additions: number; deletions: number }>,
    fileDiffs: Map<string, string>
  ): FileChange {
    const path = line.slice(3);
    const stats = numstatMap.get(path) ?? { additions: 0, deletions: 0 };
    return {
      path,
      status: this.parseStatus(line.slice(0, 2).trim()),
      additions: stats.additions,
      deletions: stats.deletions,
      diff: fileDiffs.get(path) ?? '',
    };
  }

  private parsePerFileDiffs(diffOutput: string): Map<string, string> {
    const result = new Map<string, string>();
    if (!diffOutput.trim()) return result;

    const parts = diffOutput.split(/^(?=diff --git )/m);
    for (const part of parts) {
      if (!part.trim()) continue;
      const headerMatch = part.match(/^diff --git a\/.+ b\/(.+)$/m);
      if (headerMatch) {
        result.set(headerMatch[1], part);
      }
    }
    return result;
  }

  private cleanCommitMessage(raw: string): string {
    let msg = raw.trim();
    msg = msg.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
    msg = msg.trim();

    if (!CONVENTIONAL_COMMIT_RE.test(msg.split('\n')[0])) {
      const match = CONVENTIONAL_COMMIT_RE.exec(msg);
      if (match) {
        msg = msg.slice(match.index);
      }
    }

    return msg.trim();
  }
}
