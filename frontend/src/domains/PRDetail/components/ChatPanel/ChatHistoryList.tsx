import { useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { chatSessionsQuery } from '@/shared/apis';
import { Spinner } from '@/shared/components';
import type { ChatSessionSummary } from '@lgtmai/backend/types';
import { formatRelativeTime } from '../../utils/formatRelativeTime';

interface Props {
  projectId: string;
  prNumber: number;
  onSelectSession: (session: ChatSessionSummary) => void;
}

export const ChatHistoryList = ({
  projectId,
  prNumber,
  onSelectSession,
}: Props) => {
  const {
    data: sessions,
    isLoading,
    error,
  } = useQuery(chatSessionsQuery.list(projectId, prNumber));

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4">
        <p className="text-sm text-red-500">Failed to load chat history</p>
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4">
        <MessageSquare className="mb-2 h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">No chat history yet</p>
        <p className="mt-1 text-xs text-gray-400">
          Start a conversation to see it here
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {sessions.map((session) => (
        <button
          key={session.id}
          type="button"
          onClick={() => onSelectSession(session)}
          className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
        >
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {session.title || `Chat ${session.id.slice(0, 8)}`}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {session.scopeType === 'REVIEW' ? 'Review' : 'Comment'} -{' '}
              {formatRelativeTime(session.lastUsedAt)}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};
