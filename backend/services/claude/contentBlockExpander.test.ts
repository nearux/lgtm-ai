import { describe, expect, it } from 'vitest';
import { expandContentBlocks } from './contentBlockExpander.js';

const ctx = { role: 'assistant', timestamp: '2026-04-15T00:00:00.000Z' };
const userCtx = { role: 'user', timestamp: '2026-04-15T00:00:00.000Z' };

describe('expandContentBlocks', () => {
  it('returns empty array for undefined content', () => {
    expect(expandContentBlocks(undefined, ctx)).toEqual([]);
  });

  describe('string content', () => {
    it('returns a trimmed text entry', () => {
      expect(expandContentBlocks('  hello  ', ctx)).toEqual([
        { ...ctx, messageType: 'text', content: 'hello' },
      ]);
    });

    it('uses messageType "user" when role is user', () => {
      expect(expandContentBlocks('hi', userCtx)).toEqual([
        { ...userCtx, messageType: 'user', content: 'hi' },
      ]);
    });

    it('returns empty array for whitespace-only string', () => {
      expect(expandContentBlocks('   \n  ', ctx)).toEqual([]);
    });
  });

  describe('text block', () => {
    it('expands a text block to a text entry', () => {
      expect(
        expandContentBlocks([{ type: 'text', text: 'response' }], ctx)
      ).toEqual([{ ...ctx, messageType: 'text', content: 'response' }]);
    });
  });

  describe('tool_use block', () => {
    it('serializes tool input as JSON', () => {
      expect(
        expandContentBlocks(
          [
            {
              type: 'tool_use',
              name: 'Read',
              id: 'tool-1',
              input: { file_path: 'foo.ts' },
            },
          ],
          ctx
        )
      ).toEqual([
        {
          ...ctx,
          messageType: 'tool',
          content: '{\n  "file_path": "foo.ts"\n}',
          toolName: 'Read',
          toolId: 'tool-1',
        },
      ]);
    });

    it('handles missing input by serializing an empty object', () => {
      const [entry] = expandContentBlocks(
        [{ type: 'tool_use', name: 'Bash' }],
        ctx
      );
      expect(entry.content).toBe('{}');
      expect(entry.toolId).toBeUndefined();
    });
  });

  describe('tool_result block', () => {
    it('trims string content', () => {
      expect(
        expandContentBlocks(
          [
            {
              type: 'tool_result',
              tool_use_id: 'tool-1',
              content: '  output  ',
            },
          ],
          ctx
        )
      ).toEqual([
        {
          ...ctx,
          messageType: 'tool_result',
          content: 'output',
          toolId: 'tool-1',
          isError: undefined,
        },
      ]);
    });

    it('JSON-stringifies non-string content', () => {
      const [entry] = expandContentBlocks(
        [
          {
            type: 'tool_result',
            tool_use_id: 'tool-1',
            content: [{ type: 'text', text: 'nested' }],
          },
        ],
        ctx
      );
      expect(entry.content).toBe('[{"type":"text","text":"nested"}]');
    });

    it('preserves is_error when true', () => {
      const [entry] = expandContentBlocks(
        [
          {
            type: 'tool_result',
            tool_use_id: 'tool-1',
            content: 'oops',
            is_error: true,
          },
        ],
        ctx
      );
      expect(entry.isError).toBe(true);
    });
  });

  describe('invalid blocks', () => {
    it('skips blocks with unknown type', () => {
      expect(expandContentBlocks([{ type: 'mystery', value: 1 }], ctx)).toEqual(
        []
      );
    });

    it('skips text block missing the text field', () => {
      expect(expandContentBlocks([{ type: 'text' }], ctx)).toEqual([]);
    });

    it('skips tool_use block missing the name field', () => {
      expect(expandContentBlocks([{ type: 'tool_use', id: 'x' }], ctx)).toEqual(
        []
      );
    });
  });

  describe('multiple blocks', () => {
    it('expands a mix of blocks in order', () => {
      const result = expandContentBlocks(
        [
          { type: 'tool_use', name: 'Read', id: 't1', input: { path: 'a.ts' } },
          { type: 'text', text: 'Done.' },
        ],
        ctx
      );
      expect(result.map((e) => e.messageType)).toEqual(['tool', 'text']);
    });
  });
});
