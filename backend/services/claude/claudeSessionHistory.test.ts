import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { getClaudeSessionHistory } from './claudeSessionHistory.js';

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
              { type: 'tool_use', name: 'Read', input: { file_path: 'foo.ts' } },
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
        content: '[tool:Read] {\"file_path\":\"foo.ts\"}\nDone.',
        timestamp: '2026-03-11T00:00:02.000Z',
      },
    ]);
  });
});
