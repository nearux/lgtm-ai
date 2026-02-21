import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateProjectModal } from './components/CreateProjectModal';

export const ProjectSelectPage = () => {
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleProjectClick = (project: Project) => {
    navigate(`/projects/${project.id}/prs`);
  };

  const handleCreateProject = (data: Omit<Project, 'id'>) => {
    console.log('Create project:', data);
    setIsModalOpen(false);
  };

  return (
    <div className="mx-auto max-w-6xl p-8">
      <header className="mb-12 text-center">
        <h1 className="mb-2 from-indigo-500 to-purple-600 bg-clip-text text-4xl font-bold text-transparent">
          LGTM AI
        </h1>
        <p className="text-lg text-gray-500">Select a project to review PRs</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockProjects.map((project) => (
          <button
            key={project.id}
            className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-6 text-center transition-all hover:-translate-y-0.5 hover:border-indigo-500 hover:shadow-lg"
            onClick={() => handleProjectClick(project)}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100 text-gray-800">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="32"
                height="32"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              {project.name}
            </h3>
            <span className="text-sm text-gray-500">
              {project.owner}/{project.repo}
            </span>
          </button>
        ))}

        <button
          className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center transition-all hover:-translate-y-0.5 hover:border-indigo-500 hover:bg-white hover:shadow-lg"
          onClick={() => setIsModalOpen(true)}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-200 text-3xl text-indigo-500">
            +
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Add Project</h3>
          <span className="text-sm text-gray-500">
            Connect a GitHub repository
          </span>
        </button>
      </div>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
};

// TODO: Edit Type & type define location
interface Project {
  id: string;
  name: string;
  owner: string;
  repo: string;
}

const mockProjects: Project[] = [
  { id: '1', name: 'lgtm-ai', owner: 'pmh', repo: 'lgtm-ai' },
  { id: '2', name: 'my-app', owner: 'pmh', repo: 'my-app' },
];
