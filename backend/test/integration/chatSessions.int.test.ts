import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { Prisma, PrismaClient } from '@prisma/client';
import { clearDatabase, createTestDatabase } from '../prismaTestDb.js';

const mockGetClaudeSessionHistory = vi.fn();

let prisma: PrismaClient;
let cleanupDb: (() => Promise<void>) | null = null;
let createApp: typeof import('../../app.js').createApp;
let server: Server | null = null;
let baseUrl = '';

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
      target_type: 'PR',
      target_number: 45,
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

  vi.doMock('../../database/prismaClient.js', () => ({ default: prisma }));
  vi.doMock('../../modules/claude/claude-session-history.service.js', () => {
    class ClaudeSessionHistoryService {
      getClaudeSessionHistory = mockGetClaudeSessionHistory;
    }
    return { ClaudeSessionHistoryService };
  });

  ({ createApp } = await import('../../app.js'));
  const app = await createApp({ enableSwagger: false });
  server = createServer(app);

  await new Promise<void>((resolve) => {
    server!.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start test server');
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()));
    });
  }
  if (cleanupDb) {
    await cleanupDb();
  }
});

beforeEach(async () => {
  vi.clearAllMocks();
  await clearDatabase(prisma);
});

describe('chat sessions REST integration', () => {
  it('lists PR-scoped chat sessions when scopeType is omitted', async () => {
    // given
    const project = await seedProject();
    const older = new Date('2026-03-10T00:00:00.000Z');
    const newer = new Date('2026-03-11T00:00:00.000Z');

    const prSession = await seedChatSession({
      project_id: project.id,
      target_type: 'PR',
      target_number: 45,
      scope_type: 'PR',
      scope_target_id: '',
      claude_session_id: 'claude-pr',
      updated_at: newer,
      last_used_at: newer,
    });
    await seedChatSession({
      project_id: project.id,
      target_type: 'PR',
      target_number: 45,
      scope_type: 'REVIEW',
      scope_target_id: 'review-123',
      claude_session_id: 'claude-review',
      updated_at: older,
      last_used_at: older,
    });

    // when
    const response = await fetch(
      `${baseUrl}/api/projects/${project.id}/prs/45/chat-sessions`
    );

    // then
    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string }[];
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(prSession.id);
  });

  it('filters PR chat sessions by COMMENT scopeType and scopeTargetId', async () => {
    // given
    const project = await seedProject();
    const now = new Date();

    await seedChatSession({
      project_id: project.id,
      target_type: 'PR',
      target_number: 45,
      scope_type: 'COMMENT',
      scope_target_id: 'comment-10',
      claude_session_id: 'claude-c10',
      updated_at: now,
      last_used_at: now,
    });
    const targetSession = await seedChatSession({
      project_id: project.id,
      target_type: 'PR',
      target_number: 45,
      scope_type: 'COMMENT',
      scope_target_id: 'comment-55',
      claude_session_id: 'claude-c55',
      updated_at: now,
      last_used_at: now,
    });

    // when
    const response = await fetch(
      `${baseUrl}/api/projects/${project.id}/prs/45/chat-sessions` +
        '?scopeType=COMMENT&scopeTargetId=comment-55'
    );

    // then
    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string }[];
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(targetSession.id);
  });

  it('returns 400 when scopeType is REVIEW without scopeTargetId for PR', async () => {
    // given
    const project = await seedProject();

    // when
    const response = await fetch(
      `${baseUrl}/api/projects/${project.id}/prs/45/chat-sessions?scopeType=REVIEW`
    );

    // then
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: 'scopeTargetId is required when scopeType is REVIEW or COMMENT',
    });
  });

  it('returns 400 when scopeType is ISSUE for PR chat sessions', async () => {
    // given
    const project = await seedProject();

    // when
    const response = await fetch(
      `${baseUrl}/api/projects/${project.id}/prs/45/chat-sessions?scopeType=ISSUE`
    );

    // then
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: 'Invalid option: expected one of "PR"|"REVIEW"|"COMMENT"',
    });
  });

  it('lists issue-scoped chat sessions when scopeType is omitted', async () => {
    // given
    const project = await seedProject();
    const now = new Date();

    const issueSession = await seedChatSession({
      project_id: project.id,
      target_type: 'ISSUE',
      target_number: 10,
      scope_type: 'ISSUE',
      scope_target_id: '',
      claude_session_id: 'claude-issue',
      updated_at: now,
      last_used_at: now,
    });
    await seedChatSession({
      project_id: project.id,
      target_type: 'ISSUE',
      target_number: 10,
      scope_type: 'COMMENT',
      scope_target_id: 'comment-77',
      claude_session_id: 'claude-comment',
      updated_at: now,
      last_used_at: now,
    });

    // when
    const response = await fetch(
      `${baseUrl}/api/projects/${project.id}/issues/10/chat-sessions`
    );

    // then
    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string }[];
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(issueSession.id);
  });

  it('returns 400 when scopeType is COMMENT without scopeTargetId for issue', async () => {
    // given
    const project = await seedProject();

    // when
    const response = await fetch(
      `${baseUrl}/api/projects/${project.id}/issues/10/chat-sessions?scopeType=COMMENT`
    );

    // then
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: 'scopeTargetId is required when scopeType is COMMENT',
    });
  });

  it('returns 400 when scopeType is REVIEW for issue chat sessions', async () => {
    // given
    const project = await seedProject();

    // when
    const response = await fetch(
      `${baseUrl}/api/projects/${project.id}/issues/10/chat-sessions?scopeType=REVIEW`
    );

    // then
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: 'Invalid option: expected one of "ISSUE"|"COMMENT"',
    });
  });

  it('returns chat session history and enforces project/pr ownership', async () => {
    // given
    const project = await seedProject({ working_dir: '/tmp/project' });
    const session = await seedChatSession({
      id: 'session-1',
      project_id: project.id,
      target_type: 'PR',
      target_number: 45,
      claude_session_id: 'claude-session-1',
    });

    // when / then
    mockGetClaudeSessionHistory.mockResolvedValue({
      claudeSessionId: 'claude-session-1',
      entries: [
        {
          role: 'assistant',
          content: 'Looks good',
          timestamp: '2026-03-11T00:00:00.000Z',
        },
      ],
    });

    const okResponse = await fetch(
      `${baseUrl}/api/projects/${project.id}/prs/45/chat-sessions/${session.id}/history`
    );
    expect(okResponse.status).toBe(200);
    await expect(okResponse.json()).resolves.toMatchObject({
      sessionId: session.id,
      claudeSessionId: 'claude-session-1',
      entries: [{ role: 'assistant', content: 'Looks good' }],
    });

    const notFoundResponse = await fetch(
      `${baseUrl}/api/projects/${project.id}/prs/46/chat-sessions/${session.id}/history`
    );
    expect(notFoundResponse.status).toBe(404);
    await expect(notFoundResponse.json()).resolves.toMatchObject({
      message: 'Chat session not found',
    });
  });
});
