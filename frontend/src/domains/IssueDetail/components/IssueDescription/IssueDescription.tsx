import { GFMMarkdown } from '@/shared/components';

interface Props {
  body: string;
}

export const IssueDescription = ({ body }: Props) => {
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">Description</h2>
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        {body.trim() ? (
          <GFMMarkdown>{body}</GFMMarkdown>
        ) : (
          <p className="text-sm text-gray-400">No description provided.</p>
        )}
      </div>
    </section>
  );
};
