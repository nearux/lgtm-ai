import type { PRDetail, GhPRAuthor } from '../../../types/pullRequests.js';

export class GhAuthorDto {
  static fromGh(author: GhPRAuthor): PRDetail['author'] {
    const numericId = author.id && !isNaN(Number(author.id)) ? author.id : null;
    return {
      id: author.id ?? author.login,
      login: author.login,
      name: author.name ?? author.login,
      avatarUrl: numericId
        ? `https://avatars.githubusercontent.com/u/${numericId}`
        : `https://avatars.githubusercontent.com/${author.login}`,
      ...(author.is_bot ? { is_bot: true } : {}),
    };
  }
}
