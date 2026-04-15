import { useState, useCallback } from 'react';
import type { ApprovalRequest } from './types';

export function useWebSocketApprovals(send: (message: unknown) => void) {
  const [pendingApproval, setPendingApproval] =
    useState<ApprovalRequest | null>(null);

  const setApproval = useCallback((approval: ApprovalRequest) => {
    setPendingApproval(approval);
  }, []);

  const respondToApproval = useCallback(
    (
      requestId: string,
      approvalRequestId: string,
      behavior: 'allow' | 'deny',
      message?: string
    ) => {
      send({
        type: 'approval_response',
        requestId,
        approvalRequestId,
        behavior,
        message,
      });
      setPendingApproval(null);
    },
    [send]
  );

  const respondToPlanApproval = useCallback(
    (
      requestId: string,
      approvalRequestId: string,
      behavior: 'allow' | 'deny',
      message?: string
    ) => {
      send({
        type: 'plan_approval_response',
        requestId,
        approvalRequestId,
        behavior,
        message,
      });
      setPendingApproval(null);
    },
    [send]
  );

  return {
    pendingApproval,
    setApproval,
    respondToApproval,
    respondToPlanApproval,
  };
}
