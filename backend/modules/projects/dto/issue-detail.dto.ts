import { isString } from 'remeda';
import type { IssueDetail } from '../types/issue.types.js';
import type { IssueDetailQuery } from '../../../graphql/generated/graphql.js';

type GraphQLIssueDetail = NonNullable<
  NonNullable<IssueDetailQuery['repository']>['issue']
>;

export class IssueDetailDto implements IssueDetail {
  number: number;
  title: string;
  body: string;
  state: string;
  totalCommentsCount: number;
  assignees: IssueDetail['assignees'];
  author: IssueDetail['author'];
  labels: IssueDetail['labels'];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  url: string;
  comments: IssueDetail['comments'];
  milestone: IssueDetail['milestone'];

  constructor(data: IssueDetail) {
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
    this.closedAt = data.closedAt;
    this.url = data.url;
    this.comments = data.comments;
    this.milestone = data.milestone;
  }

  static fromGraphQL(issue: GraphQLIssueDetail): IssueDetailDto {
    const commentNodes = issue.comments?.nodes ?? [];

    return new IssueDetailDto({
      number: issue.number,
      title: issue.title,
      body: isString(issue.body) ? issue.body : '',
      state: issue.state,
      totalCommentsCount:
        (issue.comments?.totalCount as number | undefined) ??
        commentNodes.length,
      assignees: (issue.assignees?.nodes ?? []).map((u) => ({
        id: u?.id ?? u?.login ?? '',
        login: u?.login ?? '',
        name: u?.name ?? u?.login ?? '',
      })),
      author: {
        id:
          (issue.author as { id?: string } | null)?.id ??
          issue.author?.login ??
          '',
        login: issue.author?.login ?? '',
        name:
          (issue.author as { name?: string | null } | null)?.name ??
          issue.author?.login ??
          '',
        avatarUrl: String(issue.author?.avatarUrl ?? ''),
        is_bot: issue.author?.__typename === 'Bot',
      },
      labels: (issue.labels?.nodes ?? []).map((l) => ({
        id: l?.id ?? '',
        name: l?.name ?? '',
        color: l?.color ?? '',
      })),
      createdAt: String(issue.createdAt),
      updatedAt: String(issue.updatedAt),
      closedAt: issue.closedAt != null ? String(issue.closedAt) : null,
      url: String(issue.url),
      comments: commentNodes.map((c) => ({
        id: c?.id ?? '',
        author: {
          id:
            (c?.author as { id?: string } | null)?.id ?? c?.author?.login ?? '',
          login: c?.author?.login ?? '',
          name:
            (c?.author as { name?: string | null } | null)?.name ??
            c?.author?.login ??
            '',
          avatarUrl: String(c?.author?.avatarUrl ?? ''),
          is_bot: c?.author?.__typename === 'Bot',
        },
        body: c?.body ?? '',
        createdAt: String(c?.createdAt ?? ''),
        updatedAt: String(c?.updatedAt ?? ''),
      })),
      milestone: issue.milestone
        ? { id: issue.milestone.id, title: issue.milestone.title }
        : null,
    });
  }
}
