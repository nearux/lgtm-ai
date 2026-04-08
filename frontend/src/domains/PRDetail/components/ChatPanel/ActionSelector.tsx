import { useState } from 'react';
import { CheckCircle, BookOpen, Wrench, Send, History } from 'lucide-react';
import type { ClaudeCommand } from '@lgtmai/backend/types';

interface ActionOption {
  id: ClaudeCommand;
  label: string;
  description: string;
  icon: React.ReactNode;
}

type ActionScope = 'review' | 'pr';

interface Props {
  onSelect: (command: ClaudeCommand, customPrompt?: string) => void;
  onShowHistory?: () => void;
  scope?: ActionScope;
}

const reviewActions: ActionOption[] = [
  {
    id: 'validate',
    label: 'Validate',
    description: 'Check if the review is valid',
    icon: <CheckCircle className="h-5 w-5" />,
  },
  {
    id: 'explain',
    label: 'Explain',
    description: 'Explain the review in simple terms',
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    id: 'fix',
    label: 'Fix Code',
    description: 'Apply code changes locally',
    icon: <Wrench className="h-5 w-5" />,
  },
];

const prActions: ActionOption[] = [
  {
    id: 'explain',
    label: 'Explain',
    description: 'Summarize this pull request',
    icon: <BookOpen className="h-5 w-5" />,
  },
];

export const ActionSelector = ({
  onSelect,
  onShowHistory,
  scope = 'review',
}: Props) => {
  const [chatInput, setChatInput] = useState('');

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSelect('custom', chatInput.trim());
    setChatInput('');
  };

  return (
    <div className="flex h-full flex-col items-center justify-center p-4">
      <h3 className="mb-4 text-xl font-medium text-gray-700">
        What would you like to do?
      </h3>

      <div
        className={`grid w-full max-w-sm gap-3 ${scope === 'pr' ? 'grid-cols-1' : 'grid-cols-3'}`}
      >
        {(scope === 'pr' ? prActions : reviewActions).map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onSelect(action.id)}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-sm ${scope === 'pr' ? 'flex-row text-left' : 'flex-col text-center'}`}
          >
            <span className="text-indigo-600">{action.icon}</span>
            <div className={'flex flex-col gap-1'}>
              <span className="text-sm font-medium text-gray-800">
                {action.label}
              </span>
              <span className="text-xs text-gray-500">
                {action.description}
              </span>
            </div>
          </button>
        ))}
      </div>

      <form onSubmit={handleChatSubmit} className="mt-6 w-full max-w-sm">
        <div className="flex flex-col gap-2">
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (chatInput.trim()) {
                  onSelect('custom', chatInput.trim());
                  setChatInput('');
                }
              }
            }}
            placeholder="Or ask your own question..."
            className="min-h-[80px] w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
      </form>

      {onShowHistory && (
        <button
          type="button"
          onClick={onShowHistory}
          className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-gray-500 transition-colors hover:text-indigo-600"
        >
          <History className="h-4 w-4" />
          View chat history
        </button>
      )}
    </div>
  );
};
