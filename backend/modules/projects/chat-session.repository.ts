// backend/modules/projects/chat-session.repository.ts
import type { ChatSession, Prisma, PrismaClient } from '@prisma/client';
import { inject, injectable } from 'inversify';
import { PRISMA_CLIENT } from '../../container.js';
import type { ListChatSessionsFilters } from '../../types/chatSessions.js';

@injectable()
export class ChatSessionRepository {
  constructor(@inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async create(
    data: Prisma.ChatSessionUncheckedCreateInput
  ): Promise<ChatSession> {
    return this.prisma.chatSession.create({ data });
  }

  async findManyByProjectAndPr(
    projectId: string,
    prNumber: number,
    filters: ListChatSessionsFilters = {}
  ): Promise<ChatSession[]> {
    return this.prisma.chatSession.findMany({
      where: {
        project_id: projectId,
        pr_number: prNumber,
        ...(filters.scopeType ? { scope_type: filters.scopeType } : {}),
        ...(filters.scopeTargetId
          ? { scope_target_id: filters.scopeTargetId }
          : {}),
      },
      orderBy: { last_used_at: 'desc' },
    });
  }

  async findById(id: string): Promise<ChatSession | null> {
    return this.prisma.chatSession.findUnique({ where: { id } });
  }

  async markAsUsedByClaudeSessionId(
    claudeSessionId: string,
    timestamp: Date
  ): Promise<void> {
    await this.prisma.chatSession.update({
      where: { claude_session_id: claudeSessionId },
      data: {
        last_used_at: timestamp,
        updated_at: timestamp,
      },
    });
  }
}
