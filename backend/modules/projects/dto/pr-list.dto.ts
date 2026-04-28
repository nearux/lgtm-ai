import { isString } from 'remeda';
import type { PRListItem } from '../types/pull-request.types.js';
import type { PrListQuery } from '../../../graphql/generated/graphql.js';

export type GraphQLPRNode = NonNullable<
  NonNullable<
    NonNullable<PrListQuery['repository']>['pullRequests']['nodes']
  >[number]
>;

export class PRListItemDto implements PRListItem {
  number: number;
  title: string;
  body: string;
  totalCommentsCount: number;
  assignees: PRListItem['assignees'];
  author: PRListItem['author'];
  createdAt: string;
  updatedAt: string;
  state: PRListItem['state'];

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
    return new PRListItemDto({
      number: node.number,
      title: node.title,
      body: isString(node.body) ? node.body : '',
      totalCommentsCount: node.totalCommentsCount ?? 0,
      assignees: (node.assignees?.nodes ?? []).map((u) => ({
        id: u?.id ?? u?.login ?? '',
        login: u?.login ?? '',
        name: u?.name ?? u?.login ?? '',
      })),
      author: {
        id:
          (node.author as { id?: string } | null)?.id ??
          node.author?.login ??
          '',
        login: node.author?.login ?? '',
        name:
          (node.author as { name?: string | null } | null)?.name ??
          node.author?.login ??
          '',
        avatarUrl: String(node.author?.avatarUrl ?? ''),
      },
      createdAt: String(node.createdAt),
      updatedAt: String(node.updatedAt),
      state: node.state,
    });
  }
}
