import { formatDate } from '@/shared/utils';
import { Pagination } from '@/shared/components';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import type { PRListItem, PRState } from '@lgtmai/backend/types';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getPrListQueryOptions } from '@/queries';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@/shared/components';
import { MessageCircle } from 'lucide-react';

interface Props {
  projectId: string;
  origin: string;
  state: PRState;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export const PRTable = ({
  projectId,
  origin,
  state,
  page,
  limit,
  onPageChange,
}: Props) => {
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(
    getPrListQueryOptions(projectId, { state, page, limit, origin })
  );

  const { items: prs, lastPage } = data;

  const handlePRClick = (pr: PRListItem) => {
    const params = origin ? `?origin=${encodeURIComponent(origin)}` : '';
    navigate(`/projects/${projectId}/prs/${pr.number}${params}`);
  };

  if (!prs) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (prs.length === 0) {
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
            {prs.map((pr) => (
              <tr
                key={pr.number}
                className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50"
                onClick={() => handlePRClick(pr)}
              >
                <td className="px-6 py-4 text-sm text-gray-500">
                  #{pr.number}
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-900">{pr.title}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <img
                      src={pr.author.avatarUrl}
                      alt={pr.author.login}
                      className="h-6 w-6 rounded-full"
                    />
                    {pr.author.login}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={pr.state} />
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                  {formatDate(pr.createdAt)}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                    <MessageCircle className="h-4 w-4" />
                    {pr.totalCommentsCount}
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

const emptyMessages: Record<PRState, string> = {
  open: 'No open pull requests found.',
  closed: 'No closed pull requests found.',
  all: 'No pull requests found.',
};
