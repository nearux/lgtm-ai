import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { projectsMutation, projectsQuery } from '@/shared/apis';
import type { Project } from '@lgtmai/backend/types';

interface Props {
  isOpen: boolean;
  close: () => void;
  exit: () => void;
  project: Project;
}

export const DeleteProjectModal = ({ isOpen, close, exit, project }: Props) => {
  const { mutate, isPending } = useMutation({
    ...projectsMutation.delete(),
    meta: {
      invalidates: [projectsQuery.list().queryKey],
    },
    onSuccess: close,
    onError: (error) => toast.error(error.message),
  });

  if (!isOpen) return null;

  const handleClose = () => {
    if (isPending) return;
    close();
  };

  const handleConfirm = () => {
    mutate(project.id);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && !isOpen) {
          exit();
        }
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-xl font-bold text-gray-900">Delete Project</h2>
        <p className="mb-6 text-gray-600">
          Are you sure you want to delete{' '}
          <span className="font-semibold">{project.name}</span>? This action
          cannot be undone.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};
