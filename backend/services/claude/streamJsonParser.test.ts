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
      expect(parseStreamJsonLine('not json')).toEqual({ text: 'not json' });
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
      expect(parseStreamJsonLine(line)).toEqual({ text: 'Hello' });
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

  describe('stream_event with other event types', () => {
    it('returns null for content_block_start event', () => {
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
  });

  describe('non-stream_event JSON types', () => {
    it('returns null for a result type message', () => {
      const line = JSON.stringify({
        type: 'result',
        subtype: 'success',
        result: 'done',
      });
      expect(parseStreamJsonLine(line)).toBeNull();
    });
  });
});
