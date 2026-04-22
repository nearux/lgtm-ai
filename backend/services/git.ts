// backend/services/git.ts
// Compatibility shim for code not yet migrated (ClaudeSessionManager, etc.).
// Delegates to the DI-managed GitService. Remove this file once all consumers
// are migrated to inject GitService directly.
import { container } from '../container.js';
import {
  GitService,
  type FileChangesResult,
  type CommitAndPushResult,
} from '../modules/projects/git.service.js';

const getService = () => container.get(GitService);

export const getFileChanges = (
  workingDir: string
): Promise<FileChangesResult> => getService().getFileChanges(workingDir);

export const generateCommitMessage = (
  workingDir: string,
  prContext?: { title: string; body: string; reviewComment: string }
): Promise<string> => getService().generateCommitMessage(workingDir, prContext);

export const commitAndPush = (
  workingDir: string,
  commitMessage: string,
  push = true
): Promise<CommitAndPushResult> =>
  getService().commitAndPush(workingDir, commitMessage, push);
