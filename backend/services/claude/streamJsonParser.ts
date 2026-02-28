/**
 * Parses a single stream-json line and extracts structured events,
 * or returns null if the line should be skipped.
 *
 * Real-time text tokens arrive as:
 *   {"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}}
 *
 * Tool call events:
 *   tool_start  – stream_event > content_block_start with content_block.type === 'tool_use'
 *   tool_complete – assistant message with content[].type === 'tool_use'
 *   tool_result – user message with content[].type === 'tool_result'
 */

export type ParsedStreamEvent =
  | { kind: 'text'; text: string }
  | { kind: 'tool_start'; toolId: string; toolName: string }
  | { kind: 'tool_complete'; toolId: string; toolName: string; input: unknown }
  | { kind: 'tool_result'; toolId: string; content: string; isError: boolean };

export function parseStreamJsonLine(line: string): ParsedStreamEvent | null {
  if (!line.trim()) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(line) as Record<string, unknown>;
  } catch {
    // Not valid JSON – forward as-is (e.g. early diagnostic output)
    return { kind: 'text', text: line };
  }

  if (parsed['type'] === 'stream_event') {
    const event = parsed['event'] as Record<string, unknown> | undefined;

    // Real-time token streaming: stream_event > content_block_delta > text_delta
    if (event?.['type'] === 'content_block_delta') {
      const delta = event['delta'] as Record<string, unknown> | undefined;
      if (delta?.['type'] === 'text_delta') {
        const text = delta['text'];
        return typeof text === 'string' && text ? { kind: 'text', text } : null;
      }
    }

    // Tool call start: stream_event > content_block_start with tool_use block
    if (event?.['type'] === 'content_block_start') {
      const block = event['content_block'] as
        | Record<string, unknown>
        | undefined;
      if (block?.['type'] === 'tool_use') {
        const toolId = block['id'];
        const toolName = block['name'];
        if (typeof toolId === 'string' && typeof toolName === 'string') {
          return { kind: 'tool_start', toolId, toolName };
        }
      }
    }
  }

  // Tool call complete: assistant message containing tool_use content blocks
  if (parsed['type'] === 'assistant') {
    const message = parsed['message'] as Record<string, unknown> | undefined;
    const content = message?.['content'] as unknown[] | undefined;
    if (Array.isArray(content)) {
      const toolUse = content.find(
        (c): c is Record<string, unknown> =>
          typeof c === 'object' &&
          c !== null &&
          (c as Record<string, unknown>)['type'] === 'tool_use'
      );
      if (toolUse) {
        const toolId = toolUse['id'];
        const toolName = toolUse['name'];
        const input = toolUse['input'];
        if (typeof toolId === 'string' && typeof toolName === 'string') {
          return { kind: 'tool_complete', toolId, toolName, input };
        }
      }
    }
  }

  // Tool result: user message containing tool_result content blocks
  if (parsed['type'] === 'user') {
    const message = parsed['message'] as Record<string, unknown> | undefined;
    const content = message?.['content'] as unknown[] | undefined;
    if (Array.isArray(content)) {
      const toolResult = content.find(
        (c): c is Record<string, unknown> =>
          typeof c === 'object' &&
          c !== null &&
          (c as Record<string, unknown>)['type'] === 'tool_result'
      );
      if (toolResult) {
        const toolId = toolResult['tool_use_id'];
        const rawContent = toolResult['content'];
        const isError = toolResult['is_error'];
        if (typeof toolId === 'string') {
          const contentStr =
            typeof rawContent === 'string'
              ? rawContent
              : JSON.stringify(rawContent);
          return {
            kind: 'tool_result',
            toolId,
            content: contentStr,
            isError: isError === true,
          };
        }
      }
    }
  }

  return null;
}
