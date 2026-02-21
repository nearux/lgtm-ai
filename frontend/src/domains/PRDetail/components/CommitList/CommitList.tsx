import { formatDate } from '@/shared/utils';
import type { PRCommit } from '@lgtmai/backend/types';

interface Props {
  commits: PRCommit[];
}

export const CommitList = ({ commits }: Props) => {
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        Commits ({commits.length})
      </h2>

      {commits.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">No commits.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {commits.map((commit, index) => (
            <div
              key={commit.oid}
              className={`flex items-center gap-4 p-4 ${index !== commits.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <code className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                {commit.oid.slice(0, 7)}
              </code>
              <span className="flex-1 text-gray-900">
                {commit.messageHeadline}
              </span>
              <span className="text-xs text-gray-500">
                {formatDate(commit.committedDate)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
