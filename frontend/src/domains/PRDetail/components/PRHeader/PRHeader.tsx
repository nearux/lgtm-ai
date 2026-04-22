import { ExternalLink, MessageCircle } from 'lucide-react';
import { formatDate } from '@/shared/utils';
import type { PRDetail } from '@lgtmai/backend/types';

interface Props {
  pr: PRDetail;
  githubBaseUrl?: string | null;
}

const statusColors = {
  open: 'bg-green-100 text-green-800',
  merged: 'bg-purple-100 text-purple-800',
  closed: 'bg-red-100 text-red-800',
};

export const PRHeader = ({ pr, githubBaseUrl }: Props) => {
  const statusColor =
    statusColors[pr.state as keyof typeof statusColors] ||
    'bg-gray-100 text-gray-800';

  return (
    <header className="mb-8">
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
              {pr.totalCommentsCount}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
