import HttpStatus from 'http-status';
import { randomUUID } from 'node:crypto';
import type { ChatSession } from '@prisma/client';
import prisma from '../prismaClient.js';
import { AppError } from '../errors/AppError.js';
import { getClaudeSessionHistory } from './claude/claudeSessionHistory.js';
import type {
  ChatSessionHistoryResponse,
  ChatSessionSummary,
  ClaudeChatContext,
  ListChatSessionsFilters,
} from '../types/chatSessions.js';

function toSummary(record: ChatSession): ChatSessionSummary {
  return {
    id: record.id,
    projectId: record.project_id,
    prNumber: record.pr_number,
    scopeType: record.scope_type,
    scopeTargetId: record.scope_target_id,
    claudeSessionId: record.claude_session_id,
    ...(record.title ? { title: record.title } : {}),
    createdAt: record.created_at.toISOString(),
    updatedAt: record.updated_at.toISOString(),
    lastUsedAt: record.last_used_at.toISOString(),
  };
}

export async function createChatSessionFromExecution(
  context: ClaudeChatContext,
  claudeSessionId: string
): Promise<ChatSessionSummary> {
  const now = new Date();
  const record = await prisma.chatSession.create({
    data: {
      id: randomUUID(),
      project_id: context.projectId,
      pr_number: context.prNumber,
      scope_type: context.scopeType,
      scope_target_id: context.scopeTargetId,
      claude_session_id: claudeSessionId,
      title: context.title ?? null,
      created_at: now,
      updated_at: now,
      last_used_at: now,
    },
  });

  return toSummary(record);
}

export async function listChatSessions(
  projectId: string,
  prNumber: number,
  filters: ListChatSessionsFilters = {}
): Promise<ChatSessionSummary[]> {
  const records = await prisma.chatSession.findMany({
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

  return records.map(toSummary);
}

export async function touchChatSession(id: string): Promise<void> {
  const now = new Date();
  await prisma.chatSession.update({
    where: { id },
    data: {
      last_used_at: now,
      updated_at: now,
    },
  });
}

export async function touchChatSessionByClaudeSessionId(
  claudeSessionId: string
): Promise<void> {
  const now = new Date();
  await prisma.chatSession.update({
    where: { claude_session_id: claudeSessionId },
    data: {
      last_used_at: now,
      updated_at: now,
    },
  });
}

export async function getChatSession(
  projectId: string,
  prNumber: number,
  sessionId: string
): Promise<ChatSessionSummary> {
  const record = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  });

  if (!record || record.project_id !== projectId || record.pr_number !== prNumber) {
    throw new AppError('Chat session not found', HttpStatus.NOT_FOUND);
  }

  return toSummary(record);
}

export async function getChatSessionHistory(
  projectId: string,
  prNumber: number,
  sessionId: string
): Promise<ChatSessionHistoryResponse> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, working_dir: true },
  });

  if (!project) {
    throw new AppError('Project not found', HttpStatus.NOT_FOUND);
  }

  const session = await getChatSession(projectId, prNumber, sessionId);
  const history = await getClaudeSessionHistory(
    session.claudeSessionId,
    project.working_dir
  );

  return {
    sessionId: session.id,
    claudeSessionId: history.claudeSessionId,
    entries: history.entries,
  };
}
