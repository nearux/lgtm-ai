import { GFMMarkdown } from '@/shared/components';

interface Props {
  body: string;
}

export const PRDescription = ({ body }: Props) => {
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">Description</h2>
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <GFMMarkdown>{body}</GFMMarkdown>
      </div>
    </section>
  );
};
