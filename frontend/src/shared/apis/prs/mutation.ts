import { mutationOptions } from '@tanstack/react-query';
import { apiPost } from '../client';
import type {
  CheckoutPRBranchBody,
  CheckoutPRBranchResult,
} from '@lgtmai/backend/types';

export const prsMutation = {
  checkout: () =>
    mutationOptions<
      CheckoutPRBranchResult,
      Error,
      { projectId: string; prNumber: number; body?: CheckoutPRBranchBody }
    >({
      mutationFn: ({ projectId, prNumber, body }) =>
        apiPost<CheckoutPRBranchResult, CheckoutPRBranchBody | undefined>(
          `/api/projects/${projectId}/prs/${prNumber}/checkout`,
          body
        ),
    }),
};
