import { isString, map, sumBy } from 'remeda';
import type {
  PRDetail,
  PRReview,
  GhPRDetail,
  GhPRAssignee,
  GhPRComment,
  GhPRReview,
  GhReviewInlineComment,
} from '../types/pullRequests.js';
import { GhAuthorDto } from './ghAuthorDto.js';
import { GhInlineCommentDto } from './ghInlineCommentDto.js';

function toAssignee(a: GhPRAssignee): PRDetail['assignees'][number] {
  return {
    id: a.id ?? a.login,
    login: a.login,
    name: a.name ?? a.login,
  };
}

function toComment(c: GhPRComment): PRDetail['comments'][number] {
  return {
    id: c.id,
    author: GhAuthorDto.fromGh(c.author),
    body: c.body,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function toReview(
  inlineCommentsByReview: Map<string, GhReviewInlineComment[]>
): (r: GhPRReview) => PRReview {
  return (r) => ({
    id: r.id,
    author: GhAuthorDto.fromGh(r.author),
    state: r.state,
    body: r.body,
    submittedAt: r.submittedAt,
    inlineComments: map(
      inlineCommentsByReview.get(r.id) ?? [],
      GhInlineCommentDto.fromGh
    ),
  });
}

export class PRDetailDto implements PRDetail {
  number: number;
  title: string;
  body: string;
  commentsCount: number;
  reviewCommentsCount: number;
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
    this.commentsCount = data.commentsCount;
    this.reviewCommentsCount = data.reviewCommentsCount;
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

  static fromGh(
    raw: GhPRDetail,
    inlineCommentsByReview: Map<string, GhReviewInlineComment[]>
  ): PRDetailDto {
    return new PRDetailDto({
      number: raw.number,
      title: raw.title,
      body: isString(raw.body) ? raw.body : '',
      commentsCount: raw.comments.length,
      reviewCommentsCount: sumBy(
        raw.reviews,
        (r) => inlineCommentsByReview.get(r.id)?.length ?? 0
      ),
      baseBranch: raw.baseRefName,
      headBranch: raw.headRefName,
      assignees: map(raw.assignees, toAssignee),
      author: GhAuthorDto.fromGh(raw.author),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      state: raw.state,
      comments: map(raw.comments, toComment),
      reviews: map(raw.reviews, toReview(inlineCommentsByReview)),
      commits: raw.commits,
    });
  }
}
