import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockChatSessionRepository = vi.hoisted(() => ({
  create: vi.fn(),
  findManyByProjectAndPr: vi.fn(),
  findById: vi.fn(),
  markAsUsedByClaudeSessionId: vi.fn(),
}));

const mockProjectRepository = vi.hoisted(() => ({
  findWorkingDirectoryById: vi.fn(),
}));

const mockGetClaudeSessionHistory = vi.hoisted(() => vi.fn());

vi.mock('../repositories/chatSessionRepository.js', () => ({
  ...mockChatSessionRepository,
}));

vi.mock('../repositories/projectRepository.js', () => ({
  ...mockProjectRepository,
}));

vi.mock('./claude/claudeSessionHistory.js', () => ({
  getClaudeSessionHistory: mockGetClaudeSessionHistory,
}));

const {
  createChatSessionFromExecution,
  getChatSession,
  getChatSessionHistory,
  listChatSessions,
  markChatSessionAsUsed,
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
    mockChatSessionRepository.create.mockResolvedValue({
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

    expect(mockChatSessionRepository.create).toHaveBeenCalledWith({
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
    mockChatSessionRepository.findManyByProjectAndPr.mockResolvedValue([
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

    expect(mockChatSessionRepository.findManyByProjectAndPr).toHaveBeenCalledWith(
      'project-1',
      45,
      {}
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.scopeType).toBe('COMMENT');
  });

  it('filters sessions by scope type and target id', async () => {
    mockChatSessionRepository.findManyByProjectAndPr.mockResolvedValue([]);

    await listChatSessions('project-1', 45, {
      scopeType: 'REVIEW',
      scopeTargetId: 'review-123',
    });

    expect(mockChatSessionRepository.findManyByProjectAndPr).toHaveBeenCalledWith(
      'project-1',
      45,
      {
        scopeType: 'REVIEW',
        scopeTargetId: 'review-123',
      }
    );
  });

  it('marks chat session as used by claude session id', async () => {
    await markChatSessionAsUsed('claude-session-1');

    expect(
      mockChatSessionRepository.markAsUsedByClaudeSessionId
    ).toHaveBeenCalledWith('claude-session-1', now);
  });

  it('throws not found when session does not exist', async () => {
    mockChatSessionRepository.findById.mockResolvedValue(null);

    await expect(
      getChatSession('project-1', 45, 'session-1')
    ).rejects.toMatchObject({
      message: 'Chat session not found',
      statusCode: 404,
    });
  });

  it('throws not found when session does not belong to project/pr', async () => {
    mockChatSessionRepository.findById.mockResolvedValue({
      id: 'session-1',
      project_id: 'project-2',
      pr_number: 55,
      scope_type: 'REVIEW',
      scope_target_id: 'review-123',
      claude_session_id: 'claude-session-1',
      title: null,
      created_at: now,
      updated_at: now,
      last_used_at: now,
    });

    await expect(
      getChatSession('project-1', 45, 'session-1')
    ).rejects.toMatchObject({
      message: 'Chat session not found',
      statusCode: 404,
    });
  });

  it('returns chat session summary when session belongs to project/pr', async () => {
    mockChatSessionRepository.findById.mockResolvedValue({
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

    const result = await getChatSession('project-1', 45, 'session-1');

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

  it('returns chat session history using the project working directory', async () => {
    mockProjectRepository.findWorkingDirectoryById.mockResolvedValue('/tmp/project');
    mockChatSessionRepository.findById.mockResolvedValue({
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

    expect(mockProjectRepository.findWorkingDirectoryById).toHaveBeenCalledWith(
      'project-1'
    );
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
    mockProjectRepository.findWorkingDirectoryById.mockResolvedValue(null);

    await expect(
      getChatSessionHistory('project-1', 45, 'session-1')
    ).rejects.toMatchObject({
      message: 'Project not found',
      statusCode: 404,
    });
  });
});
