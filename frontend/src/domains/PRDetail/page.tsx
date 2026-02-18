import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';

export const PRDetailPage = () => {
  const { projectId, prNumber } = useParams();
  const [comments] = useState<ReviewComment[]>(mockComments);
  const [isReviewing, setIsReviewing] = useState(false);

  const handleStartReview = () => {
    setIsReviewing(true);
    setTimeout(() => setIsReviewing(false), 3000);
  };

  return (
    <div className="mx-auto max-w-6xl p-8">
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
            lgtm-ai
          </Link>
          <span>/</span>
          <span className="text-gray-900">PR #{prNumber}</span>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              feat: Add user authentication
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
                john-doe
              </span>
              <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                open
              </span>
              <span>Created Jan 15, 2024</span>
            </div>
          </div>

          <button
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

      <section>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Review Comments ({comments.length})
        </h2>

        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`rounded-xl border p-4 ${severityStyles[comment.severity].bg}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded px-2 py-1 text-xs font-medium ${severityStyles[comment.severity].badge}`}
                  >
                    {comment.severity}
                  </span>
                  <code className="rounded bg-white/50 px-2 py-1 text-sm">
                    {comment.file}:{comment.line}
                  </code>
                </div>
                <span className="text-xs text-gray-500">
                  {comment.createdAt}
                </span>
              </div>
              <p className="text-gray-700">{comment.content}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

// TODO: Edit Type & type define location
interface ReviewComment {
  id: string;
  file: string;
  line: number;
  content: string;
  severity: 'info' | 'warning' | 'error';
  createdAt: string;
}

const mockComments: ReviewComment[] = [
  {
    id: '1',
    file: 'src/auth/login.ts',
    line: 42,
    content:
      'Consider using bcrypt instead of md5 for password hashing. MD5 is not secure for password storage.',
    severity: 'error',
    createdAt: '2024-01-15 10:30',
  },
  {
    id: '2',
    file: 'src/auth/login.ts',
    line: 58,
    content:
      'This error message might expose sensitive information. Consider using a generic error message.',
    severity: 'warning',
    createdAt: '2024-01-15 10:31',
  },
  {
    id: '3',
    file: 'src/utils/helpers.ts',
    line: 15,
    content: 'Good use of TypeScript generics here!',
    severity: 'info',
    createdAt: '2024-01-15 10:32',
  },
];

const severityStyles = {
  info: {
    bg: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-800',
  },
  warning: {
    bg: 'bg-yellow-50 border-yellow-200',
    icon: 'text-yellow-500',
    badge: 'bg-yellow-100 text-yellow-800',
  },
  error: {
    bg: 'bg-red-50 border-red-200',
    icon: 'text-red-500',
    badge: 'bg-red-100 text-red-800',
  },
};
