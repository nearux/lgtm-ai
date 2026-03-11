import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  chatSession: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../prismaClient.js', () => ({
  default: mockPrisma,
}));

const {
  create,
  findById,
  findManyByProjectAndPr,
  markAsUsedByClaudeSessionId,
} = await import('./chatSessionRepository.js');

describe('chatSessionRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a chat session record', async () => {
    const input = {
      id: 'session-1',
      project_id: 'project-1',
      pr_number: 1,
      scope_type: 'REVIEW' as const,
      scope_target_id: 'review-1',
      claude_session_id: 'claude-1',
      title: 'Review',
      created_at: new Date('2026-03-11T00:00:00.000Z'),
      updated_at: new Date('2026-03-11T00:00:00.000Z'),
      last_used_at: new Date('2026-03-11T00:00:00.000Z'),
    };

    await create(input);

    expect(mockPrisma.chatSession.create).toHaveBeenCalledWith({
      data: input,
    });
  });

  it('lists chat sessions with optional filters', async () => {
    await findManyByProjectAndPr('project-1', 42, {
      scopeType: 'REVIEW',
      scopeTargetId: 'review-1',
    });

    expect(mockPrisma.chatSession.findMany).toHaveBeenCalledWith({
      where: {
        project_id: 'project-1',
        pr_number: 42,
        scope_type: 'REVIEW',
        scope_target_id: 'review-1',
      },
      orderBy: {
        last_used_at: 'desc',
      },
    });
  });

  it('finds chat session by id', async () => {
    await findById('session-1');

    expect(mockPrisma.chatSession.findUnique).toHaveBeenCalledWith({
      where: { id: 'session-1' },
    });
  });

  it('marks chat session as used by claude session id', async () => {
    const timestamp = new Date('2026-03-11T00:00:00.000Z');

    await markAsUsedByClaudeSessionId('claude-1', timestamp);

    expect(mockPrisma.chatSession.update).toHaveBeenCalledWith({
      where: { claude_session_id: 'claude-1' },
      data: {
        last_used_at: timestamp,
        updated_at: timestamp,
      },
    });
  });
});
