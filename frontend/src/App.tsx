import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { getQueryClient } from '@/shared/lib/getQueryClient';
import { OverlayProvider } from '@/shared/hooks';
import { ProjectSelectPage } from './domains/Projects/page';
import { PRListPage } from './domains/PRList/page';
import { PRDetailPage } from './domains/PRDetail/page';

const App = () => {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-center" richColors />
      <OverlayProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ProjectSelectPage />} />
            <Route path="/projects/:projectId/prs" element={<PRListPage />} />
            <Route
              path="/projects/:projectId/prs/:prNumber"
              element={<PRDetailPage />}
            />
          </Routes>
        </BrowserRouter>
      </OverlayProvider>
    </QueryClientProvider>
  );
};

export default App;
