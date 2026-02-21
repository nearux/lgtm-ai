import { isString } from 'remeda';
import type { PRListItem, GitHubPullRequest } from '../types/pullRequests.js';

export class PRListItemDto implements PRListItem {
  number: number;
  title: string;
  body: string;
  assignees: PRListItem['assignees'];
  author: PRListItem['author'];
  createdAt: string;
  updatedAt: string;
  state: string;

  constructor(data: PRListItem) {
    this.number = data.number;
    this.title = data.title;
    this.body = data.body;
    this.assignees = data.assignees;
    this.author = data.author;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.state = data.state;
  }

  static fromGitHub(pr: GitHubPullRequest): PRListItemDto {
    const authorIsBot = pr.user.type?.toLowerCase() === 'bot';

    return new PRListItemDto({
      number: pr.number,
      title: pr.title,
      body: isString(pr.body) ? pr.body : '',
      assignees: pr.assignees.map((user) => ({
        id: String(user.id),
        login: user.login,
        name: user.name ?? user.login,
      })),
      author: {
        id: String(pr.user.id),
        login: pr.user.login,
        name: pr.user.name ?? pr.user.login,
        ...(authorIsBot ? { is_bot: true } : {}),
      },
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      state: pr.state,
    });
  }
}
