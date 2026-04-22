import { describe, it, expect } from 'vitest';
import { groupMessages } from './groupMessages';
import type { ClaudeMessage } from '../../../hooks/useClaudeWebSocket/types';

const tool = (
  id: string,
  toolId: string,
  toolName = 'Bash',
  extra: Partial<ClaudeMessage> = {}
): ClaudeMessage => ({
  id,
  type: 'tool',
  content: '{}',
  toolName,
  toolId,
  timestamp: new Date(),
  ...extra,
});

const toolResult = (
  id: string,
  toolId: string,
  content = 'ok',
  isError = false
): ClaudeMessage => ({
  id,
  type: 'tool_result',
  content,
  toolId,
  isError,
  timestamp: new Date(),
});

const text = (id: string, content = 'hello'): ClaudeMessage => ({
  id,
  type: 'text',
  content,
  timestamp: new Date(),
});

const user = (id: string, content = 'hi'): ClaudeMessage => ({
  id,
  type: 'user',
  content,
  timestamp: new Date(),
});

describe('groupMessages — chainPosition', () => {
  it('assigns "single" to a lone tool', () => {
    const result = groupMessages([tool('1', 't1')], false);
    const toolItem = result.find((i) => i.kind === 'tool')!;
    expect(toolItem.chainPosition).toBe('single');
  });

  it('assigns start/end to a two-tool chain', () => {
    const result = groupMessages([tool('1', 't1'), tool('2', 't2')], false);
    const tools = result.filter((i) => i.kind === 'tool');
    expect(tools[0].chainPosition).toBe('start');
    expect(tools[1].chainPosition).toBe('end');
  });

  it('assigns start/middle/end to a three-tool chain', () => {
    const result = groupMessages(
      [tool('1', 't1'), tool('2', 't2'), tool('3', 't3')],
      false
    );
    const tools = result.filter((i) => i.kind === 'tool');
    expect(tools.map((t) => t.chainPosition)).toEqual([
      'start',
      'middle',
      'end',
    ]);
  });

  it('breaks chain at text bubble', () => {
    const result = groupMessages(
      [tool('1', 't1'), text('2', 'some text'), tool('3', 't3')],
      false
    );
    const tools = result.filter((i) => i.kind === 'tool');
    expect(tools[0].chainPosition).toBe('single');
    expect(tools[1].chainPosition).toBe('single');
  });

  it('breaks chain at user bubble', () => {
    const result = groupMessages(
      [tool('1', 't1'), user('2'), tool('3', 't3')],
      false
    );
    const tools = result.filter((i) => i.kind === 'tool');
    expect(tools[0].chainPosition).toBe('single');
    expect(tools[1].chainPosition).toBe('single');
  });
});

describe('groupMessages — isRunning', () => {
  it('is true when tool has no result and connected', () => {
    const result = groupMessages([tool('1', 't1')], true);
    const toolItem = result.find((i) => i.kind === 'tool')!;
    expect(toolItem.isRunning).toBe(true);
  });

  it('is false when tool has a result', () => {
    const result = groupMessages(
      [tool('1', 't1'), toolResult('2', 't1')],
      true
    );
    const toolItem = result.find((i) => i.kind === 'tool')!;
    expect(toolItem.isRunning).toBe(false);
  });

  it('is false when disconnected even without result', () => {
    const result = groupMessages([tool('1', 't1')], false);
    const toolItem = result.find((i) => i.kind === 'tool')!;
    expect(toolItem.isRunning).toBe(false);
  });

  it('distinguishes running vs completed tools in the same list', () => {
    const result = groupMessages(
      [tool('1', 't1'), toolResult('2', 't1'), tool('3', 't2')],
      true
    );
    const tools = result.filter((i) => i.kind === 'tool');
    expect(tools[0].isRunning).toBe(false);
    expect(tools[0].result).toBe('ok');
    expect(tools[1].isRunning).toBe(true);
    expect(tools[1].result).toBeUndefined();
  });
});

describe('groupMessages — stderrChunks', () => {
  it('passes through stderrChunks from source message', () => {
    const result = groupMessages(
      [tool('1', 't1', 'Bash', { stderrChunks: ['a', 'b'] })],
      true
    );
    const toolItem = result.find((i) => i.kind === 'tool')!;
    expect(toolItem.stderrChunks).toEqual(['a', 'b']);
  });

  it('defaults stderrChunks to undefined when not set', () => {
    const result = groupMessages([tool('1', 't1')], true);
    const toolItem = result.find((i) => i.kind === 'tool')!;
    expect(toolItem.stderrChunks).toBeUndefined();
  });
});
