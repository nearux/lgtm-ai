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
  it('lists chat sessions for PR and supports scope filters', async () => {
    const project = await seedProject();
    const older = new Date('2026-03-10T00:00:00.000Z');
    const newer = new Date('2026-03-11T00:00:00.000Z');

    const oldSession = await seedChatSession({
      project_id: project.id,
      pr_number: 45,
      scope_type: 'REVIEW',
      scope_target_id: 'review-123',
      claude_session_id: 'claude-old',
      updated_at: older,
      last_used_at: older,
    });
    const newSession = await seedChatSession({
      project_id: project.id,
      pr_number: 45,
      scope_type: 'COMMENT',
      scope_target_id: 'comment-55',
      claude_session_id: 'claude-new',
      updated_at: newer,
      last_used_at: newer,
    });

    const listResponse = await fetch(
      `${baseUrl}/api/projects/${project.id}/prs/45/chat-sessions`
    );
    expect(listResponse.status).toBe(200);
    const listBody = (await listResponse.json()) as { id: string }[];
    expect(listBody.map((item: { id: string }) => item.id)).toEqual([
      newSession.id,
      oldSession.id,
    ]);

    const filteredResponse = await fetch(
      `${baseUrl}/api/projects/${project.id}/prs/45/chat-sessions` +
        '?scopeType=COMMENT&scopeTargetId=comment-55'
    );
    expect(filteredResponse.status).toBe(200);
    const filteredBody = (await filteredResponse.json()) as { id: string }[];
    expect(filteredBody).toHaveLength(1);
    expect(filteredBody[0].id).toBe(newSession.id);
  });

  it('returns 400 when scopeType and scopeTargetId are partially provided', async () => {
    const project = await seedProject();

    const response = await fetch(
      `${baseUrl}/api/projects/${project.id}/prs/45/chat-sessions?scopeType=REVIEW`
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: 'scopeType and scopeTargetId must be provided together',
    });
  });

  it('returns chat session history and enforces project/pr ownership', async () => {
    const project = await seedProject({ working_dir: '/tmp/project' });
    const session = await seedChatSession({
      id: 'session-1',
      project_id: project.id,
      pr_number: 45,
      claude_session_id: 'claude-session-1',
    });

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
