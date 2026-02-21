import { Component, Suspense, type ReactNode, type ErrorInfo } from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (props: { error: Error; reset: () => void }) => ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  reset = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error) {
      return fallback({ error, reset: this.reset });
    }

    return children;
  }
}

interface Props {
  children: ReactNode;
  pending?: ReactNode;
  rejected?: (props: { error: Error; reset: () => void }) => ReactNode;
}

const defaultPending = (
  <div className="flex h-64 items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
  </div>
);

const defaultRejected = ({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) => (
  <div className="flex h-64 flex-col items-center justify-center gap-4">
    <p className="text-red-500">{error.message}</p>
    <button
      onClick={reset}
      className="rounded-lg bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600"
    >
      Retry
    </button>
  </div>
);

export const AsyncBoundary = ({
  children,
  pending = defaultPending,
  rejected = defaultRejected,
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

export const FullPageAsyncBoundary = ({
  children,
  pending,
  rejected,
}: Props) => {
  const fullPagePending = pending ?? (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
    </div>
  );

  const fullPageRejected =
    rejected ??
    (({ error, reset }) => (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error.message}</p>
        <button
          onClick={reset}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600"
        >
          Retry
        </button>
      </div>
    ));

  return (
    <AsyncBoundary pending={fullPagePending} rejected={fullPageRejected}>
      {children}
    </AsyncBoundary>
  );
};
