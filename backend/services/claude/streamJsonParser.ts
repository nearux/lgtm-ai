/**
 * Parses a single stream-json line and extracts the text content to emit,
 * or returns null if the line should be skipped.
 *
 * Real-time text tokens arrive as:
 *   {"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}}
 */
export function parseStreamJsonLine(line: string): { text: string } | null {
  if (!line.trim()) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(line) as Record<string, unknown>;
  } catch {
    // Not valid JSON – forward as-is (e.g. early diagnostic output)
    return { text: line };
  }

  // Real-time token streaming: stream_event > content_block_delta > text_delta
  if (parsed['type'] === 'stream_event') {
    const event = parsed['event'] as Record<string, unknown> | undefined;
    if (event?.['type'] === 'content_block_delta') {
      const delta = event['delta'] as Record<string, unknown> | undefined;
      if (delta?.['type'] === 'text_delta') {
        const text = delta['text'];
        return typeof text === 'string' && text ? { text } : null;
      }
    }
  }

  return null;
}
