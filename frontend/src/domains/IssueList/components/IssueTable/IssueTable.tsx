import { formatDate } from '@/shared/utils';
import { Pagination, Spinner, StatusBadge } from '@/shared/components';
import type { IssueListItem, IssueState } from '@lgtmai/backend/types';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getIssueListQueryOptions } from '@/queries';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

interface Props {
  projectId: string;
  origin: string;
  state: IssueState;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export const IssueTable = ({
  projectId,
  origin,
  state,
  page,
  limit,
  onPageChange,
}: Props) => {
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(
    getIssueListQueryOptions(projectId, { state, page, limit, origin })
  );

  const { items: issues, lastPage } = data;

  const handleIssueClick = (issue: IssueListItem) => {
    const params = origin ? `?origin=${encodeURIComponent(origin)}` : '';
    navigate(`/projects/${projectId}/issues/${issue.number}${params}`);
  };

  if (!issues) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-500">{emptyMessages[state]}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                #
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                Title
              </th>
              <th className="px-6 py-4 text-center text-sm font-medium text-gray-500">
                Author
              </th>
              <th className="px-6 py-4 text-center text-sm font-medium text-gray-500">
                Status
              </th>
              <th className="px-6 py-4 text-center text-sm font-medium text-gray-500">
                Created
              </th>
              <th className="px-6 py-4 text-center text-sm font-medium text-gray-500">
                Comments
              </th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr
                key={issue.number}
                className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50"
                onClick={() => handleIssueClick(issue)}
              >
                <td className="px-6 py-4 text-sm text-gray-500">
                  #{issue.number}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-medium text-gray-900">
                      {issue.title}
                    </span>
                    {issue.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {issue.labels.map((label) => (
                          <span
                            key={label.id}
                            className="rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: `#${label.color}20`,
                              color: `#${label.color}`,
                            }}
                          >
                            {label.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <img
                      src={issue.author.avatarUrl}
                      alt={issue.author.login}
                      className="h-6 w-6 rounded-full"
                    />
                    {issue.author.login}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={issue.state.toLowerCase()} />
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                  {formatDate(issue.createdAt)}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                    <MessageCircle className="h-4 w-4" />
                    {issue.totalCommentsCount}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        totalPages={lastPage}
        onPageChange={onPageChange}
      />
    </div>
  );
};

const emptyMessages: Record<IssueState, string> = {
  open: 'No open issues found.',
  closed: 'No closed issues found.',
};
