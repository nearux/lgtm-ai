import { useOverlay } from '@/shared/hooks';
import { AsyncBoundary } from '@/shared/components';
import { CreateProjectModal } from './components/CreateProjectModal/CreateProjectModal';
import { ProjectCardList } from './components/ProjectCardList/ProjectCardList';
import { AddProjectCard } from './components/AddProjectCard/AddProjectCard';

export const ProjectSelectPage = () => {
  const overlay = useOverlay();

  const handleAddClick = () => {
    overlay.open(
      ({ isOpen, close }) => (
        <CreateProjectModal isOpen={isOpen} close={close} />
      ),
      'create-project'
    );
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
        <AsyncBoundary>
          <ProjectCardList />
          <AddProjectCard onClick={handleAddClick} />
        </AsyncBoundary>
      </div>
    </div>
  );
};
