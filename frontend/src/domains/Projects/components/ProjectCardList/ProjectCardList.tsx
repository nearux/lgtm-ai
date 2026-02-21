import { useNavigate } from 'react-router-dom';
import { useSuspenseQuery } from '@tanstack/react-query';
import { projectsQuery } from '@/shared/apis';
import { useOverlay } from '@/shared/hooks';
import { ProjectCard } from '../ProjectCard/ProjectCard';
import { EditProjectModal } from '../EditProjectModal/EditProjectModal';
import { DeleteProjectModal } from '../DeleteProjectModal/DeleteProjectModal';
import type { Project } from '@lgtmai/backend/types';

export const ProjectCardList = () => {
  const navigate = useNavigate();
  const overlay = useOverlay();

  const { data: projects } = useSuspenseQuery(projectsQuery.list());

  const handleProjectClick = (project: Project) => {
    navigate(`/projects/${project.id}/prs`);
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
    <>
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onClick={() => handleProjectClick(project)}
          onEdit={(e) => handleEditClick(e, project)}
          onDelete={(e) => handleDeleteClick(e, project)}
        />
      ))}
    </>
  );
};
