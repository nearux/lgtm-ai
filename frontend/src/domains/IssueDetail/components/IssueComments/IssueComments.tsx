import { BotBadge, GFMMarkdown } from '@/shared/components';
import { formatRelativeDate, linkifyGitHubReferences } from '@/shared/utils';
import type { IssueComment } from '@lgtmai/backend/types';

interface Props {
  comments: IssueComment[];
  githubBaseUrl: string | null;
}

export const IssueComments = ({ comments, githubBaseUrl }: Props) => {
  if (comments.length === 0) {
    return (
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Comments</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">No comments yet.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        Comments ({comments.length})
      </h2>
      <div className="space-y-4">
        {comments.map((comment) => (
          <article
            key={comment.id}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <header className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src={comment.author.avatarUrl}
                  alt={comment.author.login}
                  className="h-6 w-6 rounded-full"
                />
                <span className="text-sm font-medium text-gray-700">
                  {comment.author.login}
                </span>
                {comment.author.is_bot && <BotBadge />}
              </div>
              <span
                className="text-xs text-gray-500"
                title={
                  comment.updatedAt !== comment.createdAt
                    ? `edited ${formatRelativeDate(comment.updatedAt)}`
                    : undefined
                }
              >
                {formatRelativeDate(comment.createdAt)}
                {comment.updatedAt !== comment.createdAt && ' (edited)'}
              </span>
            </header>
            <GFMMarkdown>
              {linkifyGitHubReferences(comment.body, githubBaseUrl)}
            </GFMMarkdown>
          </article>
        ))}
      </div>
    </section>
  );
};
