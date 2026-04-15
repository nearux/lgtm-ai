import { sumBy } from 'remeda';

/**
 * Counts reviews whose body (after trimming whitespace) is non-empty.
 * Used to compute the "review body" portion of a PR's total comment count,
 * matching GitHub's UI behavior where whitespace-only/absent bodies are not shown as a comment.
 */
export function countNonEmptyReviewBodies(
  reviews: ReadonlyArray<{ body?: string | null }>
): number {
  return reviews.filter((r) => (r.body ?? '').trim().length > 0).length;
}

/**
 * Sums the totalCount of inline comments across all review threads.
 */
export function sumThreadInlineComments(
  threads: ReadonlyArray<{ comments: { totalCount: number } }>
): number {
  return sumBy(threads, (t) => t.comments.totalCount);
}
