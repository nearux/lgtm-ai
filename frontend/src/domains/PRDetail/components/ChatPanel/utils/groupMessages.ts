import type { ClaudeMessage } from '../../../hooks';

export interface TextChunk {
  id: string;
  content: string;
}

export type GroupedItem =
  | {
      kind: 'text';
      id: string;
      content: string;
      chunks: TextChunk[];
      isStreaming: boolean;
    }
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

export const groupMessages = (
  messages: ClaudeMessage[],
  isConnected: boolean
): GroupedItem[] => {
  const result: GroupedItem[] = [];
  const toolMap = new Map<string, GroupedItem & { kind: 'tool' }>();
  let textChunks: TextChunk[] = [];
  let textId = '';

  const flushText = (isStreaming: boolean) => {
    const content = textChunks.map((c) => c.content).join('');
    if (content.trim()) {
      result.push({
        kind: 'text',
        id: textId,
        content: content.trim(),
        chunks: [...textChunks],
        isStreaming,
      });
    }
    textChunks = [];
    textId = '';
  };

  for (const msg of messages) {
    if (msg.type === 'text') {
      if (!textId) textId = msg.id;
      textChunks.push({ id: msg.id, content: msg.content });
    } else if (msg.type === 'user') {
      flushText(false);
      result.push({ kind: 'user', id: msg.id, content: msg.content });
    } else if (msg.type === 'tool' && msg.toolId) {
      flushText(false);
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
      flushText(false);
      result.push({
        kind: 'text',
        id: msg.id,
        content: `Error: ${msg.content}`,
        chunks: [{ id: msg.id, content: `Error: ${msg.content}` }],
        isStreaming: false,
      });
    }
  }

  // The last text block is still streaming only if we're connected
  flushText(isConnected);
  return result;
};
