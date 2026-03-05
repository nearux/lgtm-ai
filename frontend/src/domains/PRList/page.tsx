import { Link, useParams } from 'react-router-dom';
import { AsyncBoundary, Tabs } from '@/shared/components';
import { usePRListParams } from './hooks/usePRListParams';
import { useQuery } from '@tanstack/react-query';
import { projectsQuery } from '@/shared/apis';
import { PRTable } from './components/PRTable/PRTable';
import type { PRState } from '@lgtmai/backend/types';

export const PRListPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { state, page, limit, setState, setPage } = usePRListParams();

  const { data: project } = useQuery({
    ...projectsQuery.detail(projectId!),
    throwOnError: false,
    enabled: !!projectId,
  });

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
        <h1 className="text-3xl font-bold text-gray-900">Pull Requests</h1>
      </header>

      <div className="mb-6">
        <Tabs options={stateOptions} value={state} onChange={setState} />
      </div>

      <AsyncBoundary key={state}>
        <PRTable
          projectId={projectId}
          state={state}
          page={page}
          limit={limit}
          onPageChange={setPage}
        />
      </AsyncBoundary>
    </div>
  );
};

const stateOptions: { value: PRState; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
];
