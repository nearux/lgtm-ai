import { MessageCircle } from 'lucide-react';
import { formatDateTime } from '@/shared/utils';
import { Button, GFMMarkdown } from '@/shared/components';
import { ValidationIcon, type ValidationStatus } from './ValidationIcon';
import { InlineCommentCard } from './InlineCommentCard';

const reviewStateStyles = {
  APPROVED: {
    bg: 'bg-green-50 border-green-200',
    badge: 'bg-green-100 text-green-800',
  },
  CHANGES_REQUESTED: {
    bg: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-800',
  },
  COMMENTED: {
    bg: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-800',
  },
  PENDING: {
    bg: 'bg-yellow-50 border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-800',
  },
  DISMISSED: {
    bg: 'bg-gray-50 border-gray-200',
    badge: 'bg-gray-100 text-gray-800',
  },
};

interface InlineComment {
  id: string;
  path: string;
  body: string;
  diffHunk?: string;
  author: { login: string; avatarUrl: string };
}

interface Review {
  id: string;
  state: string;
  body: string;
  submittedAt: string;
  author: { login: string; avatarUrl: string };
  inlineComments: InlineComment[];
}

interface ValidationState {
  status: ValidationStatus;
  result?: string;
}

interface Props {
  review: Review;
  validations: Record<string, ValidationState>;
  onChatReview: () => void;
  onChatComment: (comment: InlineComment) => void;
}

export const ReviewCard = ({
  review,
  validations,
  onChatReview,
  onChatComment,
}: Props) => {
  const reviewValidation = validations[review.id];
  const styles =
    reviewStateStyles[review.state as keyof typeof reviewStateStyles];

  return (
    <div
      className={`rounded-xl border p-4 ${styles?.bg || 'border-gray-200 bg-gray-50'}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`rounded px-2 py-1 text-xs font-medium ${styles?.badge || 'bg-gray-100 text-gray-800'}`}
          >
            {review.state}
          </span>
          <img
            src={review.author.avatarUrl}
            alt={review.author.login}
            className="h-6 w-6 rounded-full"
          />
          <span className="text-sm font-medium text-gray-700">
            {review.author.login}
          </span>
          {reviewValidation && (
            <ValidationIcon status={reviewValidation.status} />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {formatDateTime(review.submittedAt)}
          </span>
          {review.body && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onChatReview}
              disabled={reviewValidation?.status === 'validating'}
            >
              <MessageCircle className="mr-1 h-3.5 w-3.5" />
              Chat
            </Button>
          )}
        </div>
      </div>

      {review.body && <GFMMarkdown>{review.body}</GFMMarkdown>}

      {review.inlineComments.length > 0 && (
        <div className="mt-3 space-y-2">
          {review.inlineComments.map((comment) => (
            <InlineCommentCard
              key={comment.id}
              comment={comment}
              validationStatus={validations[comment.id]?.status}
              onChat={() => onChatComment(comment)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
