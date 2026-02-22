import Markdown from 'react-markdown';
import { formatDateTime } from '@/shared/utils';
import type { PRComment } from '@lgtmai/backend/types';

interface Props {
  comments: PRComment[];
}

export const CommentList = ({ comments }: Props) => {
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        Comments ({comments.length})
      </h2>

      {comments.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">No comments yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {comment.author.login}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDateTime(comment.createdAt)}
                </span>
              </div>
              <div className="prose prose-gray max-w-none">
                <Markdown>{comment.body}</Markdown>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
