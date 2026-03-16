import { useEffect, useRef, useState } from 'react';
import {
  X,
  Terminal,
  ChevronDown,
  ChevronRight,
  Check,
  XCircle,
  Loader2,
  Send,
} from 'lucide-react';
import { IconButton, Spinner, GFMMarkdown } from '@/shared/components';
import type { ClaudeMessage, ConnectionStatus } from '../../hooks';
import type {
  ChatPanelMode,
  TargetContext,
} from '../../contexts/ChatPanelContext';
import { ActionSelector } from './ActionSelector';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  messages: ClaudeMessage[];
  status: ConnectionStatus;
  title?: string;
  sessionId?: string | null;
  onSendFollowUp?: ((message: string) => void) | null;
  mode?: ChatPanelMode;
  targetContext?: TargetContext | null;
  onExecuteAction?: ((actionId: string, customPrompt?: string) => void) | null;
}

type GroupedItem =
  | { kind: 'text'; id: string; content: string }
  | { kind: 'user'; id: string; content: string }
  | {
      kind: 'tool';
      id: string;
      toolId: string;
      toolName: string;
      input: string;
      result?: string;
      isError?: boolean;
    };

const groupMessages = (messages: ClaudeMessage[]): GroupedItem[] => {
  const result: GroupedItem[] = [];
  const toolMap = new Map<string, GroupedItem & { kind: 'tool' }>();
  let textBuffer = '';
  let textId = '';

  const flushText = () => {
    if (textBuffer.trim()) {
      result.push({ kind: 'text', id: textId, content: textBuffer.trim() });
    }
    textBuffer = '';
    textId = '';
  };

  for (const msg of messages) {
    if (msg.type === 'text') {
      if (!textId) textId = msg.id;
      textBuffer += msg.content;
    } else if (msg.type === 'user') {
      flushText();
      result.push({ kind: 'user', id: msg.id, content: msg.content });
    } else if (msg.type === 'tool' && msg.toolId) {
      flushText();
      const toolItem: GroupedItem & { kind: 'tool' } = {
        kind: 'tool',
        id: msg.id,
        toolId: msg.toolId,
        toolName: msg.toolName || 'Unknown',
        input: msg.content,
      };
      toolMap.set(msg.toolId, toolItem);
      result.push(toolItem);
    } else if (msg.type === 'tool_result' && msg.toolId) {
      const tool = toolMap.get(msg.toolId);
      if (tool) {
        tool.result = msg.content;
        tool.isError = msg.isError;
      }
    } else if (msg.type === 'error') {
      flushText();
      result.push({
        kind: 'text',
        id: msg.id,
        content: `Error: ${msg.content}`,
      });
    }
  }

  flushText();
  return result;
};

export const ChatPanel = ({
  isOpen,
  onClose,
  messages,
  status,
  title = 'Claude',
  sessionId,
  onSendFollowUp,
  mode = 'action-selection',
  targetContext,
  onExecuteAction,
}: Props) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [followUpInput, setFollowUpInput] = useState('');

  const lastMessage = messages[messages.length - 1];
  const isWaitingForResponse =
    status === 'connected' && lastMessage?.type === 'user';

  const showActionSelector =
    mode === 'action-selection' && messages.length === 0 && onExecuteAction;

  const handleSubmitFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpInput.trim() || !onSendFollowUp) return;
    onSendFollowUp(followUpInput.trim());
    setFollowUpInput('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const grouped = groupMessages(messages);

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
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {!showActionSelector && (
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {showActionSelector ? (
          <ActionSelector
            targetContext={targetContext ?? null}
            onSelect={onExecuteAction}
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
            {grouped.map((item) => {
              if (item.kind === 'text') {
                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <GFMMarkdown className="prose-sm">
                      {item.content}
                    </GFMMarkdown>
                  </div>
                );
              }
              if (item.kind === 'user') {
                return (
                  <div key={item.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white">
                      {item.content}
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-lg border border-purple-200 bg-purple-50"
                >
                  <button
                    type="button"
                    onClick={() => toggleTool(item.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-purple-100"
                  >
                    {expandedTools.has(item.id) ? (
                      <ChevronDown className="h-4 w-4 text-purple-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-purple-500" />
                    )}
                    <Terminal className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-purple-800">
                      {item.toolName}
                    </span>
                    <span className="ml-auto">
                      {item.result === undefined ? (
                        <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                      ) : item.isError ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                    </span>
                  </button>
                  {expandedTools.has(item.id) && (
                    <div className="border-t border-purple-200 bg-purple-100/50 p-2">
                      <div className="mb-1 text-xs font-medium text-purple-600">
                        Input:
                      </div>
                      <pre className="max-h-24 overflow-auto text-xs whitespace-pre-wrap text-purple-900">
                        {item.input}
                      </pre>
                      {item.result !== undefined && (
                        <>
                          <div className="mt-2 mb-1 text-xs font-medium text-purple-600">
                            Result:
                          </div>
                          <pre
                            className={`max-h-32 overflow-auto text-xs whitespace-pre-wrap ${
                              item.isError ? 'text-red-700' : 'text-purple-900'
                            }`}
                          >
                            {item.result.slice(0, 500)}
                            {item.result.length > 500 && '...'}
                          </pre>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {isWaitingForResponse && (
              <div className="flex items-center gap-2 px-1 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-400">Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Follow-up Input - always show when in chat mode */}
      {!showActionSelector && messages.length > 0 && onSendFollowUp && (
        <form
          onSubmit={handleSubmitFollowUp}
          className="shrink-0 border-t border-gray-200 bg-white p-4"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={followUpInput}
              onChange={(e) => setFollowUpInput(e.target.value)}
              placeholder="Ask a follow-up question..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!followUpInput.trim() || !sessionId || !onSendFollowUp}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
