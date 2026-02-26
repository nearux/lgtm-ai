import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Folder } from 'lucide-react';
import { projectsMutation, projectsQuery } from '@/shared/apis';
import { Modal, Input, Button, AsyncBoundary } from '@/shared/components';
import type { Project, UpdateProjectBody } from '@lgtmai/backend/types';
import { FolderBrowser } from '../FolderBrowser/FolderBrowser';

interface Props {
  isOpen: boolean;
  close: () => void;
  project: Project;
}

export const EditProjectModal = ({ isOpen, close, project }: Props) => {
  const [form, setForm] = useState<UpdateProjectBody>({
    name: project.name,
    working_dir: project.working_dir,
    description: project.description ?? '',
  });
  const [showBrowser, setShowBrowser] = useState(false);

  const { mutate, isPending } = useMutation({
    ...projectsMutation.update(),
    meta: {
      invalidates: [projectsQuery.list().queryKey],
    },
    onSuccess: close,
    onError: (error) => toast.error(error.message),
  });

  const handleChange =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleClose = () => {
    if (isPending) return;
    setShowBrowser(false);
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

  const handleFolderSelect = (path: string) => {
    setForm((prev) => ({ ...prev, working_dir: path }));
    setShowBrowser(false);
  };

  if (showBrowser) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Select Working Directory"
        size="lg"
      >
        <AsyncBoundary
          pending={<FolderBrowser.Fallback />}
          rejected={(props) => <FolderBrowser.ErrorFallback {...props} />}
        >
          <FolderBrowser
            initialPath={form.working_dir || undefined}
            onSelect={handleFolderSelect}
            onCancel={() => setShowBrowser(false)}
          />
        </AsyncBoundary>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Project">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Project Name"
          value={form.name}
          onChange={handleChange('name')}
          placeholder="My Awesome Project"
          required
          disabled={isPending}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Working Directory
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.working_dir}
              readOnly
              placeholder="Select a folder..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-700 focus:border-indigo-500 focus:outline-none"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowBrowser(true)}
              disabled={isPending}
            >
              <Folder className="h-4 w-4" />
              Browse
            </Button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Select a local Git repository folder
          </p>
        </div>
        <Input
          label="Description (optional)"
          value={form.description}
          onChange={handleChange('description')}
          placeholder="A brief description of the project"
          disabled={isPending}
        />
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isPending}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isPending}
            disabled={!form.working_dir}
            className="flex-1"
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
