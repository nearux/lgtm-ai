import { useState } from 'react';
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
  const [isReviewing, setIsReviewing] = useState(false);

  const handleStartReview = () => {
    setIsReviewing(true);
    setTimeout(() => setIsReviewing(false), 3000);
  };

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

        <button
          type="button"
          onClick={handleStartReview}
          disabled={isReviewing}
          className="flex items-center gap-2 rounded-lg bg-indigo-500 px-6 py-3 text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isReviewing ? (
            <>
              <svg
                className="h-5 w-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Reviewing...
            </>
          ) : (
            <>
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              Start AI Review
            </>
          )}
        </button>
      </div>
    </header>
  );
};
