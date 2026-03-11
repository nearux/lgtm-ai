import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateChatSessionFromExecution = vi.hoisted(() => vi.fn());
const mockMarkChatSessionAsUsed = vi.hoisted(() => vi.fn());
const processInstances = vi.hoisted(() => [] as MockClaudeProcess[]);

class MockClaudeProcess extends EventEmitter {
  sendInitialize = vi.fn();
  sendPermissionMode = vi.fn();
  sendPrompt = vi.fn();
  sendApprovalResponse = vi.fn();
  sendPlanApprovalResponse = vi.fn();
  abort = vi.fn();

  constructor(
    public readonly workingDir: string,
    public readonly options: Record<string, unknown> = {}
  ) {
    super();
    processInstances.push(this);
  }
}

vi.mock('./ClaudeProcess.js', () => ({
  ClaudeProcess: MockClaudeProcess,
}));

vi.mock('../chatSessions.js', () => ({
  createChatSessionFromExecution: mockCreateChatSessionFromExecution,
  markChatSessionAsUsed: mockMarkChatSessionAsUsed,
}));

const { ClaudeSessionManager } = await import('./ClaudeSessionManager.js');

describe('ClaudeSessionManager', () => {
  const ws = {
    readyState: 1,
    send: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    processInstances.length = 0;
    mockCreateChatSessionFromExecution.mockResolvedValue(undefined);
    mockMarkChatSessionAsUsed.mockResolvedValue(undefined);
  });

  it('persists a chat session when a new claude execution initializes with session id', async () => {
    const manager = new ClaudeSessionManager(ws as never);

    manager.execute('request-1', 'prompt', '/tmp/project', {
      executionMode: 'default',
    }, {
      projectId: 'project-1',
      prNumber: 45,
      scopeType: 'REVIEW',
      scopeTargetId: 'review-123',
      title: 'Validate review',
    });

    const proc = processInstances[0];
    expect(proc).toBeDefined();

    proc!.emit('init', 'claude-session-1');
    await Promise.resolve();

    expect(mockCreateChatSessionFromExecution).toHaveBeenCalledWith(
      {
        projectId: 'project-1',
        prNumber: 45,
        scopeType: 'REVIEW',
        scopeTargetId: 'review-123',
        title: 'Validate review',
      },
      'claude-session-1'
    );
  });

  it('does not persist a new chat session on done without init', async () => {
    const manager = new ClaudeSessionManager(ws as never);

    manager.execute(
      'request-4',
      'prompt',
      '/tmp/project',
      { executionMode: 'default' },
      {
        projectId: 'project-1',
        prNumber: 45,
        scopeType: 'REVIEW',
        scopeTargetId: 'review-456',
        title: 'Done should not persist',
      }
    );

    const proc = processInstances[0];
    expect(proc).toBeDefined();

    proc!.emit('done', 0, 'ok', 'claude-session-2');
    await Promise.resolve();

    expect(mockCreateChatSessionFromExecution).not.toHaveBeenCalled();
  });

  it('touches an existing chat session when resuming with a claude session id', () => {
    const manager = new ClaudeSessionManager(ws as never);

    manager.execute('request-2', 'prompt', '/tmp/project', {
      executionMode: 'default',
      sessionId: 'claude-session-1',
    });

    expect(mockMarkChatSessionAsUsed).toHaveBeenCalledWith('claude-session-1');
    expect(mockCreateChatSessionFromExecution).not.toHaveBeenCalled();
  });

  it('forwards init events from the claude process to websocket', () => {
    const manager = new ClaudeSessionManager(ws as never);

    manager.execute('request-3', 'prompt', '/tmp/project', {
      executionMode: 'default',
    });

    const proc = processInstances[0];
    expect(proc).toBeDefined();

    proc!.emit('init', 'claude-session-2');

    expect(ws.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'init',
        requestId: 'request-3',
        sessionId: 'claude-session-2',
      })
    );
  });
});
