import { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import {
  Folder,
  ChevronRight,
  ArrowUp,
  Home,
  Check,
  AlertCircle,
} from 'lucide-react';
import { fsQuery } from '@/shared/apis';
import { Button, IconButton, Spinner } from '@/shared/components';

interface Props {
  initialPath?: string;
  onSelect: (path: string) => void;
  onCancel: () => void;
}

export const FolderBrowser = ({ initialPath, onSelect, onCancel }: Props) => {
  const [currentPath, setCurrentPath] = useState<string | undefined>(
    initialPath
  );

  const { data } = useSuspenseQuery(fsQuery.browse(currentPath));

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
  };

  const handleGoUp = () => {
    if (data.parent) {
      setCurrentPath(data.parent);
    }
  };

  const handleGoHome = () => {
    setCurrentPath(undefined);
  };

  const handleSelect = () => {
    onSelect(data.path);
  };

  const pathSegments = data.path.split('/').filter(Boolean);

  return (
    <div className="flex h-80 flex-col rounded-lg border border-gray-200 bg-white">
      {/* Header with path breadcrumb */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2">
        <IconButton onClick={handleGoHome} title="Go to home">
          <Home className="h-4 w-4" />
        </IconButton>
        <IconButton
          onClick={handleGoUp}
          disabled={!data.parent}
          title="Go to parent folder"
        >
          <ArrowUp className="h-4 w-4" />
        </IconButton>
        <div className="flex flex-1 items-center gap-1 overflow-x-auto text-sm">
          <span className="text-gray-400">/</span>
          {pathSegments.map((segment, index) => {
            const segmentPath =
              '/' + pathSegments.slice(0, index + 1).join('/');
            const isLast = index === pathSegments.length - 1;
            return (
              <div key={segmentPath} className="flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight className="h-3 w-3 text-gray-400" />
                )}
                <button
                  type="button"
                  onClick={() => handleNavigate(segmentPath)}
                  className={`rounded px-1 whitespace-nowrap hover:bg-gray-100 ${
                    isLast ? 'font-medium text-gray-900' : 'text-gray-600'
                  }`}
                >
                  {segment}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Directory list */}
      <div className="flex-1 overflow-y-auto">
        {data.entries.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            No subdirectories
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.entries.map((entry) => (
              <li key={entry.path}>
                <button
                  type="button"
                  onClick={() => handleNavigate(entry.path)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
                >
                  <Folder className="h-5 w-5 text-indigo-500" />
                  <span className="truncate text-sm text-gray-700">
                    {entry.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer with actions */}
      <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2">
        <div className="truncate text-xs text-gray-500">{data.path}</div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSelect}>
            <Check className="h-4 w-4" />
            Select
          </Button>
        </div>
      </div>
    </div>
  );
};

FolderBrowser.Fallback = () => (
  <div className="flex h-80 items-center justify-center rounded-lg border border-gray-200 bg-white">
    <Spinner size="lg" />
  </div>
);

FolderBrowser.ErrorFallback = ({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) => (
  <div className="flex h-80 flex-col items-center justify-center gap-4 rounded-lg border border-gray-200 bg-white">
    <AlertCircle className="h-12 w-12 text-red-500" />
    <p className="text-sm text-gray-700">{error.message}</p>
    <Button variant="secondary" size="sm" onClick={reset}>
      Try Again
    </Button>
  </div>
);
