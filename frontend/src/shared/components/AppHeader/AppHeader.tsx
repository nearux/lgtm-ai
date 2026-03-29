import { Suspense } from 'react';
import { AccountMenu } from '../AccountMenu/AccountMenu';

export const AppHeader = () => {
  return (
    <header className="flex items-center justify-between border-b border-gray-800 px-6 py-3">
      <h1 className="from-indigo-500 to-purple-600 bg-clip-text text-xl font-bold text-transparent">
        LGTM AI
      </h1>
      <Suspense
        fallback={<span className="text-sm text-gray-500">Loading...</span>}
      >
        <AccountMenu />
      </Suspense>
    </header>
  );
};
