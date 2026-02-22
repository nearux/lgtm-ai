import { Link, useParams } from 'react-router-dom';
import { AsyncBoundary, Button } from '@/shared/components';
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
          <Button>Review All Pending</Button>
        </div>
      </header>
      <AsyncBoundary>
        <PRTable projectId={projectId} />
      </AsyncBoundary>
    </div>
  );
};
