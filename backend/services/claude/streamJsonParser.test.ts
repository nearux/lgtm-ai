import { describe, it, expect } from 'vitest';
import { parseStreamJsonLine } from './streamJsonParser.js';

describe('parseStreamJsonLine', () => {
  describe('empty / whitespace input', () => {
    it('returns null for an empty string', () => {
      expect(parseStreamJsonLine('')).toBeNull();
    });

    it('returns null for a whitespace-only string', () => {
      expect(parseStreamJsonLine('   ')).toBeNull();
    });
  });

  describe('non-JSON input', () => {
    it('forwards non-JSON text as-is', () => {
      expect(parseStreamJsonLine('not json')).toEqual({
        kind: 'text',
        text: 'not json',
      });
    });
  });

  describe('stream_event with text_delta', () => {
    it('extracts text from a valid text_delta event', () => {
      const line = JSON.stringify({
        type: 'stream_event',
        event: {
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: 'Hello' },
        },
      });
      expect(parseStreamJsonLine(line)).toEqual({
        kind: 'text',
        text: 'Hello',
      });
    });

    it('returns null when text is an empty string', () => {
      const line = JSON.stringify({
        type: 'stream_event',
        event: {
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: '' },
        },
      });
      expect(parseStreamJsonLine(line)).toBeNull();
    });

    it('returns null when text field is missing', () => {
      const line = JSON.stringify({
        type: 'stream_event',
        event: {
          type: 'content_block_delta',
          delta: { type: 'text_delta' },
        },
      });
      expect(parseStreamJsonLine(line)).toBeNull();
    });
  });

  describe('stream_event with other delta types', () => {
    it('returns null for input_json_delta', () => {
      const line = JSON.stringify({
        type: 'stream_event',
        event: {
          type: 'content_block_delta',
          delta: { type: 'input_json_delta', partial_json: '{"key":' },
        },
      });
      expect(parseStreamJsonLine(line)).toBeNull();
    });
  });

  describe('stream_event content_block_start with tool_use', () => {
    it('returns tool_start for a tool_use content block', () => {
      const line = JSON.stringify({
        type: 'stream_event',
        event: {
          type: 'content_block_start',
          index: 1,
          content_block: {
            type: 'tool_use',
            id: 'toolu_01abc',
            name: 'Read',
            input: {},
          },
        },
      });
      expect(parseStreamJsonLine(line)).toEqual({
        kind: 'tool_start',
        toolId: 'toolu_01abc',
        toolName: 'Read',
      });
    });

    it('returns null for a text content block start', () => {
      const line = JSON.stringify({
        type: 'stream_event',
        event: {
          type: 'content_block_start',
          index: 0,
          content_block: { type: 'text', text: '' },
        },
      });
      expect(parseStreamJsonLine(line)).toBeNull();
    });

    it('returns null when tool_use block is missing id or name', () => {
      const line = JSON.stringify({
        type: 'stream_event',
        event: {
          type: 'content_block_start',
          index: 1,
          content_block: { type: 'tool_use', input: {} },
        },
      });
      expect(parseStreamJsonLine(line)).toBeNull();
    });
  });

  describe('assistant message with tool_use content', () => {
    it('returns tool_complete for an assistant message containing tool_use', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'toolu_01abc',
              name: 'Read',
              input: { file_path: '/some/file.ts' },
            },
          ],
        },
      });
      expect(parseStreamJsonLine(line)).toEqual({
        kind: 'tool_complete',
        toolId: 'toolu_01abc',
        toolName: 'Read',
        input: { file_path: '/some/file.ts' },
      });
    });

    it('returns null for an assistant message with only text content', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      });
      expect(parseStreamJsonLine(line)).toBeNull();
    });
  });

  describe('user message with tool_result content', () => {
    it('returns tool_result for a successful tool result', () => {
      const line = JSON.stringify({
        type: 'user',
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'toolu_01abc',
              content: 'file content here',
              is_error: false,
            },
          ],
        },
      });
      expect(parseStreamJsonLine(line)).toEqual({
        kind: 'tool_result',
        toolId: 'toolu_01abc',
        content: 'file content here',
        isError: false,
      });
    });

    it('returns tool_result with isError=true for an error result', () => {
      const line = JSON.stringify({
        type: 'user',
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'toolu_01abc',
              content: 'File does not exist.',
              is_error: true,
            },
          ],
        },
      });
      expect(parseStreamJsonLine(line)).toEqual({
        kind: 'tool_result',
        toolId: 'toolu_01abc',
        content: 'File does not exist.',
        isError: true,
      });
    });

    it('serializes non-string content as JSON', () => {
      const line = JSON.stringify({
        type: 'user',
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'toolu_01abc',
              content: [{ type: 'text', text: 'result' }],
              is_error: false,
            },
          ],
        },
      });
      const result = parseStreamJsonLine(line);
      expect(result).toMatchObject({
        kind: 'tool_result',
        toolId: 'toolu_01abc',
        isError: false,
      });
      expect(typeof (result as { content: string }).content).toBe('string');
    });

    it('returns null for a user message with no tool_result', () => {
      const line = JSON.stringify({
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'text', text: 'user input' }],
        },
      });
      expect(parseStreamJsonLine(line)).toBeNull();
    });
  });

  describe('result message', () => {
    it('returns result event for a success result message', () => {
      const line = JSON.stringify({
        type: 'result',
        subtype: 'success',
        cost_usd: 0.01,
        is_error: false,
        num_turns: 1,
        result: 'Task completed successfully.',
      });
      expect(parseStreamJsonLine(line)).toEqual({
        kind: 'result',
        result: 'Task completed successfully.',
        isError: false,
      });
    });

    it('returns result event with isError=true for an error result', () => {
      const line = JSON.stringify({
        type: 'result',
        subtype: 'error_during_execution',
        is_error: true,
        result: '',
      });
      expect(parseStreamJsonLine(line)).toEqual({
        kind: 'result',
        result: '',
        isError: true,
      });
    });

    it('returns result event with empty string when result field is missing', () => {
      const line = JSON.stringify({
        type: 'result',
        subtype: 'success',
        is_error: false,
      });
      expect(parseStreamJsonLine(line)).toEqual({
        kind: 'result',
        result: '',
        isError: false,
      });
    });
  });

  describe('init discovery', () => {
    it('returns init event for system/init payload with session_id', () => {
      const line = JSON.stringify({
        type: 'system',
        subtype: 'init',
        session_id: 'claude-session-early',
      });

      expect(parseStreamJsonLine(line)).toEqual({
        kind: 'init',
        sessionId: 'claude-session-early',
      });
    });

    it('returns null for non-init system payloads', () => {
      const line = JSON.stringify({
        type: 'system',
        subtype: 'hook_started',
        session_id: 'claude-session-early',
      });

      expect(parseStreamJsonLine(line)).toBeNull();
    });
  });
});
