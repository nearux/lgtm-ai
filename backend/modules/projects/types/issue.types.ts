export type IssueState = 'open' | 'closed';

export interface IssueAuthor {
  id: string;
  login: string;
  name: string;
  avatarUrl: string;
  is_bot?: boolean;
}

export interface IssueAssignee {
  id: string;
  login: string;
  name: string;
}

export interface IssueLabel {
  id: string;
  name: string;
  color: string;
}

export interface IssueListItem {
  number: number;
  title: string;
  body: string;
  state: 'OPEN' | 'CLOSED';
  totalCommentsCount: number;
  assignees: IssueAssignee[];
  author: IssueAuthor;
  labels: IssueLabel[];
  createdAt: string;
  updatedAt: string;
}

export interface IssueComment {
  id: string;
  author: IssueAuthor;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssueMilestone {
  id: string;
  title: string;
}

export interface IssueDetail extends IssueListItem {
  closedAt: string | null;
  url: string;
  comments: IssueComment[];
  milestone: IssueMilestone | null;
}

export interface PaginatedIssueList {
  items: IssueListItem[];
  lastPage: number;
}
