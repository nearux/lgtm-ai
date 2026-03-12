export type GitHubUser = {
  id: number;
  login: string;
  name?: string | null;
  type?: string | null;
};

export type GitHubPullRequest = {
  number: number;
  title: string;
  body?: string | null;
  assignees: GitHubUser[];
  user: GitHubUser;
  created_at: string;
  updated_at: string;
  state: string;
};

export type PRState = 'open' | 'closed' | 'all';

export type GhPRAuthor = {
  id?: string | null;
  login: string;
  name?: string | null;
  is_bot?: boolean | null;
};

export type GhPRAssignee = {
  id?: string | null;
  login: string;
  name?: string | null;
};

export type GhPRComment = {
  id: string;
  author: GhPRAuthor;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type GhPRReview = {
  id: string;
  author: GhPRAuthor;
  state: string;
  body: string;
  submittedAt: string;
};

export type GhPRCommitAuthor = {
  name: string;
  email: string;
};

export type GhPRCommit = {
  oid: string;
  messageHeadline: string;
  messageBody: string;
  authoredDate: string;
  committedDate: string;
  authors: GhPRCommitAuthor[];
};

export type GhReviewInlineComment = {
  id: number;
  node_id: string;
  user: {
    login: string;
    id: number;
    node_id: string;
    type: string;
  };
  body: string;
  path: string;
  diff_hunk: string;
  created_at: string;
  updated_at: string;
};

export type GhPRDetail = {
  number: number;
  title: string;
  body?: string | null;
  assignees: GhPRAssignee[];
  author: GhPRAuthor;
  createdAt: string;
  updatedAt: string;
  state: string;
  comments: GhPRComment[];
  reviews: GhPRReview[];
  commits: GhPRCommit[];
};

export interface PRAuthor {
  id: string;
  login: string;
  name: string;
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
  assignees: PRAssignee[];
  author: PRAuthor;
  createdAt: string;
  updatedAt: string;
  state: string;
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
  comments: PRComment[];
  reviews: PRReview[];
  commits: PRCommit[];
}

export interface CheckoutPRBranchBody {
  force?: boolean;
}

export interface CheckoutPRBranchResult {
  success: boolean;
  message: string;
  targetBranch: string;
  stashed: boolean;
}
