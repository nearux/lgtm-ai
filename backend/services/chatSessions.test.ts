import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Prisma, PrismaClient } from '@prisma/client';
import { clearDatabase, createTestDatabase } from '../test/prismaTestDb.js';

const mockGetClaudeSessionHistory = vi.fn();

let prisma: PrismaClient;
let cleanupDb: (() => Promise<void>) | null = null;
let chatSessionsService: typeof import('./chatSessions.js');

async function seedProject(
  overrides: Partial<Prisma.ProjectUncheckedCreateInput> = {}
) {
  const now = new Date();

  return prisma.project.create({
    data: {
      id: randomUUID(),
      name: 'LGTM AI',
      description: 'Code review helper',
      working_dir: '/tmp/project',
      created_at: now,
      updated_at: now,
      ...overrides,
    },
  });
}

async function seedChatSession(
  overrides: Partial<Prisma.ChatSessionUncheckedCreateInput> = {}
) {
  const now = new Date();

  return prisma.chatSession.create({
    data: {
      id: randomUUID(),
      project_id: 'project-1',
      pr_number: 45,
      scope_type: 'REVIEW',
      scope_target_id: 'review-123',
      claude_session_id: `claude-${randomUUID()}`,
      title: 'Validate review',
      created_at: now,
      updated_at: now,
      last_used_at: now,
      ...overrides,
    },
  });
}

beforeAll(async () => {
  vi.resetModules();

  const testDb = await createTestDatabase();
  prisma = testDb.prisma;
  cleanupDb = testDb.cleanup;

  vi.doMock('../prismaClient.js', () => ({ default: prisma }));
  vi.doMock('./claude/claudeSessionHistory.js', () => ({
    getClaudeSessionHistory: mockGetClaudeSessionHistory,
  }));

  chatSessionsService = await import('./chatSessions.js');
});

afterAll(async () => {
  if (cleanupDb) {
    await cleanupDb();
  }
});

beforeEach(async () => {
  vi.clearAllMocks();
  await clearDatabase(prisma);
});

describe('chatSessions service', () => {
  it('creates a chat session and persists it in sqlite', async () => {
    const result = await chatSessionsService.createChatSessionFromExecution(
      {
        projectId: 'project-1',
        prNumber: 45,
        scopeType: 'REVIEW',
        scopeTargetId: 'review-123',
        title: 'Validate review',
      },
      'claude-session-1'
    );

    const persisted = await prisma.chatSession.findUnique({
      where: { claude_session_id: 'claude-session-1' },
    });

    expect(persisted).not.toBeNull();
    expect(persisted?.project_id).toBe('project-1');
    expect(persisted?.pr_number).toBe(45);
    expect(persisted?.scope_type).toBe('REVIEW');
    expect(result.id).toBe(persisted?.id);
    expect(result.claudeSessionId).toBe('claude-session-1');
  });

  it('lists sessions sorted by last_used_at desc from sqlite data', async () => {
    const older = new Date('2026-03-10T00:00:00.000Z');
    const newer = new Date('2026-03-11T00:00:00.000Z');

    const first = await seedChatSession({
      project_id: 'project-1',
      pr_number: 45,
      last_used_at: older,
      updated_at: older,
      claude_session_id: 'claude-old',
    });
    const second = await seedChatSession({
      project_id: 'project-1',
      pr_number: 45,
      last_used_at: newer,
      updated_at: newer,
      claude_session_id: 'claude-new',
    });

    const result = await chatSessionsService.listChatSessions('project-1', 45);

    expect(result.map((item) => item.id)).toEqual([second.id, first.id]);
  });

  it('filters sessions by scope type and scope target id', async () => {
    await seedChatSession({
      project_id: 'project-1',
      pr_number: 45,
      scope_type: 'REVIEW',
      scope_target_id: 'review-123',
      claude_session_id: 'claude-review',
    });
    await seedChatSession({
      project_id: 'project-1',
      pr_number: 45,
      scope_type: 'COMMENT',
      scope_target_id: 'comment-55',
      claude_session_id: 'claude-comment',
    });

    const result = await chatSessionsService.listChatSessions('project-1', 45, {
      scopeType: 'REVIEW',
      scopeTargetId: 'review-123',
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.claudeSessionId).toBe('claude-review');
  });

  it('marks chat session as used and updates timestamps in sqlite', async () => {
    const oldTime = new Date('2026-03-01T00:00:00.000Z');

    await seedChatSession({
      project_id: 'project-1',
      pr_number: 45,
      claude_session_id: 'claude-to-update',
      updated_at: oldTime,
      last_used_at: oldTime,
    });

    await chatSessionsService.markChatSessionAsUsed('claude-to-update');

    const updated = await prisma.chatSession.findUnique({
      where: { claude_session_id: 'claude-to-update' },
    });

    expect(updated).not.toBeNull();
    expect(updated!.last_used_at.getTime()).toBeGreaterThan(oldTime.getTime());
    expect(updated!.updated_at.getTime()).toBeGreaterThan(oldTime.getTime());
  });

  it('throws not found when session does not exist', async () => {
    await expect(
      chatSessionsService.getChatSession('project-1', 45, 'missing-session')
    ).rejects.toMatchObject({
      message: 'Chat session not found',
      statusCode: 404,
    });
  });

  it('throws not found when session belongs to another project or pr', async () => {
    const session = await seedChatSession({
      project_id: 'project-2',
      pr_number: 99,
      claude_session_id: 'claude-foreign',
    });

    await expect(
      chatSessionsService.getChatSession('project-1', 45, session.id)
    ).rejects.toMatchObject({
      message: 'Chat session not found',
      statusCode: 404,
    });
  });

  it('returns chat session history using working directory from sqlite project data', async () => {
    const project = await seedProject({
      id: 'project-1',
      working_dir: '/tmp/project',
    });
    const session = await seedChatSession({
      project_id: project.id,
      pr_number: 45,
      claude_session_id: 'claude-session-1',
    });
    const now = new Date('2026-03-11T00:00:00.000Z').toISOString();

    mockGetClaudeSessionHistory.mockResolvedValue({
      claudeSessionId: 'claude-session-1',
      entries: [
        {
          role: 'assistant',
          content: 'Looks valid',
          timestamp: now,
        },
      ],
    });

    const result = await chatSessionsService.getChatSessionHistory(
      project.id,
      45,
      session.id
    );

    expect(mockGetClaudeSessionHistory).toHaveBeenCalledWith(
      'claude-session-1',
      '/tmp/project'
    );
    expect(result).toEqual({
      sessionId: session.id,
      claudeSessionId: 'claude-session-1',
      entries: [
        {
          role: 'assistant',
          content: 'Looks valid',
          timestamp: now,
        },
      ],
    });
  });

  it('throws not found when project does not exist for history lookup', async () => {
    const session = await seedChatSession({
      project_id: 'project-1',
      pr_number: 45,
      claude_session_id: 'claude-session-1',
    });

    await expect(
      chatSessionsService.getChatSessionHistory('project-1', 45, session.id)
    ).rejects.toMatchObject({
      message: 'Project not found',
      statusCode: 404,
    });
  });
});
