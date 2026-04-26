import { isString } from 'remeda';
import type { PRDetail, PRReview } from '../../../types/pullRequests.js';
import type { PrDetailQuery } from '../../../graphql/generated/graphql.js';
import { countNonEmptyReviewBodies } from './comment-counts.js';

type GraphQLPRDetail = NonNullable<
  NonNullable<PrDetailQuery['repository']>['pullRequest']
>;
type GraphQLReview = NonNullable<
  NonNullable<GraphQLPRDetail['reviews']>['nodes']
>[number];
type GraphQLActor = NonNullable<GraphQLPRDetail['author']>;

export class PRDetailDto implements PRDetail {
  number: number;
  title: string;
  body: string;
  totalCommentsCount: number;
  baseBranch: string;
  headBranch: string;
  assignees: PRDetail['assignees'];
  author: PRDetail['author'];
  createdAt: string;
  updatedAt: string;
  state: string;
  comments: PRDetail['comments'];
  reviews: PRDetail['reviews'];
  commits: PRDetail['commits'];

  constructor(data: PRDetail) {
    this.number = data.number;
    this.title = data.title;
    this.body = data.body;
    this.totalCommentsCount = data.totalCommentsCount;
    this.baseBranch = data.baseBranch;
    this.headBranch = data.headBranch;
    this.assignees = data.assignees;
    this.author = data.author;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.state = data.state;
    this.comments = data.comments;
    this.reviews = data.reviews;
    this.commits = data.commits;
  }

  static fromGraphQL(pr: GraphQLPRDetail): PRDetailDto {
    const reviewNodes = pr.reviews?.nodes ?? [];
    const inlineCount = reviewNodes.reduce(
      (sum, r) => sum + (r?.comments.nodes?.length ?? 0),
      0
    );
    const reviewBodyCount = countNonEmptyReviewBodies(
      reviewNodes.map((r) => ({ body: r?.body }))
    );
    const commentNodes = pr.comments.nodes ?? [];
    const totalCommentsCount =
      commentNodes.length + inlineCount + reviewBodyCount;

    return new PRDetailDto({
      number: pr.number,
      title: pr.title,
      body: isString(pr.body) ? pr.body : '',
      totalCommentsCount,
      baseBranch: pr.baseRefName,
      headBranch: pr.headRefName,
      assignees: (pr.assignees.nodes ?? []).map((a) => ({
        id: a?.id ?? a?.login ?? '',
        login: a?.login ?? '',
        name: a?.name ?? a?.login ?? '',
      })),
      author: toAuthor(pr.author),
      createdAt: String(pr.createdAt),
      updatedAt: String(pr.updatedAt),
      state: pr.state,
      comments: commentNodes.map((c) => ({
        id: c?.id ?? '',
        author: toAuthor(c?.author),
        body: c?.body ?? '',
        createdAt: String(c?.createdAt ?? ''),
        updatedAt: String(c?.updatedAt ?? ''),
      })),
      reviews: reviewNodes.map(toReview),
      commits: (pr.commits.nodes ?? []).flatMap((n) => {
        if (!n?.commit) return [];
        const {
          oid,
          messageHeadline,
          messageBody,
          authoredDate,
          committedDate,
          authors,
        } = n.commit;
        return [
          {
            oid,
            messageHeadline,
            messageBody,
            authoredDate,
            committedDate,
            authors: (authors.nodes ?? []).map((a) => ({
              name: a?.name ?? '',
              email: a?.email ?? '',
            })),
          },
        ];
      }),
    });
  }
}

function toAuthor(actor: GraphQLActor | null | undefined): PRDetail['author'] {
  const id = (actor as { id?: string } | null)?.id ?? actor?.login ?? '';
  const name =
    (actor as { name?: string | null } | null)?.name ?? actor?.login ?? '';
  return {
    id,
    login: actor?.login ?? '',
    name,
    avatarUrl: String(actor?.avatarUrl ?? ''),
    ...(actor?.__typename === 'Bot' ? { is_bot: true } : {}),
  };
}

function toReview(r: GraphQLReview | null | undefined): PRReview {
  const inlineCommentNodes = r?.comments.nodes ?? [];
  return {
    id: r?.id ?? '',
    author: toAuthor(r?.author),
    state: r?.state ?? '',
    body: r?.body ?? '',
    submittedAt: String(r?.submittedAt ?? ''),
    inlineComments: inlineCommentNodes.map((c) => ({
      id: c?.id ?? '',
      ...(c?.replyTo?.id != null ? { inReplyToId: c.replyTo.id } : {}),
      author: toAuthor(c?.author),
      body: c?.body ?? '',
      path: c?.path ?? '',
      diffHunk: c?.diffHunk ?? '',
      createdAt: String(c?.createdAt ?? ''),
      updatedAt: String(c?.updatedAt ?? ''),
    })),
  };
}
