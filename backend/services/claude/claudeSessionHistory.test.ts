import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  getClaudeSessionHistory,
  replaceFirstUserMessage,
} from './claudeSessionHistory.js';

describe('claudeSessionHistory', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await import('node:fs/promises').then(({ rm }) =>
          rm(dir, { recursive: true, force: true })
        );
      })
    );
    tempDirs.length = 0;
  });

  it('fetches history for a claude session id', async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'claude-history-'));
    tempDirs.push(rootDir);

    const projectDir = '/Users/kimyoungho/project/lgtm-ai';
    const projectTranscriptDir = path.join(
      rootDir,
      '-Users-kimyoungho-project-lgtm-ai'
    );
    await mkdir(projectTranscriptDir, { recursive: true });
    await writeFile(
      path.join(projectTranscriptDir, 'session-1.jsonl'),
      [
        JSON.stringify({
          type: 'user',
          sessionId: 'session-1',
          timestamp: '2026-03-11T00:00:00.000Z',
          message: { role: 'user', content: 'Validate this review' },
        }),
        JSON.stringify({
          type: 'assistant',
          sessionId: 'session-1',
          timestamp: '2026-03-11T00:00:02.000Z',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'This review is actionable.' }],
          },
        }),
      ].join('\n')
    );

    const result = await getClaudeSessionHistory(
      'session-1',
      projectDir,
      rootDir
    );

    expect(result).toEqual({
      claudeSessionId: 'session-1',
      entries: [
        {
          role: 'user',
          content: 'Validate this review',
          timestamp: '2026-03-11T00:00:00.000Z',
        },
        {
          role: 'assistant',
          content: 'This review is actionable.',
          timestamp: '2026-03-11T00:00:02.000Z',
        },
      ],
    });
  });

  it('maps missing transcripts to not found', async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'claude-history-'));
    tempDirs.push(rootDir);

    await expect(
      getClaudeSessionHistory('missing-session', '/tmp/project', rootDir)
    ).rejects.toMatchObject({
      message: 'Claude session transcript not found',
      statusCode: 404,
    });
  });

  it('applies command label substitution when command is provided', async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'claude-history-'));
    tempDirs.push(rootDir);

    const projectDir = '/tmp/project';
    const projectTranscriptDir = path.join(rootDir, '-tmp-project');
    await mkdir(projectTranscriptDir, { recursive: true });
    await writeFile(
      path.join(projectTranscriptDir, 'session-cmd.jsonl'),
      [
        JSON.stringify({
          type: 'user',
          sessionId: 'session-cmd',
          timestamp: '2026-03-11T00:00:00.000Z',
          message: { role: 'user', content: 'some long generated prompt' },
        }),
        JSON.stringify({
          type: 'assistant',
          sessionId: 'session-cmd',
          timestamp: '2026-03-11T00:00:02.000Z',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'Done.' }],
          },
        }),
      ].join('\n')
    );

    const result = await getClaudeSessionHistory(
      'session-cmd',
      projectDir,
      rootDir,
      'validate'
    );

    expect(result.entries[0].content).toBe('Validate this review');
  });

  it('skips non-chat events and preserves tool text when present', async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'claude-history-'));
    tempDirs.push(rootDir);

    const projectDir = '/tmp/project';
    const projectTranscriptDir = path.join(rootDir, '-tmp-project');
    await mkdir(projectTranscriptDir, { recursive: true });
    await writeFile(
      path.join(projectTranscriptDir, 'session-2.jsonl'),
      [
        JSON.stringify({
          type: 'queue-operation',
          timestamp: '2026-03-11T00:00:00.000Z',
        }),
        JSON.stringify({
          type: 'assistant',
          sessionId: 'session-2',
          timestamp: '2026-03-11T00:00:02.000Z',
          message: {
            role: 'assistant',
            content: [
              {
                type: 'tool_use',
                name: 'Read',
                input: { file_path: 'foo.ts' },
              },
              { type: 'text', text: 'Done.' },
            ],
          },
        }),
      ].join('\n')
    );

    const result = await getClaudeSessionHistory(
      'session-2',
      projectDir,
      rootDir
    );

    expect(result.entries).toEqual([
      {
        role: 'assistant',
        content: '[tool:Read] {"file_path":"foo.ts"}\nDone.',
        timestamp: '2026-03-11T00:00:02.000Z',
      },
    ]);
  });
});

describe('replaceFirstUserMessage', () => {
  const baseEntries = [
    {
      role: 'user',
      content: 'some long generated prompt',
      timestamp: '2026-03-11T00:00:00.000Z',
    },
    {
      role: 'assistant',
      content: 'Done.',
      timestamp: '2026-03-11T00:00:02.000Z',
    },
  ];

  it('returns entries unchanged when no command is provided', () => {
    const result = replaceFirstUserMessage(baseEntries);
    expect(result).toEqual(baseEntries);
  });

  it('replaces first user message with known command label', () => {
    const result = replaceFirstUserMessage(baseEntries, 'validate');
    expect(result[0].content).toBe('Validate this review');
    expect(result[1].content).toBe('Done.');
  });

  it('replaces first user message with explain label', () => {
    const result = replaceFirstUserMessage(baseEntries, 'explain');
    expect(result[0].content).toBe('Explain this review');
  });

  it('replaces first user message with fix label', () => {
    const result = replaceFirstUserMessage(baseEntries, 'fix');
    expect(result[0].content).toBe('Fix code based on this review');
  });

  it('uses customPrompt when command is custom', () => {
    const result = replaceFirstUserMessage(
      baseEntries,
      'custom',
      'My custom instruction'
    );
    expect(result[0].content).toBe('My custom instruction');
  });

  it('falls back to original content when command is custom and no customPrompt', () => {
    const result = replaceFirstUserMessage(baseEntries, 'custom');
    expect(result[0].content).toBe('some long generated prompt');
  });

  it('falls back to original content for unknown command', () => {
    const result = replaceFirstUserMessage(baseEntries, 'unknown-command');
    expect(result[0].content).toBe('some long generated prompt');
  });

  it('does not modify non-first or non-user entries', () => {
    const result = replaceFirstUserMessage(baseEntries, 'validate');
    expect(result[1]).toEqual(baseEntries[1]);
  });

  it('returns empty array unchanged', () => {
    const result = replaceFirstUserMessage([], 'validate');
    expect(result).toEqual([]);
  });
});
