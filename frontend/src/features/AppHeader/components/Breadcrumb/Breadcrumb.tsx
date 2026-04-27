import { Link, useMatch, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProjectDetailQueryOptions } from '@/queries';

export const Breadcrumb = () => {
  const prListMatch = useMatch('/projects/:projectId/prs');
  const prDetailMatch = useMatch('/projects/:projectId/prs/:prNumber');
  const issueListMatch = useMatch('/projects/:projectId/issues');
  const issueDetailMatch = useMatch('/projects/:projectId/issues/:issueNumber');
  const [searchParams] = useSearchParams();

  const match =
    prDetailMatch ?? prListMatch ?? issueDetailMatch ?? issueListMatch;
  const projectId = match?.params.projectId;
  const prNumber = prDetailMatch?.params.prNumber;
  const issueNumber = issueDetailMatch?.params.issueNumber;

  const { data: project } = useQuery({
    ...getProjectDetailQueryOptions(projectId ?? ''),
    enabled: !!projectId,
    throwOnError: false,
  });

  if (!projectId) return null;

  const origin = searchParams.get('origin');
  const originQuery = origin ? `?origin=${encodeURIComponent(origin)}` : '';
  const prListTo = `/projects/${projectId}/prs${originQuery}`;
  const issueListTo = `/projects/${projectId}/issues${originQuery}`;

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
      ) : issueNumber ? (
        <>
          <Link to={issueListTo} className="hover:text-indigo-500">
            {project?.name ?? '...'}
          </Link>
          <span>/</span>
          <span className="text-gray-900">Issue #{issueNumber}</span>
        </>
      ) : (
        <span className="text-gray-900">{project?.name ?? '...'}</span>
      )}
    </nav>
  );
};
