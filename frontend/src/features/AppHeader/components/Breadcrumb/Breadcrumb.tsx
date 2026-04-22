import { Link, useMatch, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProjectDetailQueryOptions } from '@/queries';

export const Breadcrumb = () => {
  const prListMatch = useMatch('/projects/:projectId/prs');
  const prDetailMatch = useMatch('/projects/:projectId/prs/:prNumber');
  const [searchParams] = useSearchParams();

  const match = prDetailMatch ?? prListMatch;
  const projectId = match?.params.projectId;
  const prNumber = prDetailMatch?.params.prNumber;

  const { data: project } = useQuery({
    ...getProjectDetailQueryOptions(projectId ?? ''),
    enabled: !!projectId,
    throwOnError: false,
  });

  if (!projectId) return null;

  const origin = searchParams.get('origin');
  const prListTo = `/projects/${projectId}/prs${
    origin ? `?origin=${encodeURIComponent(origin)}` : ''
  }`;

  return (
    <nav className="flex items-center gap-2 text-sm text-gray-500">
      <Link to="/" className="hover:text-indigo-500">
        Projects
      </Link>
      <span>/</span>
      {prNumber ? (
        <>
          <Link to={prListTo} className="hover:text-indigo-500">
            {project?.name ?? '...'}
          </Link>
          <span>/</span>
          <span className="text-gray-900">PR #{prNumber}</span>
        </>
      ) : (
        <span className="text-gray-900">{project?.name ?? '...'}</span>
      )}
    </nav>
  );
};
