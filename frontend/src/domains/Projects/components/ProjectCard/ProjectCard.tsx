import type { HTMLAttributes } from 'react';
import { Pencil, Trash2, FolderGit2 } from 'lucide-react';
import type { Project } from '@lgtmai/backend/types';
import { IconButton } from '@/shared/components';

interface Props extends HTMLAttributes<HTMLDivElement> {
  project: Project;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

export const ProjectCard = ({
  project,
  onEdit,
  onDelete,
  className = '',
  ...props
}: Props) => {
  return (
    <div
      className={`group relative flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-6 text-center transition-all hover:-translate-y-0.5 hover:border-indigo-500 hover:shadow-lg ${className}`}
      {...props}
    >
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 transition-all group-hover:opacity-100">
        <IconButton onClick={onEdit} title="Edit project">
          <Pencil className="h-4 w-4" />
        </IconButton>
        <IconButton variant="danger" onClick={onDelete} title="Delete project">
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100 text-gray-800">
        <FolderGit2 className="h-8 w-8" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900">{project.name}</h3>
      <span className="max-w-full truncate text-sm text-gray-500">
        {project.working_dir}
      </span>
    </div>
  );
};
