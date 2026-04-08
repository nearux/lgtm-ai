import { useState } from 'react';
import {
  FileText,
  ChevronDown,
  ChevronRight,
  GitCommit,
  Loader2,
} from 'lucide-react';
import type { FileChangesData } from '../../../hooks';
import { FileChangeRow } from './FileChangeRow';

interface Props {
  data: FileChangesData;
  onCommitAndPush?: (push: boolean) => void;
  isCommitting?: boolean;
  commitResult?: { success: boolean; commitHash?: string; error?: string };
}

export const FileChangesCard = ({
  data,
  onCommitAndPush,
  isCommitting,
  commitResult,
}: Props) => {
  const [expanded, setExpanded] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const { files, summary } = data;

  if (summary.totalFiles === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-amber-100"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-amber-600" />
        ) : (
          <ChevronRight className="h-4 w-4 text-amber-600" />
        )}
        <FileText className="h-4 w-4 text-amber-600" />
        <span className="font-medium text-amber-800">
          {summary.totalFiles} file{summary.totalFiles !== 1 ? 's' : ''} changed
        </span>
        <DiffStats
          additions={summary.totalAdditions}
          deletions={summary.totalDeletions}
        />
      </button>

      {expanded && (
        <div className="border-t border-amber-200 bg-amber-100/50 p-2">
          <div className="space-y-1">
            {files.map((file) => (
              <FileChangeRow key={file.path} file={file} />
            ))}
          </div>
        </div>
      )}

      {onCommitAndPush && !commitResult && (
        <div className="border-t border-amber-200 px-3 py-2">
          <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={pushEnabled}
              onChange={(e) => setPushEnabled(e.target.checked)}
              className="accent-indigo-600"
            />
            Push to remote after commit
          </label>
          <button
            type="button"
            onClick={() => onCommitAndPush(pushEnabled)}
            disabled={isCommitting}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isCommitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GitCommit className="h-4 w-4" />
            )}
            {isCommitting
              ? pushEnabled
                ? 'Committing & Pushing...'
                : 'Committing...'
              : pushEnabled
                ? 'Commit & Push'
                : 'Commit'}
          </button>
        </div>
      )}

      {commitResult && (
        <CommitResult result={commitResult} pushed={pushEnabled} />
      )}
    </div>
  );
};

const DiffStats = ({
  additions,
  deletions,
}: {
  additions: number;
  deletions: number;
}) => (
  <span className="ml-auto flex items-center gap-2 text-xs">
    <span className="text-green-600">+{additions}</span>
    <span className="text-red-600">-{deletions}</span>
  </span>
);

const CommitResult = ({
  result,
  pushed,
}: {
  result: { success: boolean; commitHash?: string; error?: string };
  pushed: boolean;
}) => (
  <div
    className={`border-t px-3 py-2 text-xs ${
      result.success
        ? 'border-green-200 bg-green-50 text-green-700'
        : 'border-red-200 bg-red-50 text-red-700'
    }`}
  >
    {result.success
      ? pushed
        ? `Committed and pushed (${result.commitHash?.slice(0, 7)})`
        : `Committed locally (${result.commitHash?.slice(0, 7)})`
      : `Failed: ${result.error}`}
  </div>
);
