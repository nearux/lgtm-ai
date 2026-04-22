// Compatibility shim for services/claude/ClaudeSessionManager.ts, which is not
// yet migrated to the DI container and calls `getFileChanges` as a free
// function. Delegates to the DI-managed GitService. Remove this file once
// ClaudeSessionManager is migrated to inject GitService directly.
import { container } from '../container.js';
import {
  GitService,
  type FileChangesResult,
} from '../modules/projects/git.service.js';

export const getFileChanges = (
  workingDir: string
): Promise<FileChangesResult> =>
  container.get(GitService).getFileChanges(workingDir);
