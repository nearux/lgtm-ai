import { Link } from 'react-router-dom';
import { formatDate } from '@/shared/utils';
import type { PRDetail } from '@lgtmai/backend/types';

interface Props {
  projectId: string;
  projectName?: string;
  prNumber: string;
  pr: PRDetail;
}

const statusColors = {
  open: 'bg-green-100 text-green-800',
  merged: 'bg-purple-100 text-purple-800',
  closed: 'bg-red-100 text-red-800',
};

export const PRHeader = ({ projectId, projectName, prNumber, pr }: Props) => {
  const statusColor =
    statusColors[pr.state as keyof typeof statusColors] ||
    'bg-gray-100 text-gray-800';

  return (
    <header className="mb-8">
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <Link to="/" className="hover:text-indigo-500">
          Projects
        </Link>
        <span>/</span>
        <Link
          to={`/projects/${projectId}/prs`}
          className="hover:text-indigo-500"
        >
          {projectName}
        </Link>
        <span>/</span>
        <span className="text-gray-900">PR #{prNumber}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">{pr.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
              {pr.author.login}
            </span>
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${statusColor}`}
            >
              {pr.state}
            </span>
            <span>Created {formatDate(pr.createdAt)}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
