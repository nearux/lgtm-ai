import { Link } from 'react-router-dom';
import { ExternalLink, MessageCircle } from 'lucide-react';
import { formatDate } from '@/shared/utils';
import type { PRDetail } from '@lgtmai/backend/types';

interface Props {
  projectId: string;
  projectName?: string;
  prNumber: string;
  pr: PRDetail;
  origin?: string;
  githubBaseUrl?: string | null;
}

const statusColors = {
  open: 'bg-green-100 text-green-800',
  merged: 'bg-purple-100 text-purple-800',
  closed: 'bg-red-100 text-red-800',
};

export const PRHeader = ({
  projectId,
  projectName,
  prNumber,
  pr,
  origin,
  githubBaseUrl,
}: Props) => {
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
          to={`/projects/${projectId}/prs${origin ? `?origin=${encodeURIComponent(origin)}` : ''}`}
          className="hover:text-indigo-500"
        >
          {projectName}
        </Link>
        <span>/</span>
        <span className="text-gray-900">PR #{prNumber}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          {githubBaseUrl ? (
            <a
              href={`${githubBaseUrl}/pull/${pr.number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-2 flex items-center gap-2 text-3xl font-bold text-gray-900"
            >
              {pr.title}
              <ExternalLink className="h-5 w-5" />
            </a>
          ) : (
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              {pr.title}
            </h1>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <img
                src={pr.author.avatarUrl}
                alt={pr.author.login}
                className="h-5 w-5 rounded-full"
              />
              {pr.author.login}
            </span>
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${statusColor}`}
            >
              {pr.state}
            </span>
            <span>Created {formatDate(pr.createdAt)}</span>
            <span className="flex items-center gap-1" title="Comments">
              <MessageCircle className="h-4 w-4" />
              {pr.comments.length +
                pr.reviews.reduce((sum, r) => sum + r.inlineComments.length, 0)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
