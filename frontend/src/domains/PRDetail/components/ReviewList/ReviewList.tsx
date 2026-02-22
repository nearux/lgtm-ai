import Markdown from 'react-markdown';
import { formatDateTime } from '@/shared/utils';
import type { PRReview } from '@lgtmai/backend/types';

interface Props {
  reviews: PRReview[];
}

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

export const ReviewList = ({ reviews }: Props) => {
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        Reviews ({reviews.length})
      </h2>

      {reviews.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">No reviews yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className={`rounded-xl border p-4 ${reviewStateStyles[review.state as keyof typeof reviewStateStyles]?.bg || 'border-gray-200 bg-gray-50'}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded px-2 py-1 text-xs font-medium ${reviewStateStyles[review.state as keyof typeof reviewStateStyles]?.badge || 'bg-gray-100 text-gray-800'}`}
                  >
                    {review.state}
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    {review.author.login}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDateTime(review.submittedAt)}
                </span>
              </div>
              {review.body && (
                <div className="prose prose-gray max-w-none">
                  <Markdown>{review.body}</Markdown>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
