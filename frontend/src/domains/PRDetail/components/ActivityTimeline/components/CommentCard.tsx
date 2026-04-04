import { MessageCircle } from 'lucide-react';
import { formatDateTime } from '@/shared/utils';
import { Button, GFMMarkdown } from '@/shared/components';
import {
  ValidationIcon,
  type ValidationStatus,
} from '../../ReviewList/components';
import type { PRComment } from '@lgtmai/backend/types';

interface Props {
  comment: PRComment;
  validationStatus?: ValidationStatus;
  onChat: () => void;
}

export const CommentCard = ({ comment, validationStatus, onChat }: Props) => {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src={comment.author.avatarUrl}
            alt={comment.author.login}
            className="h-6 w-6 rounded-full"
          />
          <span className="text-sm font-medium text-gray-700">
            {comment.author.login}
          </span>
          {validationStatus && <ValidationIcon status={validationStatus} />}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {formatDateTime(comment.createdAt)}
          </span>
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
      </div>
      <GFMMarkdown>{comment.body}</GFMMarkdown>
    </div>
  );
};
