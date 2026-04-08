import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { Spinner } from '@/shared/components';
import type {
  ChatPanelMode,
  ChatPanelState,
} from '../../contexts/ChatPanelContext';
import { ActionSelector } from './ActionSelector';
import { ChatHistoryList } from './ChatHistoryList';
import { groupMessages } from './utils/groupMessages';
import { ChatHeader } from './components/ChatHeader';
import { TextBubble } from './components/TextBubble';
import { UserBubble } from './components/UserBubble';
import { ToolBubble } from './components/ToolBubble';
import { FollowUpInput } from './components/FollowUpInput';
import { FileChangesCard } from './components/FileChangesCard';
import type { FileChangesData } from '../../hooks';

export interface CommitState {
  isCommitting: boolean;
  result?: { success: boolean; commitHash?: string; error?: string };
}

interface Props {
  isOpen: boolean;
  state: ChatPanelState;
  mode: ChatPanelMode;
  fileChanges: FileChangesData | null;
  onClose: () => void;
  onShowHistory: () => void;
  onHideHistory: () => void;
  onBackToChat: () => void;
  onCommitAndPush?: () => void;
  commitState?: CommitState;
}

export const ChatPanel = ({
  isOpen,
  state,
  mode,
  fileChanges,
  onClose,
  onShowHistory,
  onHideHistory,
  onBackToChat,
  onCommitAndPush,
  commitState,
}: Props) => {
  const {
    title,
    messages,
    status,
    sessionId,
    onSendFollowUp,
    prContext,
    onExecuteAction,
    onResumeSession,
  } = state;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  const lastMessage = messages[messages.length - 1];
  const isWaitingForResponse =
    status === 'connected' && lastMessage?.type === 'user';

  const showActionSelector =
    mode === 'action-selection' && messages.length === 0 && onExecuteAction;

  const showHistory = mode === 'history' && prContext;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const grouped = groupMessages(messages, status === 'connected');

  const toggleTool = (id: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      className={`fixed top-0 right-0 z-50 flex h-full w-[480px] transform flex-col border-l border-gray-200 bg-gray-50 shadow-lg transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <ChatHeader
        title={title}
        mode={mode}
        status={status}
        hasMessages={messages.length > 0}
        showStatusBadge={!showActionSelector && !showHistory}
        onClose={onClose}
        onBackToChat={onBackToChat}
        onHideHistory={onHideHistory}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {showHistory && prContext ? (
          <ChatHistoryList
            projectId={prContext.projectId}
            prNumber={prContext.prNumber}
            onSelectSession={(session) => {
              onResumeSession?.(session);
            }}
          />
        ) : showActionSelector ? (
          <ActionSelector
            onSelect={onExecuteAction}
            onShowHistory={onShowHistory}
          />
        ) : grouped.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4">
            {status === 'connecting' ? (
              <div className="flex flex-col items-center gap-2">
                <Spinner size="lg" />
                <p className="text-sm text-gray-500">Connecting...</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No messages yet</p>
            )}
          </div>
        ) : (
          <div className="space-y-3 p-4">
            <AnimatePresence initial={false}>
              {grouped.map((item) => {
                if (item.kind === 'text') {
                  return <TextBubble key={item.id} item={item} />;
                }
                if (item.kind === 'user') {
                  return <UserBubble key={item.id} item={item} />;
                }
                return (
                  <ToolBubble
                    key={item.id}
                    item={item}
                    isExpanded={expandedTools.has(item.id)}
                    onToggle={() => toggleTool(item.id)}
                  />
                );
              })}
            </AnimatePresence>
            {isWaitingForResponse && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2 px-1 py-2"
              >
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-400">Thinking...</span>
              </motion.div>
            )}
            {fileChanges && (
              <FileChangesCard
                data={fileChanges}
                onCommitAndPush={onCommitAndPush}
                isCommitting={commitState?.isCommitting}
                commitResult={commitState?.result}
              />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {!showActionSelector &&
        !showHistory &&
        messages.length > 0 &&
        onSendFollowUp && (
          <FollowUpInput
            sessionId={sessionId}
            onSendFollowUp={onSendFollowUp}
          />
        )}
    </div>
  );
};
