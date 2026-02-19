import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { ProjectSelectPage } from './domains/Projects/page';
import { PRListPage } from './domains/PRList/page';
import { PRDetailPage } from './domains/PRDetail/page';

function App() {
  return (
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
  );
}

export default App;
