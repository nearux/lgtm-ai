export type FileChangeStatus = 'added' | 'modified' | 'deleted';

export interface FileChange {
  path: string;
  status: FileChangeStatus;
  additions: number;
  deletions: number;
  diff: string;
}

export interface FileChangesSummary {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
}
