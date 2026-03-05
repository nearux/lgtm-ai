import type { PRDetail, GhPRAuthor } from '../types/pullRequests.js';

export class GhAuthorDto {
  static fromGh(author: GhPRAuthor): PRDetail['author'] {
    return {
      id: author.id ?? author.login,
      login: author.login,
      name: author.name ?? author.login,
      ...(author.is_bot ? { is_bot: true } : {}),
    };
  }
}
