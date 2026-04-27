import { useSearchParams } from 'react-router-dom';
import type { IssueState } from '@lgtmai/backend/types';

export const ISSUE_LIST_LIMIT = 20;

const VALID_STATES: IssueState[] = ['open', 'closed'];

function isValidState(state: string | null): state is IssueState {
  return state !== null && VALID_STATES.includes(state as IssueState);
}

export function useIssueListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const stateParam = searchParams.get('state');
  const pageParam = searchParams.get('page');

  const state: IssueState = isValidState(stateParam) ? stateParam : 'open';
  const page = Math.max(1, Number(pageParam) || 1);

  const setState = (newState: IssueState) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (newState === 'open') {
        params.delete('state');
      } else {
        params.set('state', newState);
      }
      params.delete('page');
      return params;
    });
  };

  const setPage = (newPage: number) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (newPage === 1) {
        params.delete('page');
      } else {
        params.set('page', String(newPage));
      }
      return params;
    });
  };

  return {
    state,
    page,
    limit: ISSUE_LIST_LIMIT,
    setState,
    setPage,
  };
}
