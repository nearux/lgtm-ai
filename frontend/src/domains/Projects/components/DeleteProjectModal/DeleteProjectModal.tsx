import type { Project } from '@/shared/types';

interface Props {
  project: Project | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteProjectModal = ({
  project,
  isSubmitting,
  onClose,
  onConfirm,
}: Props) => {
  if (!project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
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
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {isSubmitting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};
