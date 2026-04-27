/* eslint-disable @typescript-eslint/unbound-method */
import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClaudeSessionManager } from './claude-session-manager.js';
import type { ChatSessionsService } from '../projects/chat-sessions.service.js';
import type { GitService } from '../projects/git.service.js';

const processInstances: MockClaudeProcess[] = [];

class MockClaudeProcess extends EventEmitter {
  sendInitialize = vi.fn();
  sendPermissionMode = vi.fn();
  sendPrompt = vi.fn();
  sendApprovalResponse = vi.fn();
  sendPlanApprovalResponse = vi.fn();
  abort = vi.fn();

  constructor(
    public readonly workingDir: string,
    public readonly options: Record<string, unknown> = {},
    public readonly systemPrompt?: string
  ) {
    super();
    processInstances.push(this);
  }
}

vi.mock('./claude-process.js', () => ({
  ClaudeProcess: class extends EventEmitter {
    sendInitialize = vi.fn();
    sendPermissionMode = vi.fn();
    sendPrompt = vi.fn();
    sendApprovalResponse = vi.fn();
    sendPlanApprovalResponse = vi.fn();
    abort = vi.fn();

    constructor(
      public readonly workingDir: string,
      public readonly options: Record<string, unknown> = {},
      public readonly systemPrompt?: string
    ) {
      super();
      processInstances.push(this as unknown as MockClaudeProcess);
    }
  },
}));

const chatSessionsService = {
  createChatSessionFromExecution: vi.fn(),
  markChatSessionAsUsed: vi.fn(),
} as unknown as ChatSessionsService;

const gitService = {
  getFileChanges: vi.fn(),
} as unknown as GitService;

describe('ClaudeSessionManager', () => {
  const ws = {
    readyState: 1,
    send: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    processInstances.length = 0;
    vi.mocked(
      chatSessionsService.createChatSessionFromExecution
    ).mockResolvedValue(undefined as never);
    vi.mocked(chatSessionsService.markChatSessionAsUsed).mockResolvedValue(
      undefined
    );
    vi.mocked(gitService.getFileChanges).mockResolvedValue({
      files: [],
    } as never);
  });

  it('persists a chat session when a new claude execution initializes with session id', async () => {
    // given
    const manager = new ClaudeSessionManager(
      ws as never,
      chatSessionsService,
      gitService
    );

    manager.execute({
      requestId: 'request-1',
      prompt: 'prompt',
      workingDir: '/tmp/project',
      options: { executionMode: 'default' },
      chatContext: {
        projectId: 'project-1',
        targetType: 'PR' as const,
        targetNumber: 45,
        scopeType: 'REVIEW',
        scopeTargetId: 'review-123',
        title: 'Validate review',
      },
    });

    // when
    const proc = processInstances[0];
    expect(proc).toBeDefined();
    proc.emit('init', 'claude-session-1');
    await Promise.resolve();

    // then
    expect(
      chatSessionsService.createChatSessionFromExecution
    ).toHaveBeenCalledWith(
      {
        projectId: 'project-1',
        targetType: 'PR',
        targetNumber: 45,
        scopeType: 'REVIEW',
        scopeTargetId: 'review-123',
        title: 'Validate review',
      },
      'claude-session-1',
      undefined
    );
  });

  it('passes commandMeta to createChatSessionFromExecution when provided', async () => {
    // given
    const manager = new ClaudeSessionManager(
      ws as never,
      chatSessionsService,
      gitService
    );
    manager.execute({
      requestId: 'request-meta',
      prompt: 'some prompt',
      workingDir: '/tmp/project',
      options: { executionMode: 'default' },
      chatContext: {
        projectId: 'p',
        targetType: 'PR' as const,
        targetNumber: 1,
        scopeType: 'REVIEW',
        scopeTargetId: 'r',
      },
      commandMeta: { command: 'validate', customPrompt: undefined },
    });

    // when
    processInstances[0].emit('init', 'claude-session-meta');
    await Promise.resolve();

    // then
    expect(
      chatSessionsService.createChatSessionFromExecution
    ).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p' }),
      'claude-session-meta',
      { command: 'validate', customPrompt: undefined }
    );
  });

  it('does not persist a new chat session on done without init', async () => {
    // given
    const manager = new ClaudeSessionManager(
      ws as never,
      chatSessionsService,
      gitService
    );

    manager.execute({
      requestId: 'request-4',
      prompt: 'prompt',
      workingDir: '/tmp/project',
      options: { executionMode: 'default' },
      chatContext: {
        projectId: 'project-1',
        targetType: 'PR' as const,
        targetNumber: 45,
        scopeType: 'REVIEW',
        scopeTargetId: 'review-456',
        title: 'Done should not persist',
      },
    });

    // when
    const proc = processInstances[0];
    expect(proc).toBeDefined();
    proc.emit('done', 0, 'ok', 'claude-session-2');
    await Promise.resolve();

    // then
    expect(
      chatSessionsService.createChatSessionFromExecution
    ).not.toHaveBeenCalled();
  });

  it('touches an existing chat session when resuming with a claude session id', () => {
    // given
    const manager = new ClaudeSessionManager(
      ws as never,
      chatSessionsService,
      gitService
    );

    // when
    manager.execute({
      requestId: 'request-2',
      prompt: 'prompt',
      workingDir: '/tmp/project',
      options: {
        executionMode: 'default',
        sessionId: 'claude-session-1',
      },
    });

    // then
    expect(chatSessionsService.markChatSessionAsUsed).toHaveBeenCalledWith(
      'claude-session-1'
    );
    expect(
      chatSessionsService.createChatSessionFromExecution
    ).not.toHaveBeenCalled();
  });

  it('passes systemPrompt to ClaudeProcess when provided', () => {
    // given
    const manager = new ClaudeSessionManager(
      ws as never,
      chatSessionsService,
      gitService
    );

    // when
    manager.execute({
      requestId: 'request-sp',
      prompt: 'some prompt',
      workingDir: '/tmp/project',
      options: { executionMode: 'default' },
      systemPrompt: 'You are a code review assistant.',
    });

    // then
    const proc = processInstances[0];
    expect(proc).toBeDefined();
    expect(proc.systemPrompt).toBe('You are a code review assistant.');
  });

  it('leaves systemPrompt undefined when not provided', () => {
    // given
    const manager = new ClaudeSessionManager(
      ws as never,
      chatSessionsService,
      gitService
    );

    // when
    manager.execute({
      requestId: 'request-no-sp',
      prompt: 'prompt',
      workingDir: '/tmp/project',
    });

    // then
    const proc = processInstances[0];
    expect(proc.systemPrompt).toBeUndefined();
  });

  it('forwards init events from the claude process to websocket', () => {
    // given
    const manager = new ClaudeSessionManager(
      ws as never,
      chatSessionsService,
      gitService
    );

    manager.execute({
      requestId: 'request-3',
      prompt: 'prompt',
      workingDir: '/tmp/project',
      options: { executionMode: 'default' },
    });

    // when
    const proc = processInstances[0];
    expect(proc).toBeDefined();
    proc.emit('init', 'claude-session-2');

    // then
    expect(ws.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'init',
        requestId: 'request-3',
        sessionId: 'claude-session-2',
      })
    );
  });
});
