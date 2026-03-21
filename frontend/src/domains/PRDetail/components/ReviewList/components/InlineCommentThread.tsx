import { MessageCircle } from 'lucide-react';
import { Button, GFMMarkdown } from '@/shared/components';
import { formatDateTime } from '@/shared/utils';
import { DiffHunk } from './DiffHunk/DiffHunk';
import { ValidationIcon, type ValidationStatus } from './ValidationIcon';
import type { InlineThread } from '../../ActivityTimeline/ActivityTimeline';
import type { InlineComment } from './ReviewCard';

interface ValidationState {
  status: ValidationStatus;
  result?: string;
}

interface Props {
  threads: InlineThread[];
  validations: Record<string, ValidationState>;
  onChat: (comment: InlineComment) => void;
}

export const InlineCommentThread = ({
  threads,
  validations,
  onChat,
}: Props) => {
  return (
    <div className="mt-3 space-y-3">
      {threads.map((thread) => (
        <div
          key={thread.root.id}
          className="overflow-hidden rounded-lg border border-gray-200 bg-white text-sm"
        >
          {/* File path header */}
          <div className="border-b border-gray-100 bg-gray-50 px-3 py-1.5">
            <code className="text-xs text-gray-600">{thread.root.path}</code>
          </div>

          {/* Diff hunk shown once at the top */}
          {thread.root.diffHunk && (
            <DiffHunk
              diffHunk={thread.root.diffHunk}
              filePath={thread.root.path}
            />
          )}

          {/* Root comment + replies */}
          {[thread.root, ...thread.replies].map((comment, idx) => {
            const isReply = idx > 0;
            const validation = validations[comment.id];

            return (
              <div
                key={comment.id}
                className={`flex gap-2 px-3 py-2 ${isReply ? 'border-t border-gray-100 pl-8' : ''}`}
              >
                <img
                  src={comment.author.avatarUrl}
                  alt={comment.author.login}
                  className="mt-0.5 h-6 w-6 shrink-0 rounded-full"
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-700">
                        {comment.author.login}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDateTime(comment.createdAt)}
                      </span>
                      {validation && (
                        <ValidationIcon status={validation.status} />
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onChat(comment)}
                      disabled={validation?.status === 'validating'}
                    >
                      <MessageCircle className="mr-1 h-3 w-3" />
                      Chat
                    </Button>
                  </div>
                  <GFMMarkdown className="prose-sm">{comment.body}</GFMMarkdown>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
