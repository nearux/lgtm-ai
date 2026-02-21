import Markdown from 'react-markdown';

interface Props {
  body: string;
}

export const PRDescription = ({ body }: Props) => {
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">Description</h2>
      <div className="prose prose-gray max-w-none rounded-xl border border-gray-200 bg-white p-4">
        <Markdown>{body}</Markdown>
      </div>
    </section>
  );
};
