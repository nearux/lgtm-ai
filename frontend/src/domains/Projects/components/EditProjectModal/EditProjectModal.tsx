import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { projectsMutation, projectsQuery } from '@/shared/apis';
import type { Project, UpdateProjectBody } from '@lgtmai/backend/types';

interface Props {
  isOpen: boolean;
  close: () => void;
  exit: () => void;
  project: Project;
}

export const EditProjectModal = ({ isOpen, close, exit, project }: Props) => {
  const [form, setForm] = useState<UpdateProjectBody>({
    name: project.name,
    working_dir: project.working_dir,
    description: project.description ?? '',
  });

  const { mutate, isPending } = useMutation({
    ...projectsMutation.update(),
    meta: {
      invalidates: [projectsQuery.list().queryKey],
    },
    onSuccess: close,
    onError: (error) => toast.error(error.message),
  });

  if (!isOpen) return null;

  const handleChange =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleClose = () => {
    if (isPending) return;
    close();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({
      id: project.id,
      data: {
        name: form.name,
        working_dir: form.working_dir,
        description: form.description || undefined,
      },
    });
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
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Edit Project</h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Project Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="My Awesome Project"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              required
              disabled={isPending}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Working Directory
            </label>
            <input
              type="text"
              value={form.working_dir}
              onChange={handleChange('working_dir')}
              placeholder="/Users/you/projects/my-repo"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 font-mono text-sm transition-colors outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              required
              disabled={isPending}
            />
            <p className="mt-1 text-xs text-gray-500">
              Absolute path to a local Git repository
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description (optional)
            </label>
            <input
              type="text"
              value={form.description}
              onChange={handleChange('description')}
              placeholder="A brief description of the project"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              disabled={isPending}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
