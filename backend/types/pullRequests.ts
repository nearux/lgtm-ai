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

export interface PRReview {
  id: string;
  author: PRAuthor;
  state: string;
  body: string;
  submittedAt: string;
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
