import { isString } from 'remeda';
import type { IssueListItem } from '../types/issue.types.js';
import type { IssueListQuery } from '../../../graphql/generated/graphql.js';

type GraphQLIssueNode = NonNullable<
  NonNullable<
    NonNullable<IssueListQuery['repository']>['issues']['nodes']
  >[number]
>;

export class IssueListItemDto implements IssueListItem {
  number: number;
  title: string;
  body: string;
  state: IssueListItem['state'];
  totalCommentsCount: number;
  assignees: IssueListItem['assignees'];
  author: IssueListItem['author'];
  labels: IssueListItem['labels'];
  createdAt: string;
  updatedAt: string;

  constructor(data: IssueListItem) {
    this.number = data.number;
    this.title = data.title;
    this.body = data.body;
    this.state = data.state;
    this.totalCommentsCount = data.totalCommentsCount;
    this.assignees = data.assignees;
    this.author = data.author;
    this.labels = data.labels;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static fromGraphQL(node: GraphQLIssueNode): IssueListItemDto {
    return new IssueListItemDto({
      number: node.number,
      title: node.title,
      body: isString(node.body) ? node.body : '',
      state: node.state,
      totalCommentsCount: node.comments?.totalCount ?? 0,
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
        is_bot: node.author?.__typename === 'Bot',
      },
      labels: (node.labels?.nodes ?? []).map((l) => ({
        id: l?.id ?? '',
        name: l?.name ?? '',
        color: l?.color ?? '',
      })),
      createdAt: String(node.createdAt),
      updatedAt: String(node.updatedAt),
    });
  }
}
