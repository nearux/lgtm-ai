import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { projectsMutation, projectsQuery } from '@/shared/apis';
import { Modal, Button } from '@/shared/components';
import type { Project } from '@lgtmai/backend/types';

interface Props {
  isOpen: boolean;
  close: () => void;
  project: Project;
}

export const DeleteProjectModal = ({ isOpen, close, project }: Props) => {
  const { mutate, isPending } = useMutation({
    ...projectsMutation.delete(),
    meta: {
      invalidates: [projectsQuery.list().queryKey],
    },
    onSuccess: close,
    onError: (error) => toast.error(error.message),
  });

  const handleClose = () => {
    if (isPending) return;
    close();
  };

  const handleConfirm = () => {
    mutate(project.id);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Delete Project"
      size="sm"
    >
      <p className="text-gray-600">
        Are you sure you want to delete{' '}
        <span className="font-semibold">{project.name}</span>? This action
        cannot be undone.
      </p>
      <div className="mt-6 flex gap-3">
        <Button
          variant="secondary"
          onClick={handleClose}
          disabled={isPending}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleConfirm}
          loading={isPending}
          className="flex-1"
        >
          {isPending ? 'Deleting...' : 'Delete'}
        </Button>
      </div>
    </Modal>
  );
};
