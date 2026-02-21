import { Suspense, type ReactNode } from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from '../ErrorBoundary/ErrorBoundary';
import { CommonFallback } from './components/CommonFallback/CommonFallback';
import { CommonErrorFallback } from './components/CommonErrorFallback/CommonErrorFallback';

interface Props {
  children: ReactNode;
  pending?: ReactNode;
  rejected?: (props: { error: Error; reset: () => void }) => ReactNode;
}

export const AsyncBoundary = ({
  children,
  pending = <CommonFallback />,
  rejected = ({ error, reset }) => (
    <CommonErrorFallback message={error.message} onRetry={reset} />
  ),
}: Props) => {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary fallback={rejected} onReset={reset}>
          <Suspense fallback={pending}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};
