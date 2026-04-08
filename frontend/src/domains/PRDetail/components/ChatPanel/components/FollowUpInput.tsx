import { useState } from 'react';
import { Send } from 'lucide-react';

interface Props {
  sessionId?: string | null;
  onSendFollowUp: (message: string) => void;
}

export const FollowUpInput = ({ sessionId, onSendFollowUp }: Props) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendFollowUp(input.trim());
    setInput('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="shrink-0 border-t border-gray-200 bg-white p-4"
    >
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a follow-up question..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || !sessionId}
          className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
};
