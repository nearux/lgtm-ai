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
      <div className="mb-12 text-center">
        <p className="text-lg text-gray-500">Select a project to review PRs</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AsyncBoundary>
          <ProjectCardList />
          <AddProjectCard onClick={handleAddClick} />
        </AsyncBoundary>
      </div>
    </div>
  );
};
