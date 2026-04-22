import { describe, it, expect } from 'vitest';
import { parseToolInput } from './parseToolInput';

describe('parseToolInput', () => {
  it('parses Bash input', () => {
    const input = JSON.stringify({
      command: 'ls -la',
      description: 'List files',
    });
    const parsed = parseToolInput('Bash', input);
    expect(parsed).toEqual({
      kind: 'bash',
      command: 'ls -la',
      description: 'List files',
    });
  });

  it('parses Bash input without description', () => {
    const parsed = parseToolInput('Bash', JSON.stringify({ command: 'pwd' }));
    expect(parsed).toEqual({
      kind: 'bash',
      command: 'pwd',
      description: undefined,
    });
  });

  it('parses Read input with basename', () => {
    const parsed = parseToolInput(
      'Read',
      JSON.stringify({ file_path: '/a/b/c.ts' })
    );
    expect(parsed).toEqual({
      kind: 'read',
      filePath: '/a/b/c.ts',
      fileName: 'c.ts',
    });
  });

  it('parses Edit input with basename', () => {
    const parsed = parseToolInput(
      'Edit',
      JSON.stringify({
        file_path: '/a/b.ts',
        old_string: 'x',
        new_string: 'y',
      })
    );
    expect(parsed).toEqual({
      kind: 'edit',
      filePath: '/a/b.ts',
      fileName: 'b.ts',
    });
  });

  it('parses Write input with basename', () => {
    const parsed = parseToolInput(
      'Write',
      JSON.stringify({ file_path: '/a/b.ts', content: '…' })
    );
    expect(parsed).toEqual({
      kind: 'write',
      filePath: '/a/b.ts',
      fileName: 'b.ts',
    });
  });

  it('falls back to the full path when basename cannot be derived', () => {
    const parsed = parseToolInput('Read', JSON.stringify({ file_path: '/' }));
    expect(parsed).toEqual({ kind: 'read', filePath: '/', fileName: '/' });
  });

  it('parses Grep input with path', () => {
    const parsed = parseToolInput(
      'Grep',
      JSON.stringify({ pattern: 'foo', path: 'src' })
    );
    expect(parsed).toEqual({
      kind: 'grep',
      pattern: 'foo',
      path: 'src',
      glob: undefined,
    });
  });

  it('parses Grep input with glob', () => {
    const parsed = parseToolInput(
      'Grep',
      JSON.stringify({ pattern: 'foo', glob: '*.ts' })
    );
    expect(parsed).toEqual({
      kind: 'grep',
      pattern: 'foo',
      path: undefined,
      glob: '*.ts',
    });
  });

  it('parses WebFetch input', () => {
    const parsed = parseToolInput(
      'WebFetch',
      JSON.stringify({ url: 'https://example.com/path?q=1' })
    );
    expect(parsed).toEqual({
      kind: 'webfetch',
      url: 'https://example.com/path?q=1',
      hostname: 'example.com',
    });
  });

  it('returns generic for unknown tool', () => {
    const parsed = parseToolInput('UnknownTool', JSON.stringify({ foo: 1 }));
    expect(parsed).toEqual({ kind: 'generic', raw: '{\n  "foo": 1\n}' });
  });

  it('returns generic when input is invalid JSON', () => {
    const parsed = parseToolInput('Bash', 'not-json');
    expect(parsed).toEqual({ kind: 'generic', raw: 'not-json' });
  });

  it('returns generic when shape is wrong', () => {
    const parsed = parseToolInput('Bash', JSON.stringify({ not_command: 1 }));
    expect(parsed).toEqual({
      kind: 'generic',
      raw: '{\n  "not_command": 1\n}',
    });
  });
});
