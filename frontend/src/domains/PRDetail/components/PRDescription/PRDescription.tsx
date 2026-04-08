import { MessageCircle } from 'lucide-react';
import { GFMMarkdown } from '@/shared/components';

interface Props {
  body: string;
  onAskClaude?: () => void;
}

export const PRDescription = ({ body, onAskClaude }: Props) => {
  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Description</h2>
        {onAskClaude && (
          <button
            type="button"
            onClick={onAskClaude}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100"
          >
            <MessageCircle className="h-4 w-4" />
            Ask Claude
          </button>
        )}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <GFMMarkdown>{body}</GFMMarkdown>
      </div>
    </section>
  );
};
