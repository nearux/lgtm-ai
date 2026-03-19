import { MessageCircle } from 'lucide-react';
import { Button, GFMMarkdown } from '@/shared/components';
import { DiffHunk } from './DiffHunk/DiffHunk';
import { ValidationIcon, type ValidationStatus } from './ValidationIcon';

interface InlineComment {
  id: string;
  path: string;
  body: string;
  diffHunk?: string;
  author: { login: string; avatarUrl: string };
}

interface Props {
  comment: InlineComment;
  validationStatus?: ValidationStatus;
  onChat: () => void;
}

export const InlineCommentCard = ({
  comment,
  validationStatus,
  onChat,
}: Props) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white text-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
        <div className="flex items-center gap-2">
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
            {comment.path}
          </code>
          <img
            src={comment.author.avatarUrl}
            alt={comment.author.login}
            className="h-4 w-4 rounded-full"
          />
          <span className="text-xs text-gray-500">{comment.author.login}</span>
          {validationStatus && <ValidationIcon status={validationStatus} />}
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={onChat}
          disabled={validationStatus === 'validating'}
        >
          <MessageCircle className="mr-1 h-3.5 w-3.5" />
          Chat
        </Button>
      </div>
      {comment.diffHunk && (
        <DiffHunk diffHunk={comment.diffHunk} filePath={comment.path} />
      )}
      <div className="px-3 py-2">
        <GFMMarkdown className="prose-sm">{comment.body}</GFMMarkdown>
      </div>
    </div>
  );
};
