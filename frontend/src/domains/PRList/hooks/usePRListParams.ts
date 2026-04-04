import { useSearchParams } from 'react-router-dom';
import type { PRState } from '@lgtmai/backend/types';

export const PR_LIST_LIMIT = 20;

const VALID_STATES: PRState[] = ['open', 'closed', 'all'];

function isValidState(state: string | null): state is PRState {
  return state !== null && VALID_STATES.includes(state as PRState);
}

export function usePRListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const stateParam = searchParams.get('state');
  const pageParam = searchParams.get('page');

  const state: PRState = isValidState(stateParam) ? stateParam : 'open';
  const page = Math.max(1, Number(pageParam) || 1);

  const setState = (newState: PRState) => {
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
    limit: PR_LIST_LIMIT,
    setState,
    setPage,
  };
}
