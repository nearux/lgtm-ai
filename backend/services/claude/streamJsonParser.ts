/**
 * Parses a single stream-json line and extracts structured events,
 * or returns null if the line should be skipped.
 *
 */

export type ParsedStreamEvent =
  | { kind: 'text'; text: string }
  | { kind: 'init'; sessionId: string }
  | { kind: 'tool_start'; toolId: string; toolName: string }
  | { kind: 'tool_complete'; toolId: string; toolName: string; input: unknown }
  | { kind: 'tool_result'; toolId: string; content: string; isError: boolean }
  | {
      kind: 'result';
      result: string;
      sessionId: string | undefined;
      isError: boolean;
    }
  | {
      kind: 'hook_callback';
      requestId: string;
      callbackId: string;
      toolUseId: string;
      toolName: string;
      input: unknown;
    }
  | {
      kind: 'can_use_tool';
      requestId: string;
      toolUseId: string;
      toolName: string;
      input: unknown;
    };

type Parsed = Record<string, unknown>;

export function parseStreamJsonLine(line: string): ParsedStreamEvent | null {
  if (!line.trim()) return null;

  let parsed: Parsed;
  try {
    parsed = JSON.parse(line) as Parsed;
  } catch {
    return { kind: 'text', text: line };
  }

  switch (parsed['type']) {
    case 'stream_event':
      return parseStreamEvent(parsed);
    case 'assistant':
      return parseAssistantMessage(parsed);
    case 'user':
      return parseUserMessage(parsed);
    case 'result':
      return parseResultMessage(parsed);
    case 'control_request':
      return parseControlRequest(parsed);
    case 'system':
      return parseInitMessage(parsed);
    default:
      return null;
  }
}

function parseStreamEvent(parsed: Parsed): ParsedStreamEvent | null {
  const event = parsed['event'] as Parsed | undefined;

  if (event?.['type'] === 'content_block_delta') {
    const delta = event['delta'] as Parsed | undefined;
    if (delta?.['type'] === 'text_delta') {
      const text = delta['text'];
      return typeof text === 'string' && text ? { kind: 'text', text } : null;
    }
  }

  // Tool call start: stream_event > content_block_start with tool_use block
  if (event?.['type'] === 'content_block_start') {
    const block = event['content_block'] as Parsed | undefined;
    if (block?.['type'] === 'tool_use') {
      const toolId = block['id'];
      const toolName = block['name'];
      if (typeof toolId === 'string' && typeof toolName === 'string') {
        return { kind: 'tool_start', toolId, toolName };
      }
    }
  }

  return null;
}


/**
 * Tool call complete: assistant message containing tool_use content blocks
 */
function parseAssistantMessage(parsed: Parsed): ParsedStreamEvent | null {
  const message = parsed['message'] as Parsed | undefined;
  const content = message?.['content'] as unknown[] | undefined;
  if (!Array.isArray(content)) return null;

  const toolUse = content.find(
    (c): c is Parsed =>
      typeof c === 'object' &&
      c !== null &&
      (c as Parsed)['type'] === 'tool_use'
  );
  if (!toolUse) return null;

  const toolId = toolUse['id'];
  const toolName = toolUse['name'];
  const input = toolUse['input'];
  if (typeof toolId === 'string' && typeof toolName === 'string') {
    return { kind: 'tool_complete', toolId, toolName, input };
  }
  return null;
}

/**
 * Tool result: user message containing tool_result content blocks
 */
function parseUserMessage(parsed: Parsed): ParsedStreamEvent | null {
  const message = parsed['message'] as Parsed | undefined;
  const content = message?.['content'] as unknown[] | undefined;
  if (!Array.isArray(content)) return null;

  const toolResult = content.find(
    (c): c is Parsed =>
      typeof c === 'object' &&
      c !== null &&
      (c as Parsed)['type'] === 'tool_result'
  );
  if (!toolResult) return null;

  const toolId = toolResult['tool_use_id'];
  const rawContent = toolResult['content'];
  const isError = toolResult['is_error'];
  if (typeof toolId === 'string') {
    const contentStr =
      typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
    return {
      kind: 'tool_result',
      toolId,
      content: contentStr,
      isError: isError === true,
    };
  }
  return null;
}

/**
 * Response completion: result message emitted when a turn finishes
 */
function parseResultMessage(parsed: Parsed): ParsedStreamEvent | null {
  const result = parsed['result'];
  const sessionId = parsed['session_id'];
  const isError = parsed['is_error'];
  return {
    kind: 'result',
    result: typeof result === 'string' ? result : '',
    sessionId: typeof sessionId === 'string' ? sessionId : undefined,
    isError: isError === true,
  };
}

function parseControlRequest(parsed: Parsed): ParsedStreamEvent | null {
  const requestId = parsed['request_id'];
  const request = parsed['request'] as Parsed | undefined;
  if (typeof requestId !== 'string') return null;

  // can_use_tool: SDK escalated from hook "ask" decision
  switch (request?.['subtype']) {
    case 'can_use_tool': {
      const toolUseId = request['tool_use_id'];
      const toolName = request['tool_name'];
      const toolInput = request['input'];
      if (typeof toolUseId === 'string' && typeof toolName === 'string') {
        return {
          kind: 'can_use_tool',
          requestId,
          toolUseId,
          toolName,
          input: toolInput,
        };
      }
      return null;
    }

    // hook_callback: PreToolUse hook fired — respond directly with allow/deny
    case 'hook_callback': {
      const callbackId = request['callback_id'];
      const input = request['input'] as Parsed | undefined;
      const toolUseId = input?.['tool_use_id'];
      const toolName = input?.['tool_name'];
      const toolInput = input?.['tool_input'];
      if (typeof toolUseId === 'string' && typeof toolName === 'string') {
        return {
          kind: 'hook_callback',
          requestId,
          callbackId: typeof callbackId === 'string' ? callbackId : '',
          toolUseId,
          toolName,
          input: toolInput,
        };
      }
      return null;
    }
    default:
      return null;
  }
}

function parseInitMessage(parsed: Parsed): ParsedStreamEvent | null {
  if (parsed['subtype'] !== 'init') return null;

  const sessionId = parsed['session_id'];
  if (typeof sessionId === 'string') {
    return { kind: 'init', sessionId };
  }
  return null;
}
