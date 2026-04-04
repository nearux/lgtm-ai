import type { ChatSession, Prisma } from '@prisma/client';
import prisma from '../prismaClient.js';
import type { ListChatSessionsFilters } from '../types/chatSessions.js';

export async function create(
  data: Prisma.ChatSessionUncheckedCreateInput
): Promise<ChatSession> {
  return prisma.chatSession.create({
    data,
  });
}

export async function findManyByProjectAndPr(
  projectId: string,
  prNumber: number,
  filters: ListChatSessionsFilters = {}
): Promise<ChatSession[]> {
  return prisma.chatSession.findMany({
    where: {
      project_id: projectId,
      pr_number: prNumber,
      ...(filters.scopeType ? { scope_type: filters.scopeType } : {}),
      ...(filters.scopeTargetId
        ? { scope_target_id: filters.scopeTargetId }
        : {}),
    },
    orderBy: {
      last_used_at: 'desc',
    },
  });
}

export async function findById(id: string): Promise<ChatSession | null> {
  return prisma.chatSession.findUnique({
    where: { id },
  });
}

export async function markAsUsedByClaudeSessionId(
  claudeSessionId: string,
  timestamp: Date
): Promise<void> {
  await prisma.chatSession.update({
    where: { claude_session_id: claudeSessionId },
    data: {
      last_used_at: timestamp,
      updated_at: timestamp,
    },
  });
}
