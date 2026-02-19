import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

export const PRListPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [prs] = useState<PR[]>(mockPRs);

  const handlePRClick = (pr: PR) => {
    navigate(`/projects/${projectId}/prs/${pr.number}`);
  };

  return (
    <div className="mx-auto max-w-6xl p-8">
      <header className="mb-8">
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <Link to="/" className="hover:text-indigo-500">
            Projects
          </Link>
          <span>/</span>
          <span className="text-gray-900">lgtm-ai</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Pull Requests</h1>
          <button className="rounded-lg bg-indigo-500 px-4 py-2 text-white transition-colors hover:bg-indigo-600">
            Review All Pending
          </button>
        </div>
      </header>

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
                Review
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {prs.map((pr) => (
              <tr
                key={pr.id}
                className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50"
                onClick={() => handlePRClick(pr)}
              >
                <td className="px-6 py-4 text-sm text-gray-500">
                  #{pr.number}
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-900">{pr.title}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{pr.author}</td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[pr.status]}`}
                  >
                    {pr.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${reviewStatusColors[pr.reviewStatus]}`}
                  >
                    {pr.reviewStatus}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {pr.createdAt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// TODO: Edit Type & type define location
interface PR {
  id: string;
  number: number;
  title: string;
  author: string;
  status: 'open' | 'merged' | 'closed';
  createdAt: string;
  reviewStatus: 'pending' | 'reviewed' | 'approved';
}

const mockPRs: PR[] = [
  {
    id: '1',
    number: 123,
    title: 'feat: Add user authentication',
    author: 'john-doe',
    status: 'open',
    createdAt: '2024-01-15',
    reviewStatus: 'pending',
  },
  {
    id: '2',
    number: 122,
    title: 'fix: Resolve memory leak in dashboard',
    author: 'jane-smith',
    status: 'open',
    createdAt: '2024-01-14',
    reviewStatus: 'reviewed',
  },
  {
    id: '3',
    number: 121,
    title: 'refactor: Improve API error handling',
    author: 'bob-wilson',
    status: 'merged',
    createdAt: '2024-01-13',
    reviewStatus: 'approved',
  },
];

const statusColors = {
  open: 'bg-green-100 text-green-800',
  merged: 'bg-purple-100 text-purple-800',
  closed: 'bg-red-100 text-red-800',
};

const reviewStatusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  reviewed: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
};
