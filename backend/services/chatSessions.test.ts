import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  project: {
    findUnique: vi.fn(),
  },
  chatSession: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

const mockGetClaudeSessionHistory = vi.hoisted(() => vi.fn());

vi.mock('../prismaClient.js', () => ({
  default: mockPrisma,
}));

vi.mock('./claude/claudeSessionHistory.js', () => ({
  getClaudeSessionHistory: mockGetClaudeSessionHistory,
}));

const {
  createChatSessionFromExecution,
  getChatSession,
  getChatSessionHistory,
  listChatSessions,
  touchChatSession,
} = await import('./chatSessions.js');

describe('chatSessions service', () => {
  const now = new Date('2026-03-11T00:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a saved chat session from execution context and claude session id', async () => {
    mockPrisma.chatSession.create.mockResolvedValue({
      id: 'session-1',
      project_id: 'project-1',
      pr_number: 45,
      scope_type: 'REVIEW',
      scope_target_id: 'review-123',
      claude_session_id: 'claude-session-1',
      title: 'Validate review',
      created_at: now,
      updated_at: now,
      last_used_at: now,
    });

    const result = await createChatSessionFromExecution(
      {
        projectId: 'project-1',
        prNumber: 45,
        scopeType: 'REVIEW',
        scopeTargetId: 'review-123',
        title: 'Validate review',
      },
      'claude-session-1'
    );

    expect(mockPrisma.chatSession.create).toHaveBeenCalledWith({
      data: {
        project_id: 'project-1',
        pr_number: 45,
        scope_type: 'REVIEW',
        scope_target_id: 'review-123',
        claude_session_id: 'claude-session-1',
        title: 'Validate review',
        created_at: now,
        updated_at: now,
        last_used_at: now,
        id: expect.any(String),
      },
    });
    expect(result).toEqual({
      id: 'session-1',
      projectId: 'project-1',
      prNumber: 45,
      scopeType: 'REVIEW',
      scopeTargetId: 'review-123',
      claudeSessionId: 'claude-session-1',
      title: 'Validate review',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      lastUsedAt: now.toISOString(),
    });
  });

  it('lists sessions for a project and pr sorted by last_used_at desc', async () => {
    mockPrisma.chatSession.findMany.mockResolvedValue([
      {
        id: 'session-2',
        project_id: 'project-1',
        pr_number: 45,
        scope_type: 'COMMENT',
        scope_target_id: 'comment-5',
        claude_session_id: 'claude-session-2',
        title: null,
        created_at: now,
        updated_at: now,
        last_used_at: now,
      },
    ]);

    const result = await listChatSessions('project-1', 45);

    expect(mockPrisma.chatSession.findMany).toHaveBeenCalledWith({
      where: {
        project_id: 'project-1',
        pr_number: 45,
      },
      orderBy: {
        last_used_at: 'desc',
      },
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.scopeType).toBe('COMMENT');
  });

  it('filters sessions by scope type and target id', async () => {
    mockPrisma.chatSession.findMany.mockResolvedValue([]);

    await listChatSessions('project-1', 45, {
      scopeType: 'REVIEW',
      scopeTargetId: 'review-123',
    });

    expect(mockPrisma.chatSession.findMany).toHaveBeenCalledWith({
      where: {
        project_id: 'project-1',
        pr_number: 45,
        scope_type: 'REVIEW',
        scope_target_id: 'review-123',
      },
      orderBy: {
        last_used_at: 'desc',
      },
    });
  });

  it('touches last_used_at when resuming a saved session', async () => {
    await touchChatSession('session-1');

    expect(mockPrisma.chatSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: {
        last_used_at: now,
        updated_at: now,
      },
    });
  });

  it('throws not found when session does not belong to project/pr', async () => {
    mockPrisma.chatSession.findUnique.mockResolvedValue(null);

    await expect(
      getChatSession('project-1', 45, 'session-1')
    ).rejects.toMatchObject({
      message: 'Chat session not found',
      statusCode: 404,
    });
  });

  it('returns chat session history using the project working directory', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: 'project-1',
      working_dir: '/tmp/project',
    });
    mockPrisma.chatSession.findUnique.mockResolvedValue({
      id: 'session-1',
      project_id: 'project-1',
      pr_number: 45,
      scope_type: 'REVIEW',
      scope_target_id: 'review-123',
      claude_session_id: 'claude-session-1',
      title: 'Validate review',
      created_at: now,
      updated_at: now,
      last_used_at: now,
    });
    mockGetClaudeSessionHistory.mockResolvedValue({
      claudeSessionId: 'claude-session-1',
      entries: [
        {
          role: 'assistant',
          content: 'Looks valid',
          timestamp: now.toISOString(),
        },
      ],
    });

    const result = await getChatSessionHistory('project-1', 45, 'session-1');

    expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: 'project-1' },
      select: { id: true, working_dir: true },
    });
    expect(mockGetClaudeSessionHistory).toHaveBeenCalledWith(
      'claude-session-1',
      '/tmp/project'
    );
    expect(result).toEqual({
      sessionId: 'session-1',
      claudeSessionId: 'claude-session-1',
      entries: [
        {
          role: 'assistant',
          content: 'Looks valid',
          timestamp: now.toISOString(),
        },
      ],
    });
  });

  it('throws not found when the project does not exist for history lookup', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);

    await expect(
      getChatSessionHistory('project-1', 45, 'session-1')
    ).rejects.toMatchObject({
      message: 'Project not found',
      statusCode: 404,
    });
  });
});
