import { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; owner: string; repo: string }) => void;
}

const initialForm = { name: '', owner: '', repo: '' };

export const CreateProjectModal = ({ isOpen, onClose, onSubmit }: Props) => {
  const [form, setForm] = useState(initialForm);

  if (!isOpen) return null;

  const handleChange =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
    setForm(initialForm);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Add New Project</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
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
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              GitHub Owner
            </label>
            <input
              type="text"
              value={form.owner}
              onChange={handleChange('owner')}
              placeholder="username or organization"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Repository Name
            </label>
            <input
              type="text"
              value={form.repo}
              onChange={handleChange('repo')}
              placeholder="my-repo"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-indigo-500 px-4 py-2 text-white transition-colors hover:bg-indigo-600"
            >
              Add Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
