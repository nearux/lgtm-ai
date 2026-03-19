import HttpStatus from 'http-status';
import { randomUUID } from 'node:crypto';
import { AppError } from '../errors/AppError.js';
import { getClaudeSessionHistory } from './claude/claudeSessionHistory.js';
import { ChatSessionHistoryResponseDto } from '../dtos/chatSessionHistoryResponseDto.js';
import { ChatSessionSummaryDto } from '../dtos/chatSessionSummaryDto.js';
import * as chatSessionRepository from '../repositories/chatSessionRepository.js';
import * as projectRepository from '../repositories/projectRepository.js';
import type {
  ChatSessionHistoryResponse,
  ChatSessionSummary,
  ClaudeChatContext,
  ListChatSessionsFilters,
} from '../types/chatSessions.js';

export async function createChatSessionFromExecution(
  context: ClaudeChatContext,
  claudeSessionId: string,
  commandMeta?: { command?: string; customPrompt?: string }
): Promise<ChatSessionSummary> {
  const now = new Date();
  const record = await chatSessionRepository.create({
    id: randomUUID(),
    project_id: context.projectId,
    pr_number: context.prNumber,
    scope_type: context.scopeType,
    scope_target_id: context.scopeTargetId,
    claude_session_id: claudeSessionId,
    title: context.title ?? null,
    command: commandMeta?.command ?? null,
    custom_prompt: commandMeta?.customPrompt ?? null,
    created_at: now,
    updated_at: now,
    last_used_at: now,
  });

  return ChatSessionSummaryDto.fromModel(record);
}

export async function listChatSessions(
  projectId: string,
  prNumber: number,
  filters: ListChatSessionsFilters = {}
): Promise<ChatSessionSummary[]> {
  const records = await chatSessionRepository.findManyByProjectAndPr(
    projectId,
    prNumber,
    filters
  );

  return records.map(ChatSessionSummaryDto.fromModel);
}

export async function markChatSessionAsUsed(
  claudeSessionId: string
): Promise<void> {
  const now = new Date();
  await chatSessionRepository.markAsUsedByClaudeSessionId(claudeSessionId, now);
}

export async function getChatSession(
  projectId: string,
  prNumber: number,
  sessionId: string
): Promise<ChatSessionSummary> {
  const record = await chatSessionRepository.findById(sessionId);

  if (
    !record ||
    record.project_id !== projectId ||
    record.pr_number !== prNumber
  ) {
    throw new AppError('Chat session not found', HttpStatus.NOT_FOUND);
  }

  return ChatSessionSummaryDto.fromModel(record);
}

export async function getChatSessionHistory(
  projectId: string,
  prNumber: number,
  sessionId: string
): Promise<ChatSessionHistoryResponse> {
  const workingDirectory =
    await projectRepository.findWorkingDirectoryById(projectId);

  if (!workingDirectory) {
    throw new AppError('Project not found', HttpStatus.NOT_FOUND);
  }

  const session = await getChatSession(projectId, prNumber, sessionId);
  const history = await getClaudeSessionHistory(
    session.claudeSessionId,
    workingDirectory,
    undefined,
    session.command,
    session.customPrompt
  );

  return ChatSessionHistoryResponseDto.of(
    session.id,
    history.claudeSessionId,
    history.entries
  );
}
