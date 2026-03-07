import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AsyncBoundary, Select } from '@/shared/components';
import { useQuery } from '@tanstack/react-query';
import { projectsQuery } from '@/shared/apis';
import { PRTable } from './components/PRTable/PRTable';

export const PRListPage = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: project } = useQuery({
    ...projectsQuery.detail(projectId!),
    throwOnError: false,
    enabled: !!projectId,
  });

  const remotes = project?.gitInfo.remotes ?? [];
  const defaultOrigin =
    remotes.find((r) => r.name === 'origin')?.name ??
    remotes[0]?.name ??
    'origin';

  const [selectedOrigin, setSelectedOrigin] = useState(defaultOrigin);

  if (!projectId) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <header className="mb-8">
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <Link to="/" className="hover:text-indigo-500">
            Projects
          </Link>
          <span>/</span>
          <span className="text-gray-900">{project?.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Pull Requests</h1>
          <div className="flex items-center gap-3">
            {remotes.length > 0 && (
              <Select
                label="Remote"
                options={remotes.map((r) => ({ value: r.name, label: r.name }))}
                value={selectedOrigin}
                onChange={(e) => setSelectedOrigin(e.target.value)}
              />
            )}
          </div>
        </div>
      </header>

      {remotes.length === 0 && project !== undefined ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm font-medium text-red-700">
            No git remotes configured for this project.
          </p>
          <p className="mt-1 text-sm text-red-500">
            Please add a remote (e.g.{' '}
            <code className="font-mono">git remote add origin &lt;url&gt;</code>
            ).
          </p>
        </div>
      ) : (
        <AsyncBoundary>
          <PRTable projectId={projectId} origin={selectedOrigin} />
        </AsyncBoundary>
      )}
    </div>
  );
};
