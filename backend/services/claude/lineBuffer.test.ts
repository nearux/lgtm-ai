import { describe, it, expect, beforeEach } from 'vitest';
import { LineBuffer } from './lineBuffer.js';

describe('LineBuffer', () => {
  let buf: LineBuffer;

  beforeEach(() => {
    buf = new LineBuffer();
  });

  describe('push', () => {
    it('returns an empty array when the chunk has no newline', () => {
      expect(buf.push('hello')).toEqual([]);
    });

    it('returns a single complete line when chunk ends with a newline', () => {
      expect(buf.push('hello\n')).toEqual(['hello']);
    });

    it('returns multiple lines when chunk contains multiple newlines', () => {
      expect(buf.push('a\nb\nc\n')).toEqual(['a', 'b', 'c']);
    });

    it('retains trailing incomplete fragment across calls', () => {
      expect(buf.push('hel')).toEqual([]);
      expect(buf.push('lo\nworld')).toEqual(['hello']);
    });

    it('handles an empty string chunk without error', () => {
      expect(buf.push('')).toEqual([]);
    });

    it('returns an empty string as a line when chunk is just a newline', () => {
      expect(buf.push('\n')).toEqual(['']);
    });
  });

  describe('flush', () => {
    it('returns an empty string when buffer is empty', () => {
      expect(buf.flush()).toBe('');
    });

    it('returns the remaining incomplete fragment', () => {
      buf.push('incomplete');
      expect(buf.flush()).toBe('incomplete');
    });

    it('clears the buffer after flushing', () => {
      buf.push('data');
      buf.flush();
      expect(buf.flush()).toBe('');
    });
  });
});
