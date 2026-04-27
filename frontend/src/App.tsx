import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { getQueryClient } from '@/shared/lib/getQueryClient';
import { OverlayProvider } from '@/shared/hooks';
import { AppHeader } from '@/features/AppHeader/AppHeader';
import { ProjectSelectPage } from './domains/Projects/page';
import { PRListPage } from './domains/PRList/page';
import { PRDetailPage } from './domains/PRDetail/page';
import { IssueListPage } from './domains/IssueList/page';

const Layout = () => (
  <div className="flex min-h-screen flex-col">
    <AppHeader />
    <main className="flex-1 pt-(--header-height)">
      <Outlet />
    </main>
  </div>
);

const App = () => {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-center" richColors />
      <OverlayProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<ProjectSelectPage />} />
              <Route path="/projects/:projectId/prs" element={<PRListPage />} />
              <Route
                path="/projects/:projectId/prs/:prNumber"
                element={<PRDetailPage />}
              />
              <Route
                path="/projects/:projectId/issues"
                element={<IssueListPage />}
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </OverlayProvider>
    </QueryClientProvider>
  );
};

export default App;
