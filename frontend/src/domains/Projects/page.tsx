import { useNavigate } from 'react-router-dom';
import { useSuspenseQuery } from '@tanstack/react-query';
import { projectsQuery } from '@/shared/apis';
import { useOverlay } from '@/shared/hooks';
import { CreateProjectModal } from './components/CreateProjectModal/CreateProjectModal';
import { EditProjectModal } from './components/EditProjectModal/EditProjectModal';
import { DeleteProjectModal } from './components/DeleteProjectModal/DeleteProjectModal';
import { ProjectCard } from './components/ProjectCard/ProjectCard';
import { AddProjectCard } from './components/AddProjectCard/AddProjectCard';
import type { Project } from '@lgtmai/backend/types';

export const ProjectSelectPage = () => {
  const navigate = useNavigate();
  const overlay = useOverlay();

  const { data: projects } = useSuspenseQuery(projectsQuery.list());

  const handleProjectClick = (project: Project) => {
    navigate(`/projects/${project.id}/prs`);
  };

  const handleAddClick = () => {
    overlay.open(
      ({ isOpen, close, exit }) => (
        <CreateProjectModal isOpen={isOpen} close={close} exit={exit} />
      ),
      'create-project'
    );
  };

  const handleEditClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    overlay.open(
      ({ isOpen, close, exit }) => (
        <EditProjectModal
          isOpen={isOpen}
          close={close}
          exit={exit}
          project={project}
        />
      ),
      'edit-project'
    );
  };

  const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    overlay.open(
      ({ isOpen, close, exit }) => (
        <DeleteProjectModal
          isOpen={isOpen}
          close={close}
          exit={exit}
          project={project}
        />
      ),
      'delete-project'
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
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => handleProjectClick(project)}
            onEdit={(e) => handleEditClick(e, project)}
            onDelete={(e) => handleDeleteClick(e, project)}
          />
        ))}

        <AddProjectCard onClick={handleAddClick} />
      </div>
    </div>
  );
};
