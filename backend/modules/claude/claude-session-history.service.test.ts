import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ClaudeSessionHistoryService } from './claude-session-history.service.js';

describe('claudeSessionHistory', () => {
  const service = new ClaudeSessionHistoryService();
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true }))
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

    const result = await service.getClaudeSessionHistory({
      claudeSessionId: 'session-1',
      workingDir: projectDir,
      transcriptsRoot: rootDir,
    });

    expect(result).toEqual({
      claudeSessionId: 'session-1',
      entries: [
        {
          role: 'user',
          messageType: 'user',
          content: 'Validate this review',
          timestamp: '2026-03-11T00:00:00.000Z',
        },
        {
          role: 'assistant',
          messageType: 'text',
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
      service.getClaudeSessionHistory({
        claudeSessionId: 'missing-session',
        workingDir: '/tmp/project',
        transcriptsRoot: rootDir,
      })
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

    const result = await service.getClaudeSessionHistory({
      claudeSessionId: 'session-cmd',
      workingDir: projectDir,
      transcriptsRoot: rootDir,
      command: 'validate',
    });

    expect(result.entries[0].content).toBe('Validate this review');
  });

  it('filters out non user/assistant transcript lines', async () => {
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
            content: [{ type: 'text', text: 'Done.' }],
          },
        }),
      ].join('\n')
    );

    const result = await service.getClaudeSessionHistory({
      claudeSessionId: 'session-2',
      workingDir: projectDir,
      transcriptsRoot: rootDir,
    });

    expect(result.entries).toEqual([
      {
        role: 'assistant',
        messageType: 'text',
        content: 'Done.',
        timestamp: '2026-03-11T00:00:02.000Z',
      },
    ]);
  });
});

describe('replaceFirstUserMessage', () => {
  const service = new ClaudeSessionHistoryService();
  const baseEntries: Parameters<typeof service.replaceFirstUserMessage>[0] = [
    {
      role: 'user',
      messageType: 'user',
      content: 'some long generated prompt',
      timestamp: '2026-03-11T00:00:00.000Z',
    },
    {
      role: 'assistant',
      messageType: 'text',
      content: 'Done.',
      timestamp: '2026-03-11T00:00:02.000Z',
    },
  ];

  it('returns entries unchanged when no command is provided', () => {
    const result = service.replaceFirstUserMessage(baseEntries);
    expect(result).toEqual(baseEntries);
  });

  it.each([
    ['validate', undefined, 'Validate this review'],
    ['explain', undefined, 'Explain this review'],
    ['fix', undefined, 'Fix code based on this review'],
    ['custom', 'My custom instruction', 'My custom instruction'],
  ])(
    'replaces the first user message for command %s',
    (command, customPrompt, expectedContent) => {
      const result = service.replaceFirstUserMessage(
        baseEntries,
        command,
        customPrompt
      );

      expect(result[0].content).toBe(expectedContent);
      expect(result[1]).toEqual(baseEntries[1]);
    }
  );

  it('falls back to original content when command is custom and no customPrompt', () => {
    const result = service.replaceFirstUserMessage(baseEntries, 'custom');
    expect(result[0].content).toBe('some long generated prompt');
  });

  it('falls back to original content for unknown command', () => {
    const result = service.replaceFirstUserMessage(
      baseEntries,
      'unknown-command'
    );
    expect(result[0].content).toBe('some long generated prompt');
  });

  it('returns empty array unchanged', () => {
    const result = service.replaceFirstUserMessage([], 'validate');
    expect(result).toEqual([]);
  });
});
