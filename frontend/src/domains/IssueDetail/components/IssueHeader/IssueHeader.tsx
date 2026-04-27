import { ExternalLink, MessageCircle } from 'lucide-react';
import { formatRelativeDate } from '@/shared/utils';
import { BotBadge, StatusBadge } from '@/shared/components';
import type { IssueDetail } from '@lgtmai/backend/types';

interface Props {
  issue: IssueDetail;
}

export const IssueHeader = ({ issue }: Props) => {
  return (
    <header className="mb-8">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {issue.url ? (
            <a
              href={issue.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-2 flex items-center gap-2 text-3xl font-bold text-gray-900"
            >
              {issue.title}
              <span className="text-gray-400">#{issue.number}</span>
              <ExternalLink className="h-5 w-5" />
            </a>
          ) : (
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              {issue.title}{' '}
              <span className="text-gray-400">#{issue.number}</span>
            </h1>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <StatusBadge status={issue.state.toLowerCase()} />
            <span className="flex items-center gap-2">
              <img
                src={issue.author.avatarUrl}
                alt={issue.author.login}
                className="h-5 w-5 rounded-full"
              />
              <span className="text-gray-700">{issue.author.login}</span>
              {issue.author.name &&
                issue.author.name !== issue.author.login && (
                  <span className="text-gray-400">({issue.author.name})</span>
                )}
              {issue.author.is_bot && <BotBadge />}
            </span>
            <span>opened {formatRelativeDate(issue.createdAt)}</span>
            {issue.closedAt && (
              <span>closed {formatRelativeDate(issue.closedAt)}</span>
            )}
            <span className="flex items-center gap-1" title="Comments">
              <MessageCircle className="h-4 w-4" />
              {issue.totalCommentsCount}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
