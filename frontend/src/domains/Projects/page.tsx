import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAsync } from '@/shared/hooks';
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from '@/shared/api';
import { FullPageLoading, FullPageError } from '@/shared/components';
import { CreateProjectModal } from './components/CreateProjectModal/CreateProjectModal';
import { EditProjectModal } from './components/EditProjectModal/EditProjectModal';
import { DeleteProjectModal } from './components/DeleteProjectModal/DeleteProjectModal';
import { ProjectCard } from './components/ProjectCard/ProjectCard';
import { AddProjectCard } from './components/AddProjectCard/AddProjectCard';
import type {
  Project,
  CreateProjectBody,
  UpdateProjectBody,
} from '@/shared/types';

export const ProjectSelectPage = () => {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    data: projects,
    isLoading,
    error,
    refetch,
  } = useAsync(getProjects, []);

  const handleProjectClick = (project: Project) => {
    navigate(`/projects/${project.id}/prs`);
  };

  const handleEditClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setEditingProject(project);
    setSubmitError(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setDeletingProject(project);
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    setIsSubmitting(true);
    try {
      await deleteProject(deletingProject.id);
      setDeletingProject(null);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProject = async (data: CreateProjectBody) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await createProject(data);
      setIsCreateModalOpen(false);
      refetch();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to create project'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProject = async (id: string, data: UpdateProjectBody) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await updateProject(id, data);
      setEditingProject(null);
      refetch();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to update project'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <FullPageLoading />;
  }

  if (error) {
    return <FullPageError message={error} onRetry={refetch} />;
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <header className="mb-12 text-center">
        <h1 className="mb-2 from-indigo-500 to-purple-600 bg-clip-text text-4xl font-bold text-transparent">
          LGTM AI
        </h1>
        <p className="text-lg text-gray-500">Select a project to review PRs</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects?.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => handleProjectClick(project)}
            onEdit={(e) => handleEditClick(e, project)}
            onDelete={(e) => handleDeleteClick(e, project)}
          />
        ))}

        <AddProjectCard onClick={() => setIsCreateModalOpen(true)} />
      </div>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
        isSubmitting={isSubmitting}
        error={submitError}
      />

      <EditProjectModal
        project={editingProject}
        onClose={() => setEditingProject(null)}
        onSubmit={handleUpdateProject}
        isSubmitting={isSubmitting}
        error={submitError}
      />

      <DeleteProjectModal
        project={deletingProject}
        isSubmitting={isSubmitting}
        onClose={() => setDeletingProject(null)}
        onConfirm={handleDeleteProject}
      />
    </div>
  );
};
