import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { projectsMutation, projectsQuery } from '@/shared/apis';
import { Modal, Input, Button } from '@/shared/components';
import type { CreateProjectBody } from '@lgtmai/backend/types';

interface Props {
  isOpen: boolean;
  close: () => void;
}

export const CreateProjectModal = ({ isOpen, close }: Props) => {
  const [form, setForm] = useState<CreateProjectBody>({
    name: '',
    working_dir: '',
    description: '',
  });

  const { mutate, isPending } = useMutation({
    ...projectsMutation.create(),
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
    setForm({ name: '', working_dir: '', description: '' });
    close();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({
      name: form.name,
      working_dir: form.working_dir,
      description: form.description || undefined,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Project">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Project Name"
          value={form.name}
          onChange={handleChange('name')}
          placeholder="My Awesome Project"
          required
          disabled={isPending}
        />
        <Input
          label="Working Directory"
          value={form.working_dir}
          onChange={handleChange('working_dir')}
          placeholder="/Users/you/projects/my-repo"
          description="Absolute path to a local Git repository"
          className="font-mono text-sm"
          required
          disabled={isPending}
        />
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
          <Button type="submit" loading={isPending} className="flex-1">
            {isPending ? 'Adding...' : 'Add Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
