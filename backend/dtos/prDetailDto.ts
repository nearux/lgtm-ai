import { isString } from 'remeda';
import type {
  PRDetail,
  PRReview,
  GhPRDetail,
  GhReviewInlineComment,
} from '../types/pullRequests.js';
import { GhAuthorDto } from './ghAuthorDto.js';
import { GhInlineCommentDto } from './ghInlineCommentDto.js';

export class PRDetailDto implements PRDetail {
  number: number;
  title: string;
  body: string;
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
      assignees: raw.assignees.map((a) => ({
        id: a.id ?? a.login,
        login: a.login,
        name: a.name ?? a.login,
      })),
      author: GhAuthorDto.fromGh(raw.author),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      state: raw.state,
      comments: raw.comments.map((c) => ({
        id: c.id,
        author: GhAuthorDto.fromGh(c.author),
        body: c.body,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      reviews: raw.reviews.map(
        (r): PRReview => ({
          id: r.id,
          author: GhAuthorDto.fromGh(r.author),
          state: r.state,
          body: r.body,
          submittedAt: r.submittedAt,
          inlineComments: (inlineCommentsByReview.get(r.id) ?? []).map(
            GhInlineCommentDto.fromGh
          ),
        })
      ),
      commits: raw.commits,
    });
  }
}
