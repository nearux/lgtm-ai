import { formatDate } from '@/shared/utils';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import type { PRListItem } from '@lgtmai/backend/types';
import { useSuspenseQuery } from '@tanstack/react-query';
import { prsQuery } from '@/shared/apis';
import { useNavigate } from 'react-router-dom';

interface Props {
  projectId: string;
}

export const PRTable = ({ projectId }: Props) => {
  const navigate = useNavigate();
  const { data: prs } = useSuspenseQuery(prsQuery.list(projectId));

  const handlePRClick = (pr: PRListItem) => {
    navigate(`/projects/${projectId}/prs/${pr.number}`);
  };

  if (prs.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-500">No open pull requests found.</p>
      </div>
    );
  }

  return (
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
            <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
              Author
            </th>
            <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
              Status
            </th>
            <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
              Created
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
              <td className="px-6 py-4 text-sm text-gray-500">#{pr.number}</td>
              <td className="px-6 py-4">
                <span className="font-medium text-gray-900">{pr.title}</span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {pr.author.login}
              </td>
              <td className="px-6 py-4">
                <StatusBadge status={pr.state} />
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {formatDate(pr.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
