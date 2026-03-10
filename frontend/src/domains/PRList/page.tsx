import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AsyncBoundary, Select, Tabs } from '@/shared/components';
import { usePRListParams } from './hooks/usePRListParams';
import { useQuery } from '@tanstack/react-query';
import { projectsQuery } from '@/shared/apis';
import { PRTable } from './components/PRTable/PRTable';
import type { PRState } from '@lgtmai/backend/types';

export const PRListPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, page, limit, setState, setPage } = usePRListParams();

  const { data: project } = useQuery({
    ...projectsQuery.detail(projectId!),
    throwOnError: false,
    enabled: !!projectId,
  });

  const remotes = project?.gitInfo.remotes ?? [];
  const defaultOrigin = remotes.some((r) => r.name === 'origin')
    ? 'origin'
    : (remotes[0]?.name ?? 'origin');

  const selectedOrigin = searchParams.get('origin') ?? defaultOrigin;

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
                onChange={(e) =>
                  setSearchParams({ origin: e.target.value }, { replace: true })
                }
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
        <>
          <div className="mb-6">
            <Tabs options={stateOptions} value={state} onChange={setState} />
          </div>

          <AsyncBoundary key={`${state}-${selectedOrigin}`}>
            <PRTable
              projectId={projectId}
              origin={selectedOrigin}
              state={state}
              page={page}
              limit={limit}
              onPageChange={setPage}
            />
          </AsyncBoundary>
        </>
      )}
    </div>
  );
};

const stateOptions: { value: PRState; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
];
