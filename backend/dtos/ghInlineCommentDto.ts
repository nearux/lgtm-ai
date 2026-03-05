import type { PRReview, GhReviewInlineComment } from '../types/pullRequests.js';

export class GhInlineCommentDto {
  static fromGh(c: GhReviewInlineComment): PRReview['inlineComments'][number] {
    return {
      id: String(c.id),
      author: {
        id: String(c.user.id),
        login: c.user.login,
        name: c.user.login,
        ...(c.user.type?.toLowerCase() === 'bot' ? { is_bot: true } : {}),
      },
      body: c.body,
      path: c.path,
      diffHunk: c.diff_hunk,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    };
  }
}
