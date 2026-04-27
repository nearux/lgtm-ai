import { queryOptions } from '@tanstack/react-query';
import { getIssueList, getIssueDetail } from '../apis';
import type { IssueState } from '@lgtmai/backend/types';

export const getIssueListQueryOptions = (
  projectId: string,
  params?: { state: IssueState; page: number; limit: number; origin?: string }
) =>
  queryOptions({
    queryKey: ['issues', 'list', projectId, params ?? {}],
    queryFn: () => getIssueList(projectId, params),
  });

export const getIssueDetailQueryOptions = (
  projectId: string,
  issueNumber: number,
  origin?: string
) =>
  queryOptions({
    queryKey: [
      'issues',
      'detail',
      projectId,
      issueNumber,
      ...(origin ? [origin] : []),
    ],
    queryFn: () => getIssueDetail(projectId, issueNumber, origin),
  });
