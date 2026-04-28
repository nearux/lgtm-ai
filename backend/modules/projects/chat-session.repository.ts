import type { ChatSession, Prisma, PrismaClient } from '@prisma/client';
import { inject, injectable } from 'inversify';
import { PRISMA_CLIENT } from '../../container-tokens.js';
import type {
  ChatSessionTargetType,
  ListChatSessionsFilters,
} from './types/chat-session.types.js';

@injectable()
export class ChatSessionRepository {
  constructor(@inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async create(
    data: Prisma.ChatSessionUncheckedCreateInput
  ): Promise<ChatSession> {
    return this.prisma.chatSession.create({ data });
  }

  async findManyByProjectAndTarget(
    projectId: string,
    targetType: ChatSessionTargetType,
    targetNumber: number,
    filters: ListChatSessionsFilters = {}
  ): Promise<ChatSession[]> {
    return this.prisma.chatSession.findMany({
      where: {
        project_id: projectId,
        target_type: targetType,
        target_number: targetNumber,
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
