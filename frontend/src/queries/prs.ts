import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getPrList, getPrDetail, postCheckoutPr } from '../apis';
import type { PRState, CheckoutPRBranchBody } from '@lgtmai/backend/types';

export const getPrListQueryOptions = (
  projectId: string,
  params?: { state: PRState; page: number; limit: number; origin?: string }
) =>
  queryOptions({
    queryKey: ['prs', 'list', projectId, params ?? {}],
    queryFn: () => getPrList(projectId, params),
  });

export const getPrDetailQueryOptions = (
  projectId: string,
  prNumber: number,
  origin?: string
) =>
  queryOptions({
    queryKey: [
      'prs',
      'detail',
      projectId,
      prNumber,
      ...(origin ? [origin] : []),
    ],
    queryFn: () => getPrDetail(projectId, prNumber, origin),
  });

export const postCheckoutPrMutationOptions = () =>
  mutationOptions({
    mutationFn: ({
      projectId,
      prNumber,
      body,
    }: {
      projectId: string;
      prNumber: number;
      body?: CheckoutPRBranchBody;
    }) => postCheckoutPr(projectId, prNumber, body),
  });
