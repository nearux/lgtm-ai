interface Props {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage = ({ message, onRetry }: Props) => (
  <div className="flex flex-col items-center justify-center p-8">
    <div className="mb-4 text-red-500">
      <svg
        className="h-12 w-12"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </div>
    <p className="mb-4 text-gray-700">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="rounded-lg bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600"
      >
        Try Again
      </button>
    )}
  </div>
);

export const FullPageError = ({ message, onRetry }: Props) => (
  <div className="flex h-screen items-center justify-center">
    <ErrorMessage message={message} onRetry={onRetry} />
  </div>
);
