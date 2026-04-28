export type PRState = 'open' | 'closed' | 'all';

export interface PRAuthor {
  id: string;
  login: string;
  name: string;
  avatarUrl: string;
  is_bot?: boolean;
}

export interface PRAssignee {
  id: string;
  login: string;
  name: string;
}

export interface PRListItem {
  number: number;
  title: string;
  body: string;
  /**
   * Total comment count shown in GitHub's PR UI:
   * issue comments + review inline comments + non-empty review bodies.
   */
  totalCommentsCount: number;
  assignees: PRAssignee[];
  author: PRAuthor;
  createdAt: string;
  updatedAt: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
}

export interface PRComment {
  id: string;
  author: PRAuthor;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface PRReviewInlineComment {
  id: string;
  inReplyToId?: string;
  author: PRAuthor;
  body: string;
  path: string;
  diffHunk: string;
  createdAt: string;
  updatedAt: string;
}

export interface PRReview {
  id: string;
  author: PRAuthor;
  state: string;
  body: string;
  submittedAt: string;
  inlineComments: PRReviewInlineComment[];
}

export interface PRCommitAuthor {
  name: string;
  email: string;
}

export interface PRCommit {
  oid: string;
  messageHeadline: string;
  messageBody: string;
  authoredDate: string;
  committedDate: string;
  authors: PRCommitAuthor[];
}

export interface PRDetail extends PRListItem {
  baseBranch: string;
  headBranch: string;
  comments: PRComment[];
  reviews: PRReview[];
  commits: PRCommit[];
}

export interface PaginatedPRList {
  items: PRListItem[];
  lastPage: number;
}

export interface CheckoutPRBranchBody {
  force?: boolean;
  origin?: string;
}

export interface CheckoutPRBranchResult {
  success: boolean;
  message: string;
  targetBranch: string;
  stashed: boolean;
}

export interface CheckoutDefaultBranchBody {
  force?: boolean;
  origin?: string;
}

export interface CheckoutDefaultBranchResult {
  success: boolean;
  targetBranch: string;
  stashed: boolean;
}
