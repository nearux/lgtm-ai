import { X, ArrowLeft } from 'lucide-react';
import { IconButton } from '@/shared/components';
import type { ChatPanelMode } from '../../../contexts/ChatPanelContext';

interface Props {
  title: string;
  mode: ChatPanelMode;
  status: string;
  hasMessages: boolean;
  showStatusBadge: boolean;
  onClose: () => void;
  onBackToChat?: () => void;
  onHideHistory?: () => void;
}

export const ChatHeader = ({
  title,
  mode,
  status,
  hasMessages,
  showStatusBadge,
  onClose,
  onBackToChat,
  onHideHistory,
}: Props) => {
  return (
    <div className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        {mode === 'chat' && hasMessages && onBackToChat && (
          <button
            type="button"
            onClick={onBackToChat}
            className="cursor-pointer rounded p-1 hover:bg-gray-100"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
        )}
        {mode === 'history' && onHideHistory && (
          <button
            type="button"
            onClick={onHideHistory}
            className="cursor-pointer rounded p-1 hover:bg-gray-100"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
        )}
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {showStatusBadge && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              status === 'connected'
                ? 'bg-green-100 text-green-700'
                : status === 'connecting'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-600'
            }`}
          >
            {status}
          </span>
        )}
      </div>
      <IconButton onClick={onClose} aria-label="Close panel">
        <X className="h-5 w-5" />
      </IconButton>
    </div>
  );
};
