import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export const AddProjectCard = ({ className = '', ...props }: Props) => {
  return (
    <button
      type="button"
      className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center transition-all hover:-translate-y-0.5 hover:border-indigo-500 hover:bg-white hover:shadow-lg ${className}`}
      {...props}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-200 text-3xl text-indigo-500">
        +
      </div>
      <h3 className="text-xl font-semibold text-gray-900">Add Project</h3>
      <span className="text-sm text-gray-500">
        Connect a local Git repository
      </span>
    </button>
  );
};
