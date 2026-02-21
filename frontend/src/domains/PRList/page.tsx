import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAsync } from '@/shared/hooks';
import { getPRs, getProject } from '@/shared/api';
import { FullPageLoading, FullPageError } from '@/shared/components';
import { PRTable } from './components/PRTable/PRTable';
import type { PRListItem } from '@/shared/types';

export const PRListPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useAsync(() => getProject(projectId!), [projectId]);

  const {
    data: prs,
    isLoading: prsLoading,
    error: prsError,
    refetch,
  } = useAsync(() => getPRs(projectId!), [projectId]);

  const handlePRClick = (pr: PRListItem) => {
    navigate(`/projects/${projectId}/prs/${pr.number}`);
  };

  if (projectLoading || prsLoading) {
    return <FullPageLoading />;
  }

  const error = projectError || prsError;
  if (error) {
    return <FullPageError message={error} onRetry={refetch} />;
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
          <button
            type="button"
            className="rounded-lg bg-indigo-500 px-4 py-2 text-white transition-colors hover:bg-indigo-600"
          >
            Review All Pending
          </button>
        </div>
      </header>

      <PRTable prs={prs ?? []} onPRClick={handlePRClick} />
    </div>
  );
};
