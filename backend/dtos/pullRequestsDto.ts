import { isString, sumBy } from 'remeda';
import type { PRListItem, GraphQLPRNode } from '../types/pullRequests.js';

export class PRListItemDto implements PRListItem {
  number: number;
  title: string;
  body: string;
  totalCommentsCount: number;
  assignees: PRListItem['assignees'];
  author: PRListItem['author'];
  createdAt: string;
  updatedAt: string;
  state: string;

  constructor(data: PRListItem) {
    this.number = data.number;
    this.title = data.title;
    this.body = data.body;
    this.totalCommentsCount = data.totalCommentsCount;
    this.assignees = data.assignees;
    this.author = data.author;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.state = data.state;
  }

  static fromGraphQL(node: GraphQLPRNode): PRListItemDto {
    const inlineCount = sumBy(
      node.reviewThreads.nodes,
      (t) => t.comments.totalCount
    );
    const reviewBodyCount = node.reviews.nodes.filter(
      (r) => r.body.trim().length > 0
    ).length;
    const totalCommentsCount =
      node.comments.totalCount + inlineCount + reviewBodyCount;

    return new PRListItemDto({
      number: node.number,
      title: node.title,
      body: isString(node.body) ? node.body : '',
      totalCommentsCount,
      assignees: node.assignees.nodes.map((u) => ({
        id: u.id,
        login: u.login,
        name: u.name ?? u.login,
      })),
      author: {
        id: node.author.id ?? node.author.login,
        login: node.author.login,
        name: node.author.name ?? node.author.login,
        avatarUrl: node.author.avatarUrl,
      },
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
      state: node.state,
    });
  }
}
