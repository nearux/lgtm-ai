import { useState } from 'react';
import { Plus, Minus, ChevronDown, ChevronRight } from 'lucide-react';
import { Diff, Hunk, parseDiff } from 'react-diff-view';
import 'react-diff-view/style/index.css';
import type { FileChange } from '@lgtmai/backend/types';

interface Props {
  file: FileChange;
}

export const FileChangeRow = ({ file }: Props) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-amber-200/50"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-amber-500" />
        ) : (
          <ChevronRight className="h-3 w-3 text-amber-500" />
        )}
        <StatusBadge status={file.status} />
        <span className="min-w-0 flex-1 truncate text-left text-gray-800">
          {file.path}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <span className="flex items-center text-green-600">
            <Plus className="h-3 w-3" />
            {file.additions}
          </span>
          <span className="flex items-center text-red-600">
            <Minus className="h-3 w-3" />
            {file.deletions}
          </span>
        </span>
      </button>
      {expanded && file.diff && <FileDiff diff={file.diff} path={file.path} />}
    </div>
  );
};

const statusColors = {
  added: 'bg-green-100 text-green-700',
  modified: 'bg-blue-100 text-blue-700',
  deleted: 'bg-red-100 text-red-700',
};

const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${statusColors[status as keyof typeof statusColors] ?? 'bg-gray-100 text-gray-600'}`}
  >
    {status[0]?.toUpperCase()}
  </span>
);

const FileDiff = ({ diff, path }: { diff: string; path: string }) => {
  const fullDiff = diff.startsWith('diff --git')
    ? diff
    : `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n${diff}`;

  try {
    const files = parseDiff(fullDiff);
    if (!files.length || !files[0].hunks.length) throw new Error('empty');
    const { type, hunks } = files[0];

    return (
      <div className="mt-1 max-h-48 overflow-auto text-xs">
        <Diff viewType="unified" diffType={type} hunks={hunks}>
          {(hunks) =>
            hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)
          }
        </Diff>
      </div>
    );
  } catch {
    return (
      <pre className="mt-1 max-h-48 overflow-auto rounded bg-gray-900 p-2 text-[11px] leading-relaxed text-gray-100">
        {diff}
      </pre>
    );
  }
};
