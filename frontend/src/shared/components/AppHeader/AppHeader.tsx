import { AsyncBoundary } from '../AsyncBoundary/AsyncBoundary';
import { AccountMenu } from '../AccountMenu/AccountMenu';

export const AppHeader = () => {
  return (
    <header className="fixed z-10 flex w-full items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <h1 className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-xl font-bold text-transparent">
        LGTM AI
      </h1>
      <AsyncBoundary
        pending={<span className="text-sm text-gray-500">Loading...</span>}
        rejected={({ error, reset }) => (
          <button
            onClick={reset}
            className="text-sm text-red-400 hover:text-red-300"
          >
            {error.message} (retry)
          </button>
        )}
      >
        <AccountMenu />
      </AsyncBoundary>
    </header>
  );
};
